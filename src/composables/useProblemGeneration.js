import { ref, computed } from 'vue'
import { marked } from 'marked'
import { useAuth } from './useAuth.js'

marked.use({ breaks: true, gfm: true })

const BUSINESS_FIELDS = [
  'AI / ML',
  'Ad Tech',
  'Search & Recommendations',
  'Social Media',
  'Cloud & Infrastructure',
  'E-commerce & Marketplace',
  'Streaming & Media',
  'Payments & Fintech',
  'Ride-sharing & Maps',
  'Messaging & Collaboration',
  'Gaming',
  'Developer Tools',
]

const REVIEW_FRAMES = [
  '# verifying examples...',
  '# verifying examples...\nassert solution([2,7], 9)|',
  '# verifying examples...\nassert solution([2,7], 9) == [0,1]',
  '# verifying examples...\nassert solution([2,7], 9) == [0,1]  ✓',
  '# verifying examples...\nassert solution([2,7], 9) == [0,1]  ✓\nassert solution([3,2,4], 6)|',
  '# verifying examples...\nassert solution([2,7], 9) == [0,1]  ✓\nassert solution([3,2,4], 6) == [1,2]',
  '# verifying examples...\nassert solution([2,7], 9) == [0,1]  ✓\nassert solution([3,2,4], 6) == [1,2]  ✓',
  '# verifying examples...\nassert solution([2,7], 9) == [0,1]  ✓\nassert solution([3,2,4], 6) == [1,2]  ✓\n# cleaning up...',
]

const PROB_FRAMES = [
  'def solution(nums):',
  'def solution(nums):|',
  'def solution(nums):\n    result = {}',
  'def solution(nums):\n    result = {}|',
  'def solution(nums):\n    result = {}\n    for i, num in enumerate(nums):',
  'def solution(nums):\n    result = {}\n    for i, num in enumerate(nums):|',
  'def solution(nums):\n    result = {}\n    for i, num in enumerate(nums):\n        complement = target - num',
  'def solution(nums):\n    result = {}\n    for i, num in enumerate(nums):\n        complement = target - num|',
]

const TEST_FRAMES = [
  'class TestSolution(unittest.TestCase):',
  'class TestSolution(unittest.TestCase):|',
  'class TestSolution(unittest.TestCase):\n    def test_basic(self):',
  'class TestSolution(unittest.TestCase):\n    def test_basic(self):|',
  'class TestSolution(unittest.TestCase):\n    def test_basic(self):\n        self.assertEqual(solution([2,7,11,15], 9), [0,1])',
  'class TestSolution(unittest.TestCase):\n    def test_basic(self):\n        self.assertEqual(solution([2,7,11,15], 9), [0,1])|',
  'class TestSolution(unittest.TestCase):\n    def test_basic(self):\n        self.assertEqual(solution([2,7,11,15], 9), [0,1])\n    def test_edge(self):',
  'class TestSolution(unittest.TestCase):\n    def test_basic(self):\n        self.assertEqual(solution([2,7,11,15], 9), [0,1])\n    def test_edge(self):|',
]

const SOLUTION_FRAMES = [
  'class Solution:',
  'class Solution:|',
  'class Solution:\n    def solve(self, nums, target):',
  'class Solution:\n    def solve(self, nums, target):|',
  'class Solution:\n    def solve(self, nums, target):\n        seen = {}  # val → index',
  'class Solution:\n    def solve(self, nums, target):\n        seen = {}  # val → index|',
  'class Solution:\n    def solve(self, nums, target):\n        seen = {}  # val → index\n        for i, num in enumerate(nums):',
  'class Solution:\n    def solve(self, nums, target):\n        seen = {}  # val → index\n        for i, num in enumerate(nums):\n            if target - num in seen:',
  'class Solution:\n    def solve(self, nums, target):\n        seen = {}  # val → index\n        for i, num in enumerate(nums):\n            if target - num in seen:\n                return [seen[target - num], i]',
  'class Solution:\n    def solve(self, nums, target):\n        seen = {}  # val → index\n        for i, num in enumerate(nums):\n            if target - num in seen:\n                return [seen[target - num], i]\n            seen[num] = i  # O(n) time, O(n) space',
]

const VERIFY_FRAMES = [
  '# running tests against solution...',
  '# running tests against solution...\ntest_basic .',
  '# running tests against solution...\ntest_basic .  ✓',
  '# running tests against solution...\ntest_basic .  ✓\ntest_edge .',
  '# running tests against solution...\ntest_basic .  ✓\ntest_edge .  ✓',
  '# running tests against solution...\ntest_basic .  ✓\ntest_edge .  ✓\n# all tests pass',
]

