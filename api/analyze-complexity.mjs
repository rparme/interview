import { z } from 'zod'
import { callAnthropic, callOpenRouter, resolveProvider } from './_provider.mjs'

const ComplexitySchema = z.object({
  timeComplexity: z.string(),
  spaceComplexity: z.string(),
  explanation: z.string(),
})

const COMPLEXITY_TOOL_SCHEMA = {
  type: 'object',
  properties: {
    timeComplexity:  { type: 'string', description: 'Big-O time complexity, e.g. O(n log n)' },
    spaceComplexity: { type: 'string', description: 'Big-O space complexity, e.g. O(n)' },
    explanation:     { type: 'string', description: '2-3 sentences explaining the dominant factors driving time and space complexity.' },
  },
  required: ['timeComplexity', 'spaceComplexity', 'explanation'],
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let provider
  try { provider = resolveProvider() }
  catch (err) { return res.status(500).json({ error: err.message }) }

  const { code, problemContext } = req.body ?? {}
  if (!code) return res.status(400).json({ error: 'code is required' })

  const systemPrompt = 'You are an expert algorithm analyst. Given code (and optional problem context), determine the time and space complexity. Be concise and precise — use standard Big-O notation.'

  let userPrompt = `Analyze the time and space complexity of this code:\n\n\`\`\`\n${code}\n\`\`\``
  if (problemContext) {
    userPrompt += `\n\nProblem context:\n${problemContext}`
  }

  console.log(`[analyze-complexity] provider=${provider.type} code_length=${code.length}`)

  try {
    const raw = provider.type === 'anthropic'
      ? await callAnthropic(provider.key, { systemPrompt, userPrompt, toolName: 'analyze_complexity', toolDescription: 'Analyze time and space complexity of code', inputSchema: COMPLEXITY_TOOL_SCHEMA })
      : await callOpenRouter(provider.key, { systemPrompt, userPrompt: userPrompt + '\n\nRespond with valid JSON only: { timeComplexity, spaceComplexity, explanation }' })

    const result = ComplexitySchema.safeParse(raw)
    if (!result.success) {
      console.error('[analyze-complexity] schema mismatch:', result.error.issues)
      return res.status(502).json({ error: 'Complexity schema mismatch', detail: result.error.issues })
    }

    console.log('[analyze-complexity] done:', result.data.timeComplexity, result.data.spaceComplexity)
    return res.status(200).json(result.data)
  } catch (err) {
    console.error('[analyze-complexity] error:', err.message)
    return res.status(err.status ?? 500).json({ error: err.message, detail: err.detail })
  }
}
