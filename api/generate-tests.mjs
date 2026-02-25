import { z } from 'zod'
import { callAnthropic, callOpenRouter, resolveProvider } from './_provider.mjs'

const UNIT_TEST_TOOL_SCHEMA = {
  type: 'object',
  properties: {
    unitTests: {
      type: 'string',
      description: 'Complete Python unittest.TestCase subclass. Imports unittest at the top. Does NOT implement Solution. Ends with: if __name__ == "__main__": unittest.main(verbosity=2)',
    },
  },
  required: ['unitTests'],
}

const ResultSchema = z.object({ unitTests: z.string() })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let provider
  try { provider = resolveProvider() }
  catch (err) { return res.status(500).json({ error: err.message }) }

  const { problem } = req.body ?? {}
  if (!problem?.title || !problem?.starterCode) {
    return res.status(400).json({ error: 'problem (with title and starterCode) is required' })
  }

  const systemPrompt = 'You are an expert Python developer. Write clean, minimal unittest code.'
  const userPrompt = `Write Python unit tests for this problem.

Problem: ${problem.title}
${problem.description}

Starter code:
\`\`\`python
${problem.starterCode}
\`\`\`

Examples:
${problem.examples.map((e, i) => `${i + 1}. Input: ${e.input} → Output: ${e.output}`).join('\n')}

Rules:
- Import unittest at the top
- Class TestSolution(unittest.TestCase) with at least 2 test methods matching the examples above
- Do NOT implement Solution — tests run alongside the user's code
- End with: if __name__ == "__main__": unittest.main(verbosity=2)`

  console.log('[generate-tests] generating for:', problem.title)

  try {
    let raw
    if (provider.type === 'anthropic') {
      raw = await callAnthropic(provider.key, {
        systemPrompt,
        userPrompt,
        toolName: 'generate_unit_tests',
        toolDescription: 'Generate Python unittest code for a Solution class',
        inputSchema: UNIT_TEST_TOOL_SCHEMA,
      })
    } else {
      raw = await callOpenRouter(provider.key, {
        systemPrompt,
        userPrompt: userPrompt + '\n\nRespond with valid JSON only: { "unitTests": "..." }',
      })
    }

    const result = ResultSchema.safeParse(raw)
    if (!result.success) {
      return res.status(502).json({ error: 'Tests schema mismatch', detail: result.error.issues })
    }

    console.log('[generate-tests] done, length:', result.data.unitTests.length)
    return res.status(200).json(result.data)
  } catch (err) {
    console.error('[generate-tests] error:', err.message)
    return res.status(err.status ?? 500).json({ error: err.message, detail: err.detail })
  }
}
