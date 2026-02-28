#!/usr/bin/env node
/**
 * Generate exercise content for all 38 catalogue drills.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... node scripts/generate-drill-content.mjs
 *   ANTHROPIC_API_KEY=sk-... node scripts/generate-drill-content.mjs --lc 438   # single problem
 *   ANTHROPIC_API_KEY=sk-... node scripts/generate-drill-content.mjs --dry-run   # preview prompts
 *
 * Output: supabase/migrations/20260228000001_drill_content_data.sql
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ── CLI flags ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const SINGLE_LC = args.includes('--lc') ? Number(args[args.indexOf('--lc') + 1]) : null
const RESUME_AFTER = args.includes('--resume-after') ? Number(args[args.indexOf('--resume-after') + 1]) : null

// ── Provider (reuses the same logic as api/_provider.mjs) ───────────────────
const API_KEY = process.env.ANTHROPIC_API_KEY || process.env.OPENROUTER_API_KEY
if (!API_KEY && !DRY_RUN) {
  console.error('Set ANTHROPIC_API_KEY or OPENROUTER_API_KEY')
  process.exit(1)
}
const IS_ANTHROPIC = !!process.env.ANTHROPIC_API_KEY

async function callAI({ systemPrompt, userPrompt, toolName, toolDescription, inputSchema }) {
  if (IS_ANTHROPIC) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        tools: [{ name: toolName, description: toolDescription, input_schema: inputSchema }],
        tool_choice: { type: 'tool', name: toolName },
      }),
    })
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`)
    const data = await res.json()
    const toolUse = data.content?.find(b => b.type === 'tool_use')
    if (!toolUse) throw new Error('No tool_use block')
    return toolUse.input
  } else {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'anthropic/claude-opus-4-6',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt + '\n\nRespond with valid JSON only.' },
        ],
        response_format: { type: 'json_object' },
      }),
    })
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`)
    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('Empty response')
    return JSON.parse(content)
  }
}

// ── Parse problems from seed SQL ────────────────────────────────────────────
function parseSeedProblems() {
  const seedPath = resolve(ROOT, 'supabase/migrations/20260223000001_seed.sql')
  const addTwoSumPath = resolve(ROOT, 'supabase/migrations/20260224000001_add_two_sum_ii.sql')
  const sql = readFileSync(seedPath, 'utf-8') + '\n' + readFileSync(addTwoSumPath, 'utf-8')

  const problems = []
  // Match each problem INSERT value tuple
  const re = /\((\d+),\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*\n\s*'[^']*',\s*\n\s*ARRAY\[((?:'[^']*'(?:,\s*)?)*)\],\s*\n\s*ARRAY\[((?:'[^']*'(?:,\s*)?)*)\]\)/g
  let m
  while ((m = re.exec(sql)) !== null) {
    const lc = Number(m[1])
    const categoryId = m[2]
    const title = m[3]
    const difficulty = m[4]
    const howTo = [...m[5].matchAll(/'([^']*)'/g)].map(x => x[1])
    const whenTo = [...m[6].matchAll(/'([^']*)'/g)].map(x => x[1])
    problems.push({ lc, categoryId, title, difficulty, howTo, whenTo })
  }
  return problems
}

// ── Category ID → name mapping ──────────────────────────────────────────────
const CATEGORY_NAMES = {
  'sliding-window': 'Sliding Window',
  'two-pointers': 'Two Pointers',
  'binary-search': 'Binary Search',
  'trees': 'Trees',
  'graphs': 'Graphs',
  'dynamic-programming': 'Dynamic Programming',
  'backtracking': 'Backtracking',
  'heaps-intervals': 'Heaps & Intervals',
}

// ── Tool schemas (same as the API) ──────────────────────────────────────────
const PROBLEM_TOOL_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Short problem title, no markdown' },
    description: { type: 'string', description: 'Problem statement in GitHub-flavored markdown. Use **bold** for key terms and `code` for variable names. Do NOT include examples or constraints here.' },
    examples: {
      type: 'array', minItems: 2, maxItems: 3,
      items: {
        type: 'object',
        properties: {
          input: { type: 'string' },
          output: { type: 'string' },
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

const UNIT_TEST_TOOL_SCHEMA = {
  type: 'object',
  properties: {
    unitTests: { type: 'string', description: 'Complete Python unittest.TestCase subclass with exactly 5-6 test methods.' },
    testCases: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          input: { type: 'string' },
          expected: { type: 'string' },
        },
        required: ['name', 'input', 'expected'],
      },
    },
  },
  required: ['unitTests', 'testCases'],
}

const SOLUTION_TOOL_SCHEMA = {
  type: 'object',
  properties: {
    code: { type: 'string', description: 'Complete Python class Solution with optimal implementation.' },
    explanation: { type: 'string', description: '2-3 sentences: approach used, time complexity, space complexity.' },
  },
  required: ['code', 'explanation'],
}

const DIAGNOSIS_TOOL_SCHEMA = {
  type: 'object',
  properties: {
    fault: { type: 'string', enum: ['solution', 'tests'] },
    reasoning: { type: 'string' },
    fixedCode: { type: 'string' },
    fixedExplanation: { type: 'string' },
  },
  required: ['fault', 'reasoning', 'fixedCode'],
}

// ── Step 1: Generate problem draft ──────────────────────────────────────────
async function generateProblemDraft(prob) {
  const category = CATEGORY_NAMES[prob.categoryId]
  const systemPrompt = 'You are an expert coding interview problem designer. Generate clear, well-scoped classic algorithm problems. The problem MUST belong to the specified algorithm/data-structure category. Use standard algorithmic naming — no themes, no business contexts, no stories.'
  const userPrompt = `Write an original coding exercise inspired by the concept of "${prob.title}" (LeetCode #${prob.lc}).

**Category (IMPORTANT — the problem MUST test this concept): ${category}**
Difficulty: ${prob.difficulty}

Context from the original drill:
- When to use this pattern: ${prob.whenTo.join('; ')}
- How to approach: ${prob.howTo.join('; ')}

IMPORTANT:
- Write a COMPLETELY ORIGINAL problem — do NOT copy the LeetCode problem statement.
- Use CLASSIC ALGORITHMIC naming and style — like "Maximum Subarray Sum", "Shortest Path in Grid", "Valid Parentheses". Pure data structures and algorithms, NO themes, NO stories, NO business scenarios.
- Use standard variable names (nums, arr, s, target, k, etc.) — the kind you see in any algorithm textbook.
- Different example values from the LeetCode version.

Requirements:
- description: markdown prose only — no examples, no constraints. Use **bold** for key terms and \`code\` for variable names.
- examples: 2-3 concise examples. input/output must be raw values only (e.g. \`[2,7,11,15], 9\`). explanation: one short sentence.
- constraints: 3-4 short items (e.g. "2 ≤ n ≤ 10⁴", "O(n) time expected").
- starterCode: Python \`class Solution\` with one method, correct type hints, body is just \`pass\`.
- title: A short, classic algorithm-style title (NOT the LeetCode title). Examples of good titles: "Longest Balanced Substring", "K-th Largest in Stream", "Minimum Window Coverage".`

  return callAI({
    systemPrompt,
    userPrompt,
    toolName: 'generate_problem',
    toolDescription: 'Generate a coding interview problem with starter code',
    inputSchema: PROBLEM_TOOL_SCHEMA,
  })
}

// ── Step 2: Review examples ─────────────────────────────────────────────────
async function reviewProblem(problem) {
  const systemPrompt = 'You are a meticulous coding interview problem reviewer. Your only job is to find and fix factual errors — wrong example outputs, inconsistent explanations, contradictions. Do not change the problem concept or difficulty.'
  const userPrompt = `Review the following coding interview problem and return a corrected version.

${JSON.stringify(problem, null, 2)}

For each example:
- Step through a correct solution on the given input, showing your reasoning.
- If the stated output is wrong, compute the correct one and fix the explanation.
- If the explanation is vague or inconsistent with the input/output, rewrite it in one precise sentence.

Fix any contradictions between the description and the examples.
Keep the title, constraints, and starterCode unchanged unless they directly contradict a corrected example.
Return the complete corrected problem.`

  const raw = await callAI({
    systemPrompt,
    userPrompt,
    toolName: 'review_problem',
    toolDescription: 'Review and correct a coding interview problem',
    inputSchema: {
      ...PROBLEM_TOOL_SCHEMA,
      properties: {
        ...PROBLEM_TOOL_SCHEMA.properties,
        all_examples_verified: { type: 'boolean' },
      },
      required: [...PROBLEM_TOOL_SCHEMA.required, 'all_examples_verified'],
    },
  })
  return raw
}

// ── Step 3: Generate tests ──────────────────────────────────────────────────
async function generateTests(problem) {
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
- When comparing lists of lists or sets, sort both sides before asserting (e.g. sorted(result) == sorted(expected)) to avoid order-dependent failures
- End with: if __name__ == "__main__": unittest.main(verbosity=2)
- In testCases, provide one entry per test method with the exact method name, the human-readable input, and expected output`

  const raw = await callAI({
    systemPrompt,
    userPrompt,
    toolName: 'generate_unit_tests',
    toolDescription: 'Generate Python unittest code for a Solution class',
    inputSchema: UNIT_TEST_TOOL_SCHEMA,
  })

  const casesComment = `# __CASES__:${JSON.stringify(raw.testCases || [])}\n`
  return casesComment + raw.unitTests
}

// ── Step 4: Generate solution ───────────────────────────────────────────────
async function generateSolution(problem, unitTests, category) {
  const problemText = `${problem.title}\n${problem.description}\n\nExamples:\n${problem.examples.map((e, i) => `${i + 1}. Input: ${e.input} → Output: ${e.output} (${e.explanation})`).join('\n')}\n\nConstraints:\n${problem.constraints.map(c => `- ${c}`).join('\n')}`

  const systemPrompt = 'You are an expert Python engineer. Write the most optimal solution for the given coding problem. You MUST use the exact class name and method signature from the starter code. Include inline comments explaining key steps. The code MUST pass the provided unit tests.'
  const userPrompt = `Write the optimal Python solution for this problem.

This is a "${category}" problem — the optimal solution should use ${category} techniques.

Problem:
${problemText}

Starter code (you MUST use this exact class and method signature):
\`\`\`python
${problem.starterCode}
\`\`\`

Unit tests the solution must pass:
\`\`\`python
${unitTests}
\`\`\`

Requirements:
- Use the EXACT class and method signature from the starter code above
- Most optimal time and space complexity possible using ${category} techniques
- Include brief inline comments for key steps
- The code must pass ALL the provided unit tests
- MUST explicitly return the correct value — never return None implicitly
- Output ONLY the class — no imports unless necessary (collections, heapq, etc. are fine)`

  const raw = await callAI({
    systemPrompt,
    userPrompt,
    toolName: 'generate_solution',
    toolDescription: 'Generate an optimal Python solution',
    inputSchema: SOLUTION_TOOL_SCHEMA,
  })

  return {
    code: raw.code ?? raw.solution ?? '',
    explanation: raw.explanation ?? '',
  }
}

// ── Step 5: Verify solution passes tests ────────────────────────────────────
// Mirrors the exact approach from useProblemGeneration.js:
// 1. Strip `if __name__` block from tests
// 2. Append the same custom test runner that captures JSON results
// 3. Write to a temp file (avoids shell-escaping issues with python3 -c)

const TEST_RUNNER = `
import json as _json, unittest as _unittest, io as _io, contextlib as _ctx, traceback as _tb
class _R(_unittest.TestResult):
    def __init__(self):
        super().__init__(); self._r = []
    def addSuccess(self, t):
        self._r.append({'name': t._testMethodName, 'status': 'pass'})
    def addFailure(self, t, err):
        self._r.append({'name': t._testMethodName, 'status': 'fail', 'message': ''.join(_tb.format_exception(*err))})
    def addError(self, t, err):
        self._r.append({'name': t._testMethodName, 'status': 'error', 'message': ''.join(_tb.format_exception(*err))})
_results = []
for _t in _unittest.TestLoader().loadTestsFromTestCase(TestSolution):
    _buf = _io.StringIO()
    _r = _R()
    with _ctx.redirect_stdout(_buf):
        _unittest.TestSuite([_t]).run(_r)
    for _item in _r._r:
        _item['stdout'] = _buf.getvalue()
    _results.extend(_r._r)
print('__TEST_RESULTS__:' + _json.dumps(_results))
`

function stripMain(tests) {
  const lines = tests.split('\n')
  const mainIdx = lines.findIndex(l => l.trimStart().startsWith('if __name__'))
  return (mainIdx >= 0 ? lines.slice(0, mainIdx) : lines).join('\n')
}

// Clean up common AI response issues in generated code
function sanitizeGenerated(code) {
  if (!code) return ''

  // Strip markdown code fences (AI sometimes wraps code in ```python ... ```)
  code = code.replace(/^```(?:python)?\s*\n?/gm, '').replace(/^```\s*$/gm, '')

  // Fix test class name variants → TestSolution (AI sometimes uses TestDualBoundary, Test_Solution, etc.)
  code = code.replace(/class\s+(Test\w+)\s*\(\s*unittest\.TestCase\s*\)/g, (match, name) => {
    if (name !== 'TestSolution') return match.replace(name, 'TestSolution')
    return match
  })

  return code.split('\n').filter(line => {
    const trimmed = line.trimStart()
    // Remove "from solution import ..." or "import solution"
    if (/^from\s+solution\s+import\b/.test(trimmed)) return false
    if (/^import\s+solution\b/.test(trimmed)) return false
    return true
  }).join('\n').trim()
}

function parseTestResults(stdout) {
  const line = (stdout || '').split('\n').find(l => l.startsWith('__TEST_RESULTS__:'))
  if (!line) return null
  try { return JSON.parse(line.slice('__TEST_RESULTS__:'.length)) } catch { return null }
}

function formatTestOutput(parsed, stderr) {
  const parts = []
  if (stderr) parts.push(`Runtime stderr:\n${stderr}`)
  if (parsed && parsed.length) {
    const summary = parsed.map(r => {
      if (r.status === 'pass') return `  ✓ ${r.name}: PASS`
      return `  ✗ ${r.name}: ${r.status.toUpperCase()}\n    ${(r.message || '(no message)').split('\n').join('\n    ')}`
    }).join('\n')
    parts.push(`Test results:\n${summary}`)
  }
  return parts.join('\n\n').slice(0, 3000)
}

function runPythonTests(solutionCode, unitTests) {
  const testCode = stripMain(unitTests)
  // Prepend future annotations so list[int], dict[str, int] etc. work on Python < 3.10
  const combined = 'from __future__ import annotations\n\n' + solutionCode + '\n\n' + testCode + '\n' + TEST_RUNNER
  const tmpFile = resolve(ROOT, '.tmp_test_runner.py')
  writeFileSync(tmpFile, combined, 'utf-8')

  let stdout = '', stderr = ''
  try {
    stdout = execSync(`python3 "${tmpFile}"`, {
      encoding: 'utf-8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
  } catch (err) {
    // execSync throws on non-zero exit — but our test runner may still have printed results
    stdout = err.stdout || ''
    stderr = err.stderr || ''
  }

  // Always try to parse __TEST_RESULTS__ from stdout (regardless of exit code)
  const parsed = parseTestResults(stdout)
  if (parsed && parsed.length > 0) {
    const allPass = parsed.every(r => r.status === 'pass')
    if (allPass) return { passed: true, output: '' }
    return { passed: false, output: formatTestOutput(parsed, '') }
  }

  // No test results parsed — raw error (syntax error, import error, etc.)
  return { passed: false, output: (stderr + '\n' + stdout).slice(0, 3000) }
}

// ── Step 6: Diagnose and fix ────────────────────────────────────────────────
async function diagnoseAndFix(problem, solutionCode, unitTests, testOutput, category) {
  const problemText = `${problem.title}\n${problem.description}`

  const systemPrompt = `You are an expert Python engineer and test reviewer. Given a coding problem, a solution, unit tests, and the test failure output, determine whether the solution has a bug or the unit tests assert wrong expected values. Exactly one side is wrong — find it and fix it. This is a "${category}" problem.`
  const userPrompt = `A solution was generated for this problem but some tests fail. Diagnose whether the solution or the tests are at fault, and provide the corrected code.

Problem:
${problemText}

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

  const raw = await callAI({
    systemPrompt,
    userPrompt,
    toolName: 'diagnose_failure',
    toolDescription: 'Diagnose and fix test failures',
    inputSchema: DIAGNOSIS_TOOL_SCHEMA,
  })

  // Normalize fault
  let fault = raw.fault ?? ''
  if (typeof fault === 'string') {
    const f = fault.toLowerCase().trim()
    if (f.includes('test')) fault = 'tests'
    else fault = 'solution'
  }

  return {
    fault,
    reasoning: raw.reasoning ?? '',
    fixedCode: raw.fixedCode ?? raw.fixed_code ?? '',
    fixedExplanation: raw.fixedExplanation ?? raw.fixed_explanation ?? '',
  }
}

// ── SQL escaping ────────────────────────────────────────────────────────────
function sqlEscape(str) {
  return str.replace(/'/g, "''").replace(/\\n/g, '\n')
}

function toSqlUpdate(lc, data) {
  return `UPDATE public.problems SET
  description          = '${sqlEscape(data.description)}',
  examples             = '${sqlEscape(JSON.stringify(data.examples))}'::jsonb,
  constraints          = '${sqlEscape(JSON.stringify(data.constraints))}'::jsonb,
  starter_code         = '${sqlEscape(data.starterCode)}',
  unit_tests           = '${sqlEscape(data.unitTests)}',
  solution_code        = '${sqlEscape(data.solutionCode)}',
  solution_explanation = '${sqlEscape(data.solutionExplanation)}'
WHERE lc = ${lc};`
}

// ── Main ────────────────────────────────────────────────────────────────────
async function processOneProblem(prob) {
  const category = CATEGORY_NAMES[prob.categoryId]
  const label = `[LC ${prob.lc}] ${prob.title}`

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`${label} (${prob.difficulty}, ${category})`)
  console.log(`${'═'.repeat(60)}`)

  if (DRY_RUN) {
    console.log('  [dry-run] would generate problem draft, tests, solution')
    return null
  }

  // Step 1: Generate problem draft
  console.log('  → Generating problem draft…')
  let draft = await generateProblemDraft(prob)
  console.log(`    Title: "${draft.title}"`)

  // Step 2: Review examples
  console.log('  → Reviewing examples…')
  const reviewed = await reviewProblem(draft)
  draft = {
    title: reviewed.title || draft.title,
    description: reviewed.description || draft.description,
    examples: reviewed.examples || draft.examples,
    constraints: reviewed.constraints || draft.constraints,
    starterCode: reviewed.starterCode || draft.starterCode,
  }
  console.log(`    Reviewed: "${draft.title}"`)

  // Outer loop: generate tests + solution, verify, diagnose/fix.
  // If diagnose can't fix after 5 rounds, regenerate everything from scratch.
  const MAX_DIAGNOSE_ROUNDS = 5
  const MAX_REGEN_ATTEMPTS = 3
  let unitTests, solution, totalRounds = 0

  for (let attempt = 0; attempt < MAX_REGEN_ATTEMPTS; attempt++) {
    if (attempt > 0) console.log(`  ↻ Regenerating tests + solution (attempt ${attempt + 1}/${MAX_REGEN_ATTEMPTS})…`)

    // Step 3: Generate tests (retry up to 3 times if structurally broken)
    for (let testTry = 0; testTry < 3; testTry++) {
      if (testTry > 0) console.log(`    ⚠ Tests invalid, regenerating (try ${testTry + 1}/3)…`)
      console.log('  → Generating tests…')
      unitTests = sanitizeGenerated(await generateTests(draft))
      if (unitTests.includes('TestSolution') && unitTests.includes('assertEqual')) break
    }
    console.log(`    Tests: ${unitTests.length} chars`)
    if (!unitTests.includes('TestSolution')) {
      console.log(`    ✗ Could not generate valid tests — skipping to next regen attempt`)
      continue
    }

    // Step 4: Generate solution (retry up to 3 times if structurally broken)
    for (let solTry = 0; solTry < 3; solTry++) {
      if (solTry > 0) console.log(`    ⚠ Solution invalid, regenerating (try ${solTry + 1}/3)…`)
      console.log('  → Generating solution…')
      solution = await generateSolution(draft, unitTests, category)
      solution.code = sanitizeGenerated(solution.code)
      if (solution.code.includes('class Solution') && solution.code.includes('return')) break
    }
    console.log(`    Solution: ${solution.code.length} chars`)
    if (!solution.code.includes('class Solution')) {
      console.log(`    ✗ Could not generate valid solution — skipping to next regen attempt`)
      continue
    }

    // Step 5: Verify
    console.log('  → Verifying solution passes tests…')
    let result = runPythonTests(solution.code, unitTests)
    if (!result.passed) console.log(`    First failure:\n${result.output.split('\n').slice(0, 6).map(l => '    ' + l).join('\n')}`)

    // Step 6: Diagnose/fix loop — up to MAX_DIAGNOSE_ROUNDS, then regenerate
    let round = 0
    while (!result.passed && round < MAX_DIAGNOSE_ROUNDS) {
      round++
      totalRounds++
      console.log(`  → Fix round ${round}/${MAX_DIAGNOSE_ROUNDS}: diagnosing…`)
      const diag = await diagnoseAndFix(draft, solution.code, unitTests, result.output, category)
      console.log(`    Fault: ${diag.fault} — ${diag.reasoning.slice(0, 80)}…`)

      const fixed = sanitizeGenerated(diag.fixedCode || '')

      // Validate the fix before applying — skip garbage responses
      if (diag.fault === 'tests') {
        if (!fixed || !fixed.includes('TestSolution')) {
          console.log(`    ⚠ Diagnose returned invalid tests (missing TestSolution) — skipping round`)
          console.log(`    ⚠ fixedCode preview: ${(diag.fixedCode || '').slice(0, 120)}…`)
          continue
        }
        unitTests = fixed
      } else {
        if (!fixed || !fixed.includes('class Solution')) {
          console.log(`    ⚠ Diagnose returned invalid solution (missing class Solution) — skipping round`)
          continue
        }
        solution.code = fixed
        if (diag.fixedExplanation) solution.explanation = diag.fixedExplanation
      }

      result = runPythonTests(solution.code, unitTests)
    }

    if (result.passed) {
      console.log(`  ✓ All tests passing${totalRounds > 0 ? ` (after ${totalRounds} fix round${totalRounds > 1 ? 's' : ''})` : ''}`)
      break
    }

    if (attempt === MAX_REGEN_ATTEMPTS - 1) {
      console.log(`  ✗ FAILED after ${MAX_REGEN_ATTEMPTS} full attempts — skipping`)
      return null
    }
    console.log(`  ✗ Still failing after ${MAX_DIAGNOSE_ROUNDS} diagnose rounds — will regenerate`)
  }

  return {
    description: draft.description,
    examples: draft.examples,
    constraints: draft.constraints,
    starterCode: draft.starterCode,
    unitTests,
    solutionCode: solution.code,
    solutionExplanation: solution.explanation,
  }
}

async function main() {
  const outPath = resolve(ROOT, 'supabase/migrations/20260228000001_drill_content_data.sql')
  const problems = parseSeedProblems()
  console.log(`Found ${problems.length} problems in seed data`)

  // Load existing output file — preserve already-generated statements
  let existingSQL = ''
  const doneLCs = new Set()
  if (existsSync(outPath)) {
    existingSQL = readFileSync(outPath, 'utf-8')
    // Extract all LCs that already have UPDATE statements
    for (const m of existingSQL.matchAll(/WHERE lc = (\d+);/g)) {
      doneLCs.add(Number(m[1]))
    }
    if (doneLCs.size) console.log(`Found ${doneLCs.size} already-generated LCs in output file — skipping those`)
  }

  let targets = problems
  if (SINGLE_LC) {
    targets = problems.filter(p => p.lc === SINGLE_LC)
    if (!targets.length) {
      console.error(`No problem with lc=${SINGLE_LC} found`)
      process.exit(1)
    }
  }

  // Filter out already-done problems (unless explicitly targeting one with --lc)
  if (!SINGLE_LC) {
    targets = targets.filter(p => !doneLCs.has(p.lc))
  }

  if (RESUME_AFTER) {
    const idx = targets.findIndex(p => p.lc === RESUME_AFTER)
    if (idx === -1) {
      console.error(`No problem with lc=${RESUME_AFTER} found in remaining targets`)
      process.exit(1)
    }
    targets = targets.slice(idx + 1)
    console.log(`Resuming after LC ${RESUME_AFTER}, ${targets.length} problems remaining`)
  }

  console.log(`${targets.length} problems to generate`)

  // Collect existing statements (split on the UPDATE boundary)
  const statements = []
  if (existingSQL) {
    for (const block of existingSQL.split(/(?=UPDATE public\.problems SET)/)) {
      const trimmed = block.trim()
      if (trimmed.startsWith('UPDATE public.problems SET')) statements.push(trimmed)
    }
  }

  for (const prob of targets) {
    if (DRY_RUN) {
      console.log(`  [dry-run] would generate LC ${prob.lc}: ${prob.title}`)
      continue
    }
    const data = await processOneProblem(prob)
    if (data) {
      statements.push(toSqlUpdate(prob.lc, data))
      // Write incrementally after each success so progress is never lost
      const sql = `-- Auto-generated drill exercise content\n-- Last updated: ${new Date().toISOString()}\n\n${statements.join('\n\n')}\n`
      writeFileSync(outPath, sql, 'utf-8')
    }
  }

  if (DRY_RUN) {
    console.log(`\n[dry-run] Would generate ${targets.length} exercises`)
    return
  }

  // Cleanup temp file
  try { unlinkSync(resolve(ROOT, '.tmp_test_runner.py')) } catch {}

  console.log(`\n✓ Output file has ${statements.length} total UPDATE statements`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
