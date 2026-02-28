#!/usr/bin/env node
/**
 * Generate exercise content for the 9 new catalogue drills.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... node scripts/generate-new-drills.mjs
 *   ANTHROPIC_API_KEY=sk-... node scripts/generate-new-drills.mjs --lc 704   # single problem
 *   ANTHROPIC_API_KEY=sk-... node scripts/generate-new-drills.mjs --dry-run   # preview list
 *
 * Output: supabase/migrations/20260228000004_new_drill_content.sql
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

// ── Provider ────────────────────────────────────────────────────────────────
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
        model: 'claude-sonnet-4-20250514',
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
        model: 'anthropic/claude-sonnet-4-20250514',
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

// ── Inline problem definitions (the 9 new drills) ──────────────────────────
const NEW_PROBLEMS = [
  {
    lc: 643, categoryId: 'sliding-window', title: 'Maximum Average Subarray', difficulty: 'Easy',
    howTo: ['Maintain a running sum of the current window of size k; slide by subtracting the left element and adding the right',
            'Track the maximum sum seen; divide by k at the end for the average'],
    whenTo: ['Fixed-size window scanning for an aggregate (sum, average, max)',
             'Simplest sliding window — good warm-up before variable-width problems'],
  },
  {
    lc: 977, categoryId: 'two-pointers', title: 'Squares of a Sorted Array', difficulty: 'Easy',
    howTo: ['Two pointers at both ends of the array; compare absolute values and fill the result from the back',
            'The largest square must come from one of the two ends since the array is sorted'],
    whenTo: ['Sorted input with negative numbers where squaring breaks the sort order',
             'Merge-from-ends pattern on a sorted array'],
  },
  {
    lc: 704, categoryId: 'binary-search', title: 'Binary Search', difficulty: 'Easy',
    howTo: ['Classic binary search: compare mid with target, narrow to left or right half',
            'Use lo <= hi loop; return mid on match, return -1 if lo > hi'],
    whenTo: ['Search for a specific value in a sorted array',
             'The most fundamental binary search — prerequisite for all variants'],
  },
  {
    lc: 34, categoryId: 'binary-search', title: 'First and Last Position', difficulty: 'Medium',
    howTo: ['Run binary search twice: once biased left (find first) and once biased right (find last)',
            'For leftmost: when nums[mid] == target, keep searching left; for rightmost: keep searching right'],
    whenTo: ['Find the range of indices where a target appears in a sorted array',
             'Binary search for boundaries rather than exact match — bisect_left / bisect_right pattern'],
  },
  {
    lc: 133, categoryId: 'graphs', title: 'Clone Graph', difficulty: 'Medium',
    howTo: ['BFS or DFS with a hash map from original node to its clone; process each neighbor recursively',
            'When visiting a neighbor, return the existing clone if already created — prevents infinite loops'],
    whenTo: ['Deep copy a graph or linked structure with cycles',
             'HashMap-based traversal to replicate nodes while preserving adjacency relationships'],
  },
  {
    lc: 743, categoryId: 'graphs', title: 'Network Delay Time', difficulty: 'Medium',
    howTo: ['Dijkstra with a min-heap: process the node with the smallest known distance first',
            'Build an adjacency list from edges; answer is the maximum distance among all reachable nodes'],
    whenTo: ['Find shortest paths from a single source in a weighted graph',
             'Classic Dijkstra application — positive weights, single-source shortest path'],
  },
  {
    lc: 300, categoryId: 'dynamic-programming', title: 'Longest Increasing Subsequence', difficulty: 'Medium',
    howTo: ['dp[i] = length of LIS ending at index i; dp[i] = 1 + max(dp[j]) for all j < i where nums[j] < nums[i]',
            'O(n log n) optimization: maintain a tails array and use binary search to find the insertion point'],
    whenTo: ['Find the longest subsequence with a strictly increasing order',
             'Classic 1D DP on subsequences — foundation for patience sorting and related problems'],
  },
  {
    lc: 416, categoryId: 'dynamic-programming', title: 'Partition Equal Subset Sum', difficulty: 'Medium',
    howTo: ['Reduce to subset sum: can we find a subset summing to totalSum / 2?',
            'Boolean DP: dp[j] = true if sum j is achievable; iterate nums and update dp from right to left'],
    whenTo: ['Partition an array into two subsets with equal sum',
             '0/1 knapsack variant — each element is used at most once, target is half the total'],
  },
  {
    lc: 215, categoryId: 'heaps-intervals', title: 'Kth Largest Element', difficulty: 'Medium',
    howTo: ['Min-heap of size k: push each element, pop when size exceeds k; top of heap is the answer',
            'Quickselect alternative: partition around a pivot, recurse into the half containing the k-th element'],
    whenTo: ['Find the k-th largest (or smallest) element in an unsorted array',
             'Top-K selection pattern — heap gives O(n log k), quickselect gives O(n) average'],
  },
]

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

// ── Tool schemas ────────────────────────────────────────────────────────────
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
  const userPrompt = `Write an original coding interview drill inspired by the concept of "${prob.title}" (drill #${prob.lc}).

**Category (IMPORTANT — the problem MUST test this concept): ${category}**
Difficulty: ${prob.difficulty}

Context from the drill:
- When to use this pattern: ${prob.whenTo.join('; ')}
- How to approach: ${prob.howTo.join('; ')}

IMPORTANT:
- Write a COMPLETELY ORIGINAL problem — do NOT copy any existing problem statement verbatim.
- Use CLASSIC ALGORITHMIC naming and style — like "Maximum Subarray Sum", "Shortest Path in Grid", "Valid Parentheses". Pure data structures and algorithms, NO themes, NO stories, NO business scenarios.
- Use standard variable names (nums, arr, s, target, k, etc.) — the kind you see in any algorithm textbook.
- Different example values from common versions of this problem.

Requirements:
- description: markdown prose only — no examples, no constraints. Use **bold** for key terms and \`code\` for variable names.
- examples: 2-3 concise examples. input/output must be raw values only (e.g. \`[2,7,11,15], 9\`). explanation: one short sentence.
- constraints: 3-4 short items (e.g. "2 ≤ n ≤ 10⁴", "O(n) time expected").
- starterCode: Python \`class Solution\` with one method, correct type hints, body is just \`pass\`.
- title: A short, classic algorithm-style title (NOT any well-known problem title). Examples of good titles: "Longest Balanced Substring", "K-th Largest in Stream", "Minimum Window Coverage".`

  return callAI({
    systemPrompt,
    userPrompt,
    toolName: 'generate_problem',
    toolDescription: 'Generate a coding interview drill with starter code',
    inputSchema: PROBLEM_TOOL_SCHEMA,
  })
}

// ── Step 2: Review examples ─────────────────────────────────────────────────
async function reviewProblem(problem) {
  const systemPrompt = 'You are a meticulous coding interview problem reviewer. Your only job is to find and fix factual errors — wrong example outputs, inconsistent explanations, contradictions. Do not change the problem concept or difficulty.'
  const userPrompt = `Review the following coding interview drill and return a corrected version.

${JSON.stringify(problem, null, 2)}

For each example:
- Step through a correct solution on the given input, showing your reasoning.
- If the stated output is wrong, compute the correct one and fix the explanation.
- If the explanation is vague or inconsistent with the input/output, rewrite it in one precise sentence.

Fix any contradictions between the description and the examples.
Keep the title, constraints, and starterCode unchanged unless they directly contradict a corrected example.
Return the complete corrected problem.`

  return callAI({
    systemPrompt,
    userPrompt,
    toolName: 'review_problem',
    toolDescription: 'Review and correct a coding interview drill',
    inputSchema: {
      ...PROBLEM_TOOL_SCHEMA,
      properties: {
        ...PROBLEM_TOOL_SCHEMA.properties,
        all_examples_verified: { type: 'boolean' },
      },
      required: [...PROBLEM_TOOL_SCHEMA.required, 'all_examples_verified'],
    },
  })
}

// ── Step 3: Generate tests ──────────────────────────────────────────────────
async function generateTests(problem) {
  const systemPrompt = 'You are an expert Python developer. Write clean, minimal unittest code. You MUST carefully compute the expected output for each test by mentally tracing the correct algorithm step by step. Double-check every expected value before writing the assertion.'
  const userPrompt = `Write Python unit tests for this coding interview drill.

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

  const systemPrompt = 'You are an expert Python engineer. Write the most optimal solution for the given coding drill. You MUST use the exact class name and method signature from the starter code. Include inline comments explaining key steps. The code MUST pass the provided unit tests.'
  const userPrompt = `Write the optimal Python solution for this drill.

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

function sanitizeGenerated(code) {
  if (!code) return ''
  code = code.replace(/^```(?:python)?\s*\n?/gm, '').replace(/^```\s*$/gm, '')
  code = code.replace(/class\s+(Test\w+)\s*\(\s*unittest\.TestCase\s*\)/g, (match, name) => {
    if (name !== 'TestSolution') return match.replace(name, 'TestSolution')
    return match
  })
  return code.split('\n').filter(line => {
    const trimmed = line.trimStart()
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
    stdout = err.stdout || ''
    stderr = err.stderr || ''
  }

  const parsed = parseTestResults(stdout)
  if (parsed && parsed.length > 0) {
    const allPass = parsed.every(r => r.status === 'pass')
    if (allPass) return { passed: true, output: '' }
    return { passed: false, output: formatTestOutput(parsed, '') }
  }

  return { passed: false, output: (stderr + '\n' + stdout).slice(0, 3000) }
}

// ── Step 6: Diagnose and fix ────────────────────────────────────────────────
async function diagnoseAndFix(problem, solutionCode, unitTests, testOutput, category) {
  const problemText = `${problem.title}\n${problem.description}`

  const systemPrompt = `You are an expert Python engineer and test reviewer. Given a coding drill, a solution, unit tests, and the test failure output, determine whether the solution has a bug or the unit tests assert wrong expected values. Exactly one side is wrong — find it and fix it. This is a "${category}" problem.`
  const userPrompt = `A solution was generated for this drill but some tests fail. Diagnose whether the solution or the tests are at fault, and provide the corrected code.

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
  title                = '${sqlEscape(data.title)}',
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
  const label = `[#${prob.lc}] ${prob.title}`

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

    // Step 6: Diagnose/fix loop
    let round = 0
    while (!result.passed && round < MAX_DIAGNOSE_ROUNDS) {
      round++
      totalRounds++
      console.log(`  → Fix round ${round}/${MAX_DIAGNOSE_ROUNDS}: diagnosing…`)
      const diag = await diagnoseAndFix(draft, solution.code, unitTests, result.output, category)
      console.log(`    Fault: ${diag.fault} — ${diag.reasoning.slice(0, 80)}…`)

      const fixed = sanitizeGenerated(diag.fixedCode || '')

      if (diag.fault === 'tests') {
        if (!fixed || !fixed.includes('TestSolution')) {
          console.log(`    ⚠ Diagnose returned invalid tests (missing TestSolution) — skipping round`)
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
    title: draft.title,
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
  const outPath = resolve(ROOT, 'supabase/migrations/20260228000004_new_drill_content.sql')

  console.log(`${NEW_PROBLEMS.length} new drills defined`)

  // Load existing output — preserve already-generated statements
  let existingSQL = ''
  const doneLCs = new Set()
  if (existsSync(outPath)) {
    existingSQL = readFileSync(outPath, 'utf-8')
    for (const m of existingSQL.matchAll(/WHERE lc = (\d+);/g)) {
      doneLCs.add(Number(m[1]))
    }
    if (doneLCs.size) console.log(`Found ${doneLCs.size} already-generated LCs in output file — skipping those`)
  }

  let targets = NEW_PROBLEMS
  if (SINGLE_LC) {
    targets = NEW_PROBLEMS.filter(p => p.lc === SINGLE_LC)
    if (!targets.length) {
      console.error(`No problem with lc=${SINGLE_LC} found in new drills`)
      process.exit(1)
    }
  }

  // Filter out already-done (unless explicitly targeting one with --lc)
  if (!SINGLE_LC) {
    targets = targets.filter(p => !doneLCs.has(p.lc))
  }

  console.log(`${targets.length} problems to generate`)

  // Collect existing statements
  const statements = []
  if (existingSQL) {
    for (const block of existingSQL.split(/(?=UPDATE public\.problems SET)/)) {
      const trimmed = block.trim()
      if (trimmed.startsWith('UPDATE public.problems SET')) statements.push(trimmed)
    }
  }

  for (const prob of targets) {
    if (DRY_RUN) {
      console.log(`  [dry-run] would generate #${prob.lc}: ${prob.title}`)
      continue
    }
    const data = await processOneProblem(prob)
    if (data) {
      statements.push(toSqlUpdate(prob.lc, data))
      // Write incrementally so progress is never lost
      const sql = `-- Auto-generated drill exercise content (new drills)\n-- Last updated: ${new Date().toISOString()}\n\n${statements.join('\n\n')}\n`
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