export function useProblemGeneration({
  getCategoryName,
  selectedForAI,
  selectedGenForAI,
  problemByLc,
  savedExercises,
  loadSavedExercises,
  persistGeneratedExercise,
  flushSave,
  setEditorValue,
  openAuth,
  panelMode,
  currentExerciseId,
  dbSaveError,
  showTests,
  getSelectedExercise,
  runPython,
}) {
  const { user, isSubscribed } = useAuth()

  const businessField = ref('')
  const generatedProblem = ref(null)
  const isGenerating = ref(false)
  const generationStatus = ref('')
  const generationError = ref(null)

  const descriptionHtml = computed(() =>
    generatedProblem.value ? marked.parse(generatedProblem.value.description) : ''
  )

  const isGeneratingTests = computed(() =>
    isGenerating.value && !!generatedProblem.value && generationStatus.value === 'writing tests'
  )

  const difficultyGuess = computed(() => {
    if (!generatedProblem.value) return 'Medium'
    const selected = [...selectedForAI].map(lc => problemByLc(lc)).filter(Boolean)
    if (!selected.length) return 'Medium'
    const counts = { Easy: 0, Medium: 0, Hard: 0 }
    selected.forEach(p => counts[p.difficulty]++)
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
  })

  const generationBlocked = computed(() =>
    !isSubscribed.value && savedExercises.value.length >= 1
  )

  // ── Animation ──
  const animFrame = ref(0)
  let _animTimer = null

  const panelAnimText = computed(() => {
    const frames =
      generationStatus.value === 'reviewing' ? REVIEW_FRAMES :
      generationStatus.value === 'writing tests' ? TEST_FRAMES :
      generationStatus.value === 'solving' ? SOLUTION_FRAMES :
      generationStatus.value === 'verifying' ? VERIFY_FRAMES :
      PROB_FRAMES
    return frames[animFrame.value % frames.length]
  })

  function startAnim() {
    animFrame.value = 0
    _animTimer = setInterval(() => { animFrame.value++ }, 200)
  }

  function stopAnim() {
    clearInterval(_animTimer)
    _animTimer = null
  }

  // ── API ──
  async function apiFetch(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    let data
    try { data = await res.json() }
    catch {
      if (res.status === 404) throw new Error('API route not found — run `npm run dev:ai` instead of `npm run dev`.')
      throw new Error(`Server returned ${res.status} with no JSON body`)
    }
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
    return data
  }

  async function generate() {
    if (!user.value) { openAuth(); return }
    await loadSavedExercises()
    if (generationBlocked.value) return
    await flushSave()
    currentExerciseId.value = null
    isGenerating.value = true
    generationError.value = null
    generatedProblem.value = null
    showTests.value = false
    panelMode.value = 'loading'
    startAnim()

    const selectedProblems = [
      ...[...selectedForAI].map(lc => problemByLc(lc)).filter(Boolean).map(({ title, difficulty }) => ({ title, difficulty })),
      ...[...selectedGenForAI].map(id => savedExercises.value.find(e => e.id === id)).filter(Boolean).map(({ title, difficulty }) => ({ title, difficulty })),
    ]

    try {
      // Step 1 — generate problem draft
      generationStatus.value = 'generating'
      const draft = await apiFetch('/api/generate', {
        category: getCategoryName(),
        selectedProblems,
        businessField: businessField.value || null,
      })

      // Step 2 — review & fix examples
      generationStatus.value = 'reviewing'
      const problem = await apiFetch('/api/review', { problem: draft })

      // Show reviewed problem; switch panel to generated view
      generatedProblem.value = { ...problem, unitTests: '', difficulty: difficultyGuess.value }
      panelMode.value = 'generated'
      setEditorValue(problem.starterCode)

      // Step 3 — generate unit tests
      generationStatus.value = 'writing tests'
      const { unitTests } = await apiFetch('/api/generate-tests', { problem })
      generatedProblem.value = { ...problem, unitTests, difficulty: difficultyGuess.value, solutionCode: '', solutionExplanation: '' }

      // Step 4 — generate & verify optimal solution (diagnose + fix if tests fail)
      let solutionCode = ''
      let solutionExplanation = ''
      let currentTests = unitTests
      try {
        generationStatus.value = 'solving'
        const problemText = `${problem.title}\n${problem.description}\n\nExamples:\n${problem.examples.map((e, i) => `${i + 1}. Input: ${e.input} → Output: ${e.output}`).join('\n')}\n\nConstraints:\n${problem.constraints.join('\n')}`

        const solution = await apiFetch('/api/generate-solution', {
          problem: problemText,
          unitTests: currentTests,
          category: getCategoryName(),
        })
        solutionCode = solution.code
        solutionExplanation = solution.explanation

        // Verify solution passes unit tests via Pyodide
        if (runPython) {
          const TEST_RUNNER = `
import json as _json, unittest as _unittest, io as _io, contextlib as _ctx
class _R(_unittest.TestResult):
    def __init__(self):
        super().__init__(); self._r = []
    def addSuccess(self, t):
        self._r.append({'name': t._testMethodName, 'status': 'pass'})
    def addFailure(self, t, err):
        self._r.append({'name': t._testMethodName, 'status': 'fail', 'message': str(err[1])})
    def addError(self, t, err):
        self._r.append({'name': t._testMethodName, 'status': 'error', 'message': str(err[1])})
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

          function checkResults(pyResult) {
            const line = (pyResult.stdout || '').split('\n').find(l => l.startsWith('__TEST_RESULTS__:'))
            if (!line) return { allPass: false, parsed: [] }
            try {
              const parsed = JSON.parse(line.slice('__TEST_RESULTS__:'.length))
              return { allPass: parsed.length > 0 && parsed.every(r => r.status === 'pass'), parsed }
            } catch { return { allPass: false, parsed: [] } }
          }

          function collectErrorOutput(pyResult) {
            const parts = []
            if (pyResult.stderr) parts.push(pyResult.stderr)
            if (pyResult.error) parts.push(pyResult.error)
            const line = (pyResult.stdout || '').split('\n').find(l => l.startsWith('__TEST_RESULTS__:'))
            if (line) parts.push(line)
            if (!parts.length) parts.push((pyResult.stdout || '').slice(0, 500))
            return parts.join('\n').slice(0, 1500)
          }

          generationStatus.value = 'verifying'
          const testCode = stripMain(currentTests)
          const result = await runPython(`${solutionCode}\n\n${testCode}\n${TEST_RUNNER}`)
          let { allPass } = checkResults(result)

          // If verification fails, diagnose whether solution or tests are wrong
          if (!allPass) {
            console.warn('[generate] solution failed tests — diagnosing fault')
            generationStatus.value = 'solving'
            const errorOutput = collectErrorOutput(result)

            const diagnosis = await apiFetch('/api/diagnose-failure', {
              problem: problemText,
              solutionCode,
              unitTests: currentTests,
              testOutput: errorOutput,
              category: getCategoryName(),
            })

            console.log(`[generate] diagnosis: fault=${diagnosis.fault}, reasoning: ${diagnosis.reasoning.slice(0, 80)}`)

            if (diagnosis.fault === 'tests') {
              // Tests were wrong — replace them
              currentTests = diagnosis.fixedCode
              generatedProblem.value = { ...generatedProblem.value, unitTests: currentTests }
            } else {
              // Solution was wrong — replace it
              solutionCode = diagnosis.fixedCode
              if (diagnosis.fixedExplanation) solutionExplanation = diagnosis.fixedExplanation
            }

            // Re-verify after the fix
            generationStatus.value = 'verifying'
            const fixedTestCode = stripMain(currentTests)
            const retryResult = await runPython(`${solutionCode}\n\n${fixedTestCode}\n${TEST_RUNNER}`)
            const retryCheck = checkResults(retryResult)
            if (!retryCheck.allPass) {
              console.warn('[generate] still failing after diagnosis — saving best effort')
            }
          }
        }
      } catch (err) {
        console.warn('[generate] solution step failed:', err.message, '— continuing without solution')
      }

      generatedProblem.value = { ...generatedProblem.value, unitTests: currentTests, solutionCode, solutionExplanation }

      // Persist to DB and wire up autosave
      console.log('[generate] saving to DB, user:', user.value?.id ?? '(not logged in)')
      const savedId = await persistGeneratedExercise(problem, currentTests, difficultyGuess.value, solutionCode, solutionExplanation)
      if (savedId) {
        generatedProblem.value = { ...generatedProblem.value, id: savedId }
        currentExerciseId.value = savedId
        dbSaveError.value = null
        await loadSavedExercises()
      } else if (user.value) {
        dbSaveError.value = 'Could not save — check browser console and ensure the DB migration has been applied in Supabase.'
      }
    } catch (err) {
      generationError.value = err.message
      panelMode.value = getSelectedExercise?.() ? 'exercise' : 'empty'
    } finally {
      stopAnim()
      isGenerating.value = false
      generationStatus.value = ''
    }
  }

  return {
    businessField,
    generatedProblem,
    isGenerating,
    isGeneratingTests,
    generationStatus,
    generationError,
    generationBlocked,
    descriptionHtml,
    difficultyGuess,
    panelAnimText,
    BUSINESS_FIELDS,
    generate,
    stopAnim,
  }
}
