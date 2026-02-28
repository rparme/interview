import { ref, computed, reactive } from 'vue'
import { marked } from 'marked'
import { useAuth } from './useAuth.js'
import { supabase } from '../lib/supabase.js'

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
  getCategoryId,
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
  const backgroundJobs = ref([])

  // Staleness detection: if the user switches exercises mid-generation,
  // the async generate() must stop mutating shared state.
  let _genSeq = 0

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

  const _freeLimit = import.meta.env.VITE_FREE_EXERCISE_LIMIT
  const freeExerciseLimit = _freeLimit !== undefined && _freeLimit !== '' ? Number(_freeLimit) : 1

  const generationBlocked = computed(() => {
    if (backgroundJobs.value.length > 0) return true
    if (isSubscribed.value) return false
    if (freeExerciseLimit === 0) return true
    return savedExercises.value.length >= freeExerciseLimit
  })

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
    if (_animTimer) clearInterval(_animTimer)
    animFrame.value = 0
    _animTimer = setInterval(() => { animFrame.value++ }, 200)
  }

  function stopAnim() {
    clearInterval(_animTimer)
    _animTimer = null
  }

  // ── API ──
  async function apiFetch(url, body) {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
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

    const seq = ++_genSeq
    const stale = () => _genSeq !== seq

    // Background mode: when the user switches exercises mid-generation,
    // instead of cancelling, we continue running but stop mutating shared UI refs.
    let bg = false
    let bgJob = null

    function enterBg(title) {
      if (bg) return
      bg = true
      // cancelGeneration() may have already created a placeholder for this seq
      const existing = backgroundJobs.value.find(j => j.seq === seq)
      if (existing) {
        bgJob = existing
        if (title) bgJob.title = title
      } else {
        bgJob = reactive({ seq, title: title || '', difficulty: difficultyGuess.value, status: generationStatus.value })
        backgroundJobs.value = [...backgroundJobs.value, bgJob]
      }
    }

    function removeBgJob() {
      backgroundJobs.value = backgroundJobs.value.filter(j => j.seq !== seq)
    }

    function setStatus(status) {
      if (!bg) generationStatus.value = status
      else if (bgJob) bgJob.status = status
    }

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
        categoryId: getCategoryId(),
        selectedProblems,
        businessField: businessField.value || null,
      })
      if (stale()) enterBg(draft.title)

      // Step 2 — review & fix examples
      setStatus('reviewing')
      const problem = await apiFetch('/api/review', { problem: draft })
      if (stale()) enterBg(problem.title)

      // Show reviewed problem; switch panel to generated view
      const problemSnapshot = { ...problem, unitTests: '', difficulty: difficultyGuess.value }
      if (!bg) {
        generatedProblem.value = problemSnapshot
        panelMode.value = 'generated'
        setEditorValue(problem.starterCode)
      } else if (bgJob) {
        bgJob.problem = problemSnapshot
      }

      // Step 3 — generate unit tests
      setStatus('writing tests')
      const { unitTests } = await apiFetch('/api/generate-tests', { problem })
      if (stale()) enterBg(problem.title)
      if (!bg) {
        generatedProblem.value = { ...problem, unitTests, difficulty: difficultyGuess.value, solutionCode: '', solutionExplanation: '' }
      } else if (bgJob) {
        bgJob.problem = { ...problem, unitTests, difficulty: difficultyGuess.value, solutionCode: '', solutionExplanation: '' }
      }

      // Step 4 — generate & verify optimal solution (diagnose + fix if tests fail)
      let solutionCode = ''
      let solutionExplanation = ''
      let currentTests = unitTests
      try {
        setStatus('solving')
        const problemText = `${problem.title}\n${problem.description}\n\nExamples:\n${problem.examples.map((e, i) => `${i + 1}. Input: ${e.input} → Output: ${e.output}`).join('\n')}\n\nConstraints:\n${problem.constraints.join('\n')}\n\nStarter code (exact method signature):\n${problem.starterCode}`

        const solution = await apiFetch('/api/generate-solution', {
          problem: problemText,
          unitTests: currentTests,
          starterCode: problem.starterCode,
          category: getCategoryName(),
        })
        if (stale()) enterBg(problem.title)
        solutionCode = solution.code
        solutionExplanation = solution.explanation

        // Verify solution passes unit tests via Pyodide
        if (runPython) {
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

          function checkResults(pyResult) {
            const line = (pyResult.stdout || '').split('\n').find(l => l.startsWith('__TEST_RESULTS__:'))
            if (!line) return { allPass: false, parsed: [] }
            try {
              const parsed = JSON.parse(line.slice('__TEST_RESULTS__:'.length))
              return { allPass: parsed.length > 0 && parsed.every(r => r.status === 'pass'), parsed }
            } catch { return { allPass: false, parsed: [] } }
          }

          function formatErrorOutput(pyResult) {
            const { parsed } = checkResults(pyResult)
            const parts = []
            if (pyResult.stderr) parts.push(`Runtime stderr:\n${pyResult.stderr}`)
            if (pyResult.error) parts.push(`Execution error:\n${pyResult.error}`)
            if (parsed.length) {
              const summary = parsed.map(r => {
                if (r.status === 'pass') return `  ✓ ${r.name}: PASS`
                return `  ✗ ${r.name}: ${r.status.toUpperCase()}\n    ${(r.message || '(no message)').split('\n').join('\n    ')}`
              }).join('\n')
              parts.push(`Test results:\n${summary}`)
            }
            if (!parts.length) parts.push((pyResult.stdout || '').slice(0, 500))
            return parts.join('\n\n').slice(0, 3000)
          }

          const MAX_DIAGNOSIS_ROUNDS = 3
          let prevDiagnoses = []

          for (let round = 0; round <= MAX_DIAGNOSIS_ROUNDS; round++) {
            if (stale()) enterBg(problem.title)
            setStatus('verifying')
            const testCode = stripMain(currentTests)
            const pyResult = await runPython(`${solutionCode}\n\n${testCode}\n${TEST_RUNNER}`)
            if (stale()) enterBg(problem.title)
            const { allPass } = checkResults(pyResult)

            if (allPass) {
              console.log(`[generate] verification passed (round ${round})`)
              break
            }

            if (round === MAX_DIAGNOSIS_ROUNDS) {
              console.warn(`[generate] still failing after ${MAX_DIAGNOSIS_ROUNDS} diagnosis rounds — saving best effort`)
              break
            }

            console.warn(`[generate] verification failed (round ${round}) — diagnosing`)
            setStatus('solving')
            const errorOutput = formatErrorOutput(pyResult)

            let diagnosisHint = ''
            if (prevDiagnoses.length) {
              diagnosisHint = '\n\nPrevious fix attempts that STILL FAILED:\n' +
                prevDiagnoses.map((d, i) => `Attempt ${i + 1}: blamed "${d.fault}" — ${d.reasoning}`).join('\n') +
                '\nDo NOT repeat the same fix. Try the other side or a different approach.'
            }

            let diagnosis
            try {
              diagnosis = await apiFetch('/api/diagnose-failure', {
                problem: problemText,
                solutionCode,
                unitTests: currentTests,
                testOutput: errorOutput + diagnosisHint,
                category: getCategoryName(),
              })
            } catch (diagErr) {
              console.warn(`[generate] diagnosis round ${round} failed: ${diagErr.message} — skipping`)
              continue
            }
            if (stale()) enterBg(problem.title)

            console.log(`[generate] diagnosis round ${round}: fault=${diagnosis.fault}, reasoning: ${diagnosis.reasoning.slice(0, 80)}`)
            prevDiagnoses.push({ fault: diagnosis.fault, reasoning: diagnosis.reasoning })

            if (diagnosis.fault === 'tests') {
              currentTests = diagnosis.fixedCode
              if (!bg) generatedProblem.value = { ...generatedProblem.value, unitTests: currentTests }
              else if (bgJob?.problem) bgJob.problem = { ...bgJob.problem, unitTests: currentTests }
            } else {
              solutionCode = diagnosis.fixedCode
              if (diagnosis.fixedExplanation) solutionExplanation = diagnosis.fixedExplanation
            }
          }
        }
      } catch (err) {
        console.warn('[generate] solution step failed:', err.message, '— continuing without solution')
      }

      if (stale()) enterBg(problem.title)
      if (!bg) {
        generatedProblem.value = { ...generatedProblem.value, unitTests: currentTests, solutionCode, solutionExplanation }
      } else if (bgJob) {
        bgJob.problem = { ...(bgJob.problem || problem), unitTests: currentTests, solutionCode, solutionExplanation }
      }

      // Persist to DB — always runs (foreground or background)
      setStatus('saving')
      console.log('[generate] saving to DB, user:', user.value?.id ?? '(not logged in)')
      const savedId = await persistGeneratedExercise(problem, currentTests, difficultyGuess.value, solutionCode, solutionExplanation)
      if (!bg && savedId) {
        generatedProblem.value = { ...generatedProblem.value, id: savedId }
        currentExerciseId.value = savedId
      }
      if (savedId) {
        dbSaveError.value = null
        await loadSavedExercises()
      } else if (!bg && user.value) {
        dbSaveError.value = 'Could not save — check browser console and ensure the DB migration has been applied in Supabase.'
      }
      removeBgJob()
    } catch (err) {
      if (!bg) {
        generationError.value = err.message
        panelMode.value = getSelectedExercise?.() ? 'exercise' : 'empty'
      }
      removeBgJob()
    } finally {
      if (!bg) {
        stopAnim()
        isGenerating.value = false
        generationStatus.value = ''
      }
    }
  }

  function cancelGeneration() {
    const cancelledSeq = _genSeq
    _genSeq++
    if (isGenerating.value) {
      // Generation is in flight — create a placeholder bgJob immediately
      // so the button stays disabled during the gap before generate() detects staleness.
      // Snapshot whatever problem data exists so far for preview.
      const placeholder = reactive({
        seq: cancelledSeq, title: '', difficulty: difficultyGuess.value, status: generationStatus.value,
        problem: generatedProblem.value ? { ...generatedProblem.value } : null,
      })
      backgroundJobs.value = [...backgroundJobs.value, placeholder]
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
    backgroundJobs,
    generate,
    cancelGeneration,
    startAnim,
    stopAnim,
  }
}
