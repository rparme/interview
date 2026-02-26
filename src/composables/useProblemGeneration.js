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

  const isGeneratingTests = computed(() => isGenerating.value && !!generatedProblem.value)

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
      generatedProblem.value = { ...problem, unitTests, difficulty: difficultyGuess.value }

      // Persist to DB and wire up autosave
      console.log('[generate] saving to DB, user:', user.value?.id ?? '(not logged in)')
      const savedId = await persistGeneratedExercise(problem, unitTests, difficultyGuess.value)
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
