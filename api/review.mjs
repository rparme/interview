import { z } from 'zod'
import { callAnthropic, callOpenRouter, resolveProvider } from './_provider.mjs'

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

const REVIEW_TOOL_SCHEMA = {
  type: 'object',
  properties: {
    title:       { type: 'string' },
    description: { type: 'string' },
    examples: {
      type: 'array', minItems: 2, maxItems: 3,
      items: {
        type: 'object',
        properties: {
          input:       { type: 'string' },
          output:      { type: 'string' },
          explanation: { type: 'string', description: 'One sentence that precisely explains why this input produces this output.' },
        },
        required: ['input', 'output', 'explanation'],
      },
    },
    constraints: { type: 'array', minItems: 2, maxItems: 5, items: { type: 'string' } },
    starterCode: { type: 'string' },
  },
  required: ['title', 'description', 'examples', 'constraints', 'starterCode'],
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let provider
  try { provider = resolveProvider() }
  catch (err) { return res.status(500).json({ error: err.message }) }

  const { problem } = req.body ?? {}
  if (!problem) return res.status(400).json({ error: 'problem is required' })

  const systemPrompt = 'You are a meticulous coding interview problem reviewer. Your only job is to find and fix factual errors — wrong example outputs, inconsistent explanations, contradictions. Do not change the problem concept or difficulty.'

  const userPrompt = `Review the following coding interview problem and return a corrected version.

${JSON.stringify(problem, null, 2)}

For each example:
- Mentally run a correct solution on the given input.
- If the stated output is wrong, compute the correct one and fix the explanation.
- If the explanation is vague or inconsistent with the input/output, rewrite it in one precise sentence.

Fix any contradictions between the description and the examples.
Keep the title, constraints, and starterCode unchanged unless they directly contradict a corrected example.
Return the complete corrected problem.`

  console.log(`[review] provider=${provider.type} title="${problem.title}"`)

  try {
    const raw = provider.type === 'anthropic'
      ? await callAnthropic(provider.key, {
          systemPrompt,
          userPrompt,
          toolName: 'review_problem',
          toolDescription: 'Review and correct a coding interview problem',
          inputSchema: REVIEW_TOOL_SCHEMA,
        })
      : await callOpenRouter(provider.key, {
          systemPrompt,
          userPrompt: userPrompt + '\n\nRespond with valid JSON only matching the original structure.',
        })

    const result = ProblemSchema.safeParse(raw)
    if (!result.success) {
      console.warn('[review] schema mismatch, returning original:', result.error.issues)
      return res.status(200).json(problem)
    }

    console.log('[review] done:', result.data.title)
    return res.status(200).json(result.data)
  } catch (err) {
    console.error('[review] error, returning original:', err.message)
    // Graceful fallback — original problem is still usable
    return res.status(200).json(problem)
  }
}
