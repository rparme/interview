import { z } from 'zod'
import { callAnthropic, callOpenRouter, resolveProvider } from './_provider.mjs'
import { requireAuth } from './_auth.mjs'

const UNIT_TEST_TOOL_SCHEMA = {
  type: 'object',
  properties: {
    unitTests: {
      type: 'string',
      description: 'Complete Python unittest.TestCase subclass with exactly 5-6 test methods. Imports unittest at the top. Class TestSolution(unittest.TestCase). Does NOT implement Solution. Ends with: if __name__ == "__main__": unittest.main(verbosity=2)',
    },
    testCases: {
      type: 'array',
      description: 'One entry per test method (5-6 entries) — must match every def test_* in unitTests',
      items: {
        type: 'object',
        properties: {
          name:     { type: 'string', description: 'Exact test method name, e.g. test_basic_case' },
          input:    { type: 'string', description: 'Human-readable input args, e.g. "nums=[1,2], target=3"' },
          expected: { type: 'string', description: 'Expected return value, e.g. "[0, 1]"' },
        },
        required: ['name', 'input', 'expected'],
      },
    },
  },
  required: ['unitTests', 'testCases'],
}

const ResultSchema = z.object({
  unitTests: z.string(),
  testCases: z.array(z.object({ name: z.string(), input: z.string(), expected: z.string() })).default([]),
})

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let user
  try { user = await requireAuth(req) }
  catch (err) {
    console.warn(`[generate-tests] auth rejected (${err.status ?? 401}): ${err.message}`)
    return res.status(err.status ?? 401).json({ error: err.message })
  }

  let provider
  try { provider = resolveProvider() }
  catch (err) { return res.status(500).json({ error: err.message }) }

  const { problem } = req.body ?? {}
  if (!problem?.title || !problem?.starterCode) {
    console.warn('[generate-tests] 400 missing problem/title/starterCode')
    return res.status(400).json({ error: 'problem (with title and starterCode) is required' })
  }

  const systemPrompt = 'You are an expert Python developer. Write clean, minimal unittest code. You MUST carefully compute the expected output for each test by mentally tracing the correct algorithm step by step. Double-check every expected value before writing the assertion.'
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
- Class TestSolution(unittest.TestCase) with exactly 5-6 test methods: include the given examples, then add 2-3 edge cases
- Do NOT write more than 6 test methods — quality over quantity
- For EACH test, mentally trace through the correct algorithm step by step and verify the expected value is correct BEFORE writing the assertion
- Do NOT implement Solution — tests run alongside the user's code
- End with: if __name__ == "__main__": unittest.main(verbosity=2)
- In testCases, provide one entry per test method with the exact method name, the human-readable input, and expected output`

  const t0 = Date.now()
  console.log(`[generate-tests] user=${user.id.slice(0, 8)} provider=${provider.type} problem="${problem.title}" examples=${problem.examples?.length ?? 0}`)

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
      console.error(`[generate-tests] schema mismatch (${Date.now() - t0}ms):`, result.error.issues)
      return res.status(502).json({ error: 'Tests schema mismatch', detail: result.error.issues })
    }

    // Embed test-case metadata as a first-line comment so it persists in the DB
    // alongside the Python code without needing a separate column.
    const casesComment = `# __CASES__:${JSON.stringify(result.data.testCases)}\n`
    const unitTests = casesComment + result.data.unitTests

    console.log(`[generate-tests] done in ${Date.now() - t0}ms: ${result.data.testCases.length} cases, ${unitTests.length} chars`)
    return res.status(200).json({ unitTests })
  } catch (err) {
    console.error(`[generate-tests] error after ${Date.now() - t0}ms:`, err.message)
    return res.status(err.status ?? 500).json({ error: err.message, detail: err.detail })
  }
}
