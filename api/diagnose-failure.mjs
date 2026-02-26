import { z } from 'zod'
import { callAnthropic, callOpenRouter, resolveProvider } from './_provider.mjs'

const DiagnosisSchema = z.object({
  fault: z.enum(['solution', 'tests']),
  reasoning: z.string(),
  fixedCode: z.string(),
  fixedExplanation: z.string().default(''),
})

const DIAGNOSIS_TOOL_SCHEMA = {
  type: 'object',
  properties: {
    fault: {
      type: 'string',
      enum: ['solution', 'tests'],
      description: 'Which side is wrong: "solution" if the solution code has a bug, "tests" if one or more unit tests assert incorrect expected values.',
    },
    reasoning: {
      type: 'string',
      description: '2-3 sentences explaining what is wrong and why.',
    },
    fixedCode: {
      type: 'string',
      description: 'The corrected code. If fault="solution", this is the fixed Solution class. If fault="tests", this is the full corrected unit test code (preserving the # __CASES__ header if present).',
    },
    fixedExplanation: {
      type: 'string',
      description: 'If fault="solution": 2-3 sentences on approach + time/space complexity for the fixed solution. If fault="tests": leave empty.',
    },
  },
  required: ['fault', 'reasoning', 'fixedCode'],
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let provider
  try { provider = resolveProvider() }
  catch (err) { return res.status(500).json({ error: err.message }) }

  const { problem, solutionCode, unitTests, testOutput, category } = req.body ?? {}
  if (!problem || !solutionCode || !unitTests || !testOutput) {
    return res.status(400).json({ error: 'problem, solutionCode, unitTests, and testOutput are required' })
  }

  const categoryHint = category ? ` This is a "${category}" problem.` : ''

  const systemPrompt = `You are an expert Python engineer and test reviewer. Given a coding problem, a solution, unit tests, and the test failure output, determine whether the solution has a bug or the unit tests assert wrong expected values. Exactly one side is wrong — find it and fix it.${categoryHint}`

  const userPrompt = `A solution was generated for this problem but some tests fail. Diagnose whether the solution or the tests are at fault, and provide the corrected code.

Problem:
${problem}

Solution code:
\`\`\`python
${solutionCode}
\`\`\`

Unit tests:
\`\`\`python
${unitTests}
\`\`\`

Test failure output:
\`\`\`
${testOutput}
\`\`\`

Instructions:
- Carefully trace through the solution logic for the failing test inputs.
- Compare the solution's actual output against the test's expected value.
- If the solution produces a wrong answer, fault="solution" — fix the solution code.
- If the solution is correct but the test asserts a wrong expected value, fault="tests" — fix the unit tests.
- Return the COMPLETE corrected code (not a diff), ready to run.
- If fixing tests, preserve the \`# __CASES__:...\` header comment if present (update it to match the corrected assertions).`

  console.log(`[diagnose-failure] provider=${provider.type}`)

  try {
    const raw = provider.type === 'anthropic'
      ? await callAnthropic(provider.key, {
          systemPrompt,
          userPrompt,
          toolName: 'diagnose_failure',
          toolDescription: 'Diagnose whether a solution or unit tests are wrong and fix the faulty side',
          inputSchema: DIAGNOSIS_TOOL_SCHEMA,
        })
      : await callOpenRouter(provider.key, {
          systemPrompt,
          userPrompt: userPrompt + '\n\nRespond with valid JSON only: { "fault": "solution"|"tests", "reasoning": "...", "fixedCode": "...", "fixedExplanation": "..." }',
        })

    const result = DiagnosisSchema.safeParse(raw)
    if (!result.success) {
      console.error('[diagnose-failure] schema mismatch:', result.error.issues)
      return res.status(502).json({ error: 'Diagnosis schema mismatch', detail: result.error.issues })
    }

    console.log(`[diagnose-failure] fault=${result.data.fault}, reasoning: ${result.data.reasoning.slice(0, 80)}…`)
    return res.status(200).json(result.data)
  } catch (err) {
    console.error('[diagnose-failure] error:', err.message)
    return res.status(err.status ?? 500).json({ error: err.message, detail: err.detail })
  }
}
