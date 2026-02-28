import { z } from 'zod'
import { callAnthropic, callOpenRouter, resolveProvider } from './_provider.mjs'
import { requireAuth } from './_auth.mjs'

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
    all_examples_verified: {
      type: 'boolean',
      description: 'Set to true ONLY if you have step-by-step traced a correct solution for EVERY example and confirmed the output is mathematically correct. Set to false if you had to fix anything or are unsure about any example.',
    },
  },
  required: ['title', 'description', 'examples', 'constraints', 'starterCode', 'all_examples_verified'],
}

const SYSTEM_PROMPT = 'You are a meticulous coding interview problem reviewer. Your only job is to find and fix factual errors — wrong example outputs, inconsistent explanations, contradictions. Do not change the problem concept or difficulty.'

function buildPrompt(problem, isRetry) {
  const prefix = isRetry
    ? 'A previous review pass found issues with this problem. Review it again very carefully.\n\n'
    : ''
  return `${prefix}Review the following coding interview problem and return a corrected version.

${JSON.stringify(problem, null, 2)}

For each example:
- Step through a correct solution on the given input, showing your reasoning.
- If the stated output is wrong, compute the correct one and fix the explanation.
- If the explanation is vague or inconsistent with the input/output, rewrite it in one precise sentence.

Fix any contradictions between the description and the examples.
Keep the title, constraints, and starterCode unchanged unless they directly contradict a corrected example.
Set all_examples_verified to true only if every example is now mathematically confirmed correct.
Return the complete corrected problem.`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let user
  try { user = await requireAuth(req) }
  catch (err) {
    console.warn(`[review] auth rejected (${err.status ?? 401}): ${err.message}`)
    return res.status(err.status ?? 401).json({ error: err.message })
  }

  let provider
  try { provider = resolveProvider() }
  catch (err) { return res.status(500).json({ error: err.message }) }

  const { problem } = req.body ?? {}
  if (!problem) {
    console.warn('[review] 400 missing problem')
    return res.status(400).json({ error: 'problem is required' })
  }

  const t0 = Date.now()
  console.log(`[review] user=${user.id.slice(0, 8)} provider=${provider.type} title="${problem.title}" examples=${problem.examples?.length ?? 0}`)

  let current = problem
  const MAX_PASSES = 3

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    if (pass > 0) console.log(`[review] pass ${pass + 1} — re-reviewing after issues found`)

    const userPrompt = buildPrompt(current, pass > 0)

    try {
      const raw = provider.type === 'anthropic'
        ? await callAnthropic(provider.key, {
            systemPrompt: SYSTEM_PROMPT,
            userPrompt,
            toolName: 'review_problem',
            toolDescription: 'Review and correct a coding interview problem',
            inputSchema: REVIEW_TOOL_SCHEMA,
          })
        : await callOpenRouter(provider.key, {
            systemPrompt: SYSTEM_PROMPT,
            userPrompt: userPrompt + '\n\nRespond with valid JSON only, including the all_examples_verified field.',
          })

      const result = ProblemSchema.safeParse(raw)
      if (!result.success) {
        console.warn(`[review] schema mismatch on pass ${pass + 1}, keeping previous:`, result.error.issues)
        break
      }

      current = result.data

      if (raw.all_examples_verified === true) {
        console.log(`[review] verified on pass ${pass + 1} in ${Date.now() - t0}ms: "${current.title}"`)
        break
      }
      console.log(`[review] pass ${pass + 1} flagged issues, will retry`)
    } catch (err) {
      console.error(`[review] error on pass ${pass + 1} after ${Date.now() - t0}ms, keeping previous:`, err.message)
      break
    }
  }

  console.log(`[review] returning after ${Date.now() - t0}ms: "${current.title}"`)
  return res.status(200).json(current)
}
