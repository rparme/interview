import { z } from 'zod'
import { callAnthropic, callOpenRouter, resolveProvider } from './_provider.mjs'

const SolutionSchema = z.object({
  code: z.string(),
  explanation: z.string(),
})

const SOLUTION_TOOL_SCHEMA = {
  type: 'object',
  properties: {
    code:        { type: 'string', description: 'Complete Python class Solution with the optimal method implementation. Include inline comments explaining key steps.' },
    explanation: { type: 'string', description: '2-3 sentences: approach used, time complexity, space complexity.' },
  },
  required: ['code', 'explanation'],
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let provider
  try { provider = resolveProvider() }
  catch (err) { return res.status(500).json({ error: err.message }) }

  const { problem, unitTests, category, retryError } = req.body ?? {}
  if (!problem) return res.status(400).json({ error: 'problem is required' })
  if (!unitTests) return res.status(400).json({ error: 'unitTests is required' })

  const categoryHint = category
    ? `\nThis is a "${category}" problem — the optimal solution should use ${category} techniques. Choose the idiomatic algorithm for this category.`
    : ''

  const systemPrompt = 'You are an expert Python engineer. Write the most optimal solution for the given coding problem. Include inline comments explaining key steps. The code MUST pass the provided unit tests.'

  let userPrompt = `Write the optimal Python solution for this problem.
${categoryHint}

Problem:
${problem}

Unit tests the solution must pass:
\`\`\`python
${unitTests}
\`\`\`

Requirements:
- Complete Python \`class Solution\` with the correct method signature
- Most optimal time and space complexity possible using ${category || 'appropriate'} techniques
- Include brief inline comments for key steps
- The code must pass ALL the provided unit tests`

  if (retryError) {
    userPrompt += `\n\nPrevious attempt FAILED with this error:\n\`\`\`\n${retryError}\n\`\`\`\nFix the solution so all tests pass.`
  }

  console.log(`[generate-solution] provider=${provider.type} retry=${!!retryError}`)

  try {
    const raw = provider.type === 'anthropic'
      ? await callAnthropic(provider.key, { systemPrompt, userPrompt, toolName: 'generate_solution', toolDescription: 'Generate an optimal Python solution for a coding problem', inputSchema: SOLUTION_TOOL_SCHEMA })
      : await callOpenRouter(provider.key, { systemPrompt, userPrompt: userPrompt + '\n\nRespond with valid JSON only: { "code": "...", "explanation": "..." }' })

    const result = SolutionSchema.safeParse(raw)
    if (!result.success) {
      console.error('[generate-solution] schema mismatch:', result.error.issues)
      return res.status(502).json({ error: 'Solution schema mismatch', detail: result.error.issues })
    }

    console.log('[generate-solution] done, code_length:', result.data.code.length)
    return res.status(200).json(result.data)
  } catch (err) {
    console.error('[generate-solution] error:', err.message)
    return res.status(err.status ?? 500).json({ error: err.message, detail: err.detail })
  }
}
