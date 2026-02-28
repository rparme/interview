import { z } from 'zod'
import { callAnthropic, callOpenRouter, resolveProvider } from './_provider.mjs'
import { requireSubscribed } from './_auth.mjs'

const ProblemSchema = z.object({
  title: z.string(),
  description: z.string(),
  examples: z.array(z.object({
    input: z.string(),
    output: z.string(),
    explanation: z.string(),
  })).min(2).max(3),
  constraints: z.array(z.string()).min(2).max(5),
  starterCode: z.string(),
})

const PROBLEM_TOOL_SCHEMA = {
  type: 'object',
  properties: {
    title:       { type: 'string', description: 'Short problem title, no markdown' },
    description: { type: 'string', description: 'Problem statement in GitHub-flavored markdown. Use **bold** for key terms and `code` for variable names. Do NOT include examples or constraints here.' },
    examples: {
      type: 'array', minItems: 2, maxItems: 3,
      items: {
        type: 'object',
        properties: {
          input:       { type: 'string' },
          output:      { type: 'string' },
          explanation: { type: 'string' },
        },
        required: ['input', 'output', 'explanation'],
      },
    },
    constraints: { type: 'array', minItems: 2, maxItems: 5, items: { type: 'string' } },
    starterCode: { type: 'string', description: 'Python class Solution with one method, correct type hints, body is just `pass`.' },
  },
  required: ['title', 'description', 'examples', 'constraints', 'starterCode'],
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let user
  try { user = await requireSubscribed(req, req.body?.categoryId) }
  catch (err) {
    console.warn(`[generate] auth rejected (${err.status ?? 401}): ${err.message}`)
    return res.status(err.status ?? 401).json({ error: err.message, code: err.code })
  }

  let provider
  try { provider = resolveProvider() }
  catch (err) { return res.status(500).json({ error: err.message }) }

  const { category, categoryId, selectedProblems = [], businessField } = req.body ?? {}
  if (!category) {
    console.warn('[generate] 400 missing category')
    return res.status(400).json({ error: 'category is required' })
  }

  const referenceContext = selectedProblems.length
    ? `Model difficulty and patterns after: ${selectedProblems.map(p => `"${p.title}" (${p.difficulty})`).join(', ')}.`
    : `Create a medium-difficulty problem for the "${category}" category.`

  const themeContext = businessField
    ? `Frame it in a ${businessField} context — a real engineering problem someone there would solve.`
    : 'Use a neutral technical context.'

  const systemPrompt = 'You are an expert coding interview problem designer. Generate clear, well-scoped LeetCode-style problems. The problem MUST belong to the specified algorithm/data-structure category — this is the most important constraint.'
  const userPrompt = `Generate a coding interview problem.

**Category (IMPORTANT — the problem MUST test this concept): ${category}**
The core algorithm or data structure being tested must be "${category}". The business theme or context is secondary — the underlying solution should clearly require "${category}" techniques.
${referenceContext}
${themeContext}

Requirements:
- description: markdown prose only — no examples, no constraints. Use **bold** for key terms and \`code\` for variable names.
- examples: 2 concise examples. input/output must be raw values only (e.g. \`[2,7,11,15], 9\`). explanation: one short sentence.
- constraints: 3-4 short items (e.g. "2 ≤ n ≤ 10⁴", "O(n) time expected").
- starterCode: Python \`class Solution\` with one method, correct type hints, body is just \`pass\`.`

  const t0 = Date.now()
  console.log(`[generate] user=${user.id.slice(0, 8)} provider=${provider.type} category="${category}" theme="${businessField ?? 'none'}" refs=${selectedProblems.length}`)

  try {
    const raw = provider.type === 'anthropic'
      ? await callAnthropic(provider.key, { systemPrompt, userPrompt, toolName: 'generate_problem', toolDescription: 'Generate a coding interview problem with starter code', inputSchema: PROBLEM_TOOL_SCHEMA })
      : await callOpenRouter(provider.key, { systemPrompt, userPrompt: userPrompt + '\n\nRespond with valid JSON only: { title, description, examples: [{input, output, explanation}], constraints, starterCode }' })

    const result = ProblemSchema.safeParse(raw)
    if (!result.success) {
      console.error(`[generate] schema mismatch (${Date.now() - t0}ms):`, result.error.issues)
      return res.status(502).json({ error: 'Problem schema mismatch', detail: result.error.issues })
    }

    console.log(`[generate] done in ${Date.now() - t0}ms: "${result.data.title}"`)
    return res.status(200).json(result.data)
  } catch (err) {
    console.error(`[generate] error after ${Date.now() - t0}ms:`, err.message)
    return res.status(err.status ?? 500).json({ error: err.message, detail: err.detail })
  }
}
