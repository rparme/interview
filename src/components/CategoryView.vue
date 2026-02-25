<template>
  <div ref="rootEl" class="category-view">

    <!-- TOP BAR -->
    <div class="topbar">
      <button class="back-btn" @click="$emit('back')">
        <span aria-hidden="true">←</span> Back to map
      </button>
      <div class="cat-info">
        <div class="cat-dot" :style="{ background: category.color }" aria-hidden="true" />
        <h1 class="cat-title">{{ category.name }}</h1>
        <span class="cat-meta">{{ doneCnt }}/{{ totalCnt }}</span>
        <div class="progress-bar" role="progressbar" :aria-valuenow="pct" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-fill" :style="{ width: pct + '%', background: category.color }" />
        </div>
      </div>
    </div>

    <!-- MAIN 3-PANE -->
    <div class="main">

      <!-- LEFT: problem list sidebar -->
      <div class="problems-sidebar">
        <!-- Legend -->
        <div class="sidebar-legend">
          <span class="legend-item">
            <span class="legend-ai-icon">✦</span> AI context
          </span>
          <span class="legend-item">
            <span class="legend-done-icon">○</span> Done
          </span>
        </div>

        <div
          v-for="problem in sortedProblems"
          :key="problem.lc"
          class="problem-item"
          :class="{
            done: problem.done,
            checked: selectedForAI.has(problem.lc),
            'is-viewing': selectedExercise?.lc === problem.lc,
          }"
          :style="selectedForAI.has(problem.lc) ? { borderLeftColor: '#a371f7' } : {}"
          tabindex="0"
          role="button"
          :aria-label="problem.title"
          @click="selectExercise(problem)"
          @keydown.enter="selectExercise(problem)"
        >
          <div class="item-top">
            <!-- AI context toggle (square, purple) — click stops propagation -->
            <div
              class="item-ai-check"
              :class="{ active: selectedForAI.has(problem.lc) }"
              title="Add as AI context"
              @click.stop="toggleAISelect(problem)"
            >
              <span aria-hidden="true">✦</span>
            </div>

            <span class="badge" :class="`badge-${problem.difficulty}`">{{ problem.difficulty }}</span>

            <!-- Done toggle (circle, green) -->
            <button
              class="done-toggle"
              :class="{ 'is-done': problem.done }"
              :aria-label="problem.done ? 'Mark as not done' : 'Mark as done'"
              title="Mark as done"
              @click.stop="$emit('toggle-done', problem.lc)"
            >
              <span aria-hidden="true">{{ problem.done ? '✓' : '' }}</span>
            </button>
          </div>
          <div class="item-title-row">
            <span class="item-title">{{ problem.title }}</span>
            <button
              class="item-open-btn"
              title="View details"
              :aria-label="`Open details for ${problem.title}`"
              @click.stop="openExercise(problem)"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- CENTER: editor -->
      <div class="editor-area">

        <!-- Generator bar -->
        <div class="generator-bar">
          <div class="gen-chips">
            <span
              v-for="lc in selectedForAI"
              :key="lc"
              class="gen-chip"
              :style="{ borderColor: category.color + '60', color: category.color }"
            >
              {{ problemByLc(lc)?.title }}
              <button class="chip-remove" @click="selectedForAI.delete(lc)" aria-label="Remove">✕</button>
            </span>
            <span v-if="!selectedForAI.size" class="gen-hint">
              Optionally check problems as context →
            </span>
          </div>
          <div class="gen-controls">
            <select v-model="businessField" class="business-select">
              <option value="">No theme</option>
              <option v-for="field in BUSINESS_FIELDS" :key="field" :value="field">{{ field }}</option>
            </select>
            <button
              class="generate-btn"
              :class="{ 'is-loading': isGenerating }"
              :style="!isGenerating ? { borderColor: category.color + '80', color: category.color } : {}"
              :disabled="isGenerating"
              @click="generate"
            >
              <span class="gen-prompt" aria-hidden="true">&gt;_</span>
              <span v-if="isGenerating">{{ generationStatus }}<span class="anim-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></span>
              <span v-else>generate</span>
            </button>
          </div>
        </div>

        <div v-if="generationError" class="gen-error">
          {{ generationError }}
        </div>

        <!-- Monaco toolbar -->
        <div class="editor-toolbar">
          <span class="editor-lang">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="opacity:0.6"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            Python 3
          </span>
          <div class="toolbar-actions">
            <span v-if="!workerReady" class="loading-py">
              <span class="spinner" aria-hidden="true" />
              Loading Python…
            </span>
            <button
              class="run-btn"
              :class="{ 'is-ready': workerReady && !isRunning }"
              :style="workerReady && !isRunning ? { borderColor: category.color + '70', color: category.color } : {}"
              :disabled="!workerReady || isRunning"
              :title="workerReady ? 'Run (Ctrl+Enter)' : 'Waiting for Python…'"
              @click="runCode"
            >
              <span aria-hidden="true">{{ isRunning ? '⟳' : '▶' }}</span>
              {{ isRunning ? 'Running…' : 'Run' }}
            </button>
          </div>
        </div>

        <div v-if="editorError" class="editor-error">{{ editorError }}</div>
        <div ref="editorEl" class="editor-container" :style="editorError ? { display: 'none' } : {}" />

        <div class="output-pane">
          <div class="output-header">
            <span>Output</span>
            <button v-if="output" class="clear-btn" @click="output = ''; hasError = false">Clear</button>
          </div>
          <pre class="output-content" :class="{ 'has-error': hasError }">{{ outputDisplay }}</pre>
        </div>

      </div>

      <!-- RIGHT: detail panel (resizable) -->
      <div class="problem-panel" :style="{ width: panelWidth + 'px' }">
        <div class="resize-handle" @mousedown.prevent="onResizeStart" />

        <!-- ── Mode: generating problem (step 1) ── -->
        <div v-if="panelMode === 'loading'" class="panel-loading">
          <pre class="panel-anim-code" aria-hidden="true">{{ panelAnimText }}</pre>
          <span class="panel-anim-status">{{ generationStatus }}<span class="anim-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></span>
        </div>

        <!-- ── Mode: generated AI problem ── -->
        <template v-else-if="panelMode === 'generated' && generatedProblem">
          <div class="panel-topbar">
            <span class="panel-badge" :class="`badge-${difficultyGuess}`">{{ difficultyGuess }}</span>
            <h2 class="panel-title">{{ generatedProblem.title }}</h2>
          </div>

          <div class="panel-body">
            <div class="panel-description md-body" v-html="descriptionHtml" />

            <section class="panel-section">
              <h3 class="section-label">Examples</h3>
              <div v-for="(ex, i) in generatedProblem.examples" :key="i" class="example-block">
                <div class="example-io">
                  <span class="ex-key">In</span><code class="ex-val">{{ ex.input }}</code>
                  <span class="ex-arrow">→</span>
                  <span class="ex-key">Out</span><code class="ex-val">{{ ex.output }}</code>
                </div>
                <div v-if="ex.explanation" class="ex-explanation">{{ ex.explanation }}</div>
              </div>
            </section>

            <section class="panel-section">
              <h3 class="section-label">Constraints</h3>
              <ul class="constraint-list">
                <li v-for="(c, i) in generatedProblem.constraints" :key="i">{{ c }}</li>
              </ul>
            </section>

            <!-- Unit tests with loader while generating -->
            <section class="panel-section">
              <div class="section-label-row">
                <h3 class="section-label">Unit Tests</h3>
                <div class="tests-header-right">
                  <span v-if="isGeneratingTests" class="tests-status">
                    writing tests<span class="anim-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>
                  </span>
                  <template v-else-if="generatedProblem.unitTests">
                    <span v-if="allTestsPassing && testResults.length" class="tests-summary tests-all-pass">All passing</span>
                    <span v-else-if="testResults.length && !allTestsPassing" class="tests-summary tests-some-fail">
                      {{ testResults.filter(r => r.status !== 'pass').length }} failing
                    </span>
                    <button class="toggle-tests-btn" @click="showTests = !showTests">
                      {{ showTests ? 'Hide code' : 'Show code' }}
                    </button>
                  </template>
                </div>
              </div>

              <!-- Named test list -->
              <div v-if="!isGeneratingTests && parsedTestNames.length" class="test-list">
                <div
                  v-for="name in parsedTestNames"
                  :key="name"
                  class="test-item"
                  :class="{
                    'test-pass': testResultFor(name)?.status === 'pass',
                    'test-fail': testResultFor(name)?.status === 'fail' || testResultFor(name)?.status === 'error',
                    'is-expanded': expandedTest === name,
                  }"
                  @click="toggleTestExpand(name)"
                >
                  <div class="test-item-main">
                    <span class="test-status-icon">
                      <span v-if="isRunning" class="spinner spinner-xs" />
                      <span v-else-if="testResultFor(name)?.status === 'pass'" class="icon-pass">✓</span>
                      <span v-else-if="testResultFor(name)?.status === 'fail' || testResultFor(name)?.status === 'error'" class="icon-fail">✗</span>
                      <span v-else class="icon-pending">○</span>
                    </span>
                    <span class="test-name">{{ formatTestName(name) }}</span>
                    <span class="test-expand-icon" aria-hidden="true">{{ expandedTest === name ? '▾' : '▸' }}</span>
                  </div>
                  <pre v-if="expandedTest === name && testSourceFor(name)" class="test-source">{{ testSourceFor(name) }}</pre>
                  <p v-if="testResultFor(name)?.message" class="test-error-msg">{{ testResultFor(name).message }}</p>
                </div>
              </div>

              <div v-if="isGeneratingTests" class="tests-loading-row">
                <span class="spinner" aria-hidden="true" />
              </div>
              <pre v-else-if="showTests && generatedProblem.unitTests" class="tests-preview">{{ generatedProblem.unitTests }}</pre>
            </section>
          </div>
        </template>

        <!-- ── Mode: predefined exercise details ── -->
        <template v-else-if="panelMode === 'exercise' && selectedExercise">
          <div class="panel-topbar">
            <span class="panel-badge" :class="`badge-${selectedExercise.difficulty}`">{{ selectedExercise.difficulty }}</span>
            <h2 class="panel-title">{{ selectedExercise.title }}</h2>
          </div>

          <div class="panel-body">
            <a
              v-if="selectedExercise.url"
              :href="selectedExercise.url"
              target="_blank"
              rel="noopener"
              class="platform-link lc-link"
            >
              <!-- LeetCode icon -->
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z"/></svg>
              Open on LeetCode
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="link-arrow"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>

            <section v-if="selectedExercise.whenTo" class="panel-section">
              <h3 class="section-label">When to use</h3>
              <div class="hint-block">
                <p class="hint-text">{{ selectedExercise.whenTo }}</p>
              </div>
            </section>

            <section v-if="selectedExercise.howTo" class="panel-section">
              <h3 class="section-label">How to approach</h3>
              <div class="hint-block">
                <p class="hint-text">{{ selectedExercise.howTo }}</p>
              </div>
            </section>

            <div v-if="!selectedExercise.whenTo && !selectedExercise.howTo" class="detail-empty">
              No hints available for this exercise.
            </div>
          </div>
        </template>

        <!-- ── Mode: empty ── -->
        <div v-else class="panel-empty">
          <div class="empty-icon">✨</div>
          <p>Click an exercise to view details</p>
          <p class="empty-sub">Or generate an AI problem using the bar above the editor.</p>
        </div>
      </div>

    </div>
  </div>

  <!-- ── Exercise popup ── -->
  <Teleport to="body">
    <Transition name="popup">
      <div v-if="popupProblem" class="popup-backdrop" @click.self="closePopup">
        <div class="popup-card" role="dialog" aria-modal="true" :aria-label="popupProblem.title">

          <!-- Header -->
          <div class="popup-header">
            <span class="panel-badge" :class="`badge-${popupProblem.difficulty}`">{{ popupProblem.difficulty }}</span>
            <h2 class="popup-title">{{ popupProblem.title }}</h2>
            <button class="popup-close" aria-label="Close" @click="closePopup">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <!-- Body -->
          <div class="popup-body">
            <a
              v-if="popupProblem.url"
              :href="popupProblem.url"
              target="_blank"
              rel="noopener"
              class="platform-link lc-link"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z"/></svg>
              Open on LeetCode
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="link-arrow"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>

            <section v-if="popupProblem.whenTo" class="popup-section">
              <h3 class="section-label">When to use</h3>
              <div class="hint-block">
                <p class="hint-text">{{ popupProblem.whenTo }}</p>
              </div>
            </section>

            <section v-if="popupProblem.howTo" class="popup-section">
              <h3 class="section-label">How to approach</h3>
              <div class="hint-block">
                <p class="hint-text">{{ popupProblem.howTo }}</p>
              </div>
            </section>

            <div v-if="!popupProblem.whenTo && !popupProblem.howTo" class="detail-empty">
              No hints available for this exercise.
            </div>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, reactive } from 'vue'
import loader from '@monaco-editor/loader'
import { marked } from 'marked'

marked.use({ breaks: true, gfm: true })

const props = defineProps({
  category: { type: Object, required: true },
})

defineEmits(['back', 'toggle-done'])

// ── Problem list ──────────────────────────────────────────────────────────────

const DIFFICULTY_ORDER = { Easy: 0, Medium: 1, Hard: 2 }
const sortedProblems = computed(() =>
  [...props.category.problems].sort(
    (a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]
  )
)

const doneCnt  = computed(() => props.category.problems.filter(p => p.done).length)
const totalCnt = computed(() => props.category.problems.length)
const pct      = computed(() => Math.round((doneCnt.value / totalCnt.value) * 100))

function problemByLc(lc) {
  return props.category.problems.find(p => p.lc === lc)
}

// ── AI context selection ──────────────────────────────────────────────────────

const selectedForAI = reactive(new Set())

function toggleAISelect(problem) {
  if (selectedForAI.has(problem.lc)) {
    selectedForAI.delete(problem.lc)
  } else {
    selectedForAI.add(problem.lc)
  }
}

// ── Exercise detail view ───────────────────────────────────────────────────────

const selectedExercise = ref(null)
const panelMode = ref('empty') // 'empty' | 'exercise' | 'loading' | 'generated'

function selectExercise(problem) {
  selectedExercise.value = problem
  // Only switch to exercise view if we're not showing a generated problem
  if (panelMode.value !== 'generated') {
    panelMode.value = 'exercise'
  }
}

// ── Exercise popup ─────────────────────────────────────────────────────────────

const popupProblem = ref(null)

function openExercise(problem) {
  popupProblem.value = problem
}

function closePopup() {
  popupProblem.value = null
}

function onPopupKey(e) {
  if (e.key === 'Escape') closePopup()
}

watch(popupProblem, (val) => {
  if (val) document.addEventListener('keydown', onPopupKey)
  else     document.removeEventListener('keydown', onPopupKey)
})

// ── Generator ─────────────────────────────────────────────────────────────────

const BUSINESS_FIELDS = [
  'Finance & Banking',
  'Healthcare',
  'E-commerce',
  'Social Media',
  'Logistics & Supply Chain',
  'Gaming',
  'EdTech',
  'Cybersecurity',
  'Real Estate',
  'Travel & Hospitality',
  'HR & Recruiting',
  'Food Delivery',
]

const businessField     = ref('')
const generatedProblem  = ref(null)
const isGenerating      = ref(false)
const generationStatus  = ref('')
const generationError   = ref(null)
const showTests         = ref(false)

const descriptionHtml = computed(() =>
  generatedProblem.value ? marked.parse(generatedProblem.value.description) : ''
)

// True during step 2: problem exists but tests are still being generated
const isGeneratingTests = computed(() => isGenerating.value && !!generatedProblem.value)

// ── ASCII typewriter animation ─────────────────────────────────────────────────

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

// Auto-show tests as soon as they arrive
watch(() => generatedProblem.value?.unitTests, (tests) => {
  if (tests) showTests.value = true
})

const difficultyGuess = computed(() => {
  if (!generatedProblem.value) return 'Medium'
  const selected = [...selectedForAI].map(lc => problemByLc(lc)).filter(Boolean)
  if (!selected.length) return 'Medium'
  const counts = { Easy: 0, Medium: 0, Hard: 0 }
  selected.forEach(p => counts[p.difficulty]++)
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
})

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
  isGenerating.value = true
  generationError.value = null
  generatedProblem.value = null
  showTests.value = false
  panelMode.value = 'loading'
  startAnim()

  const selectedProblems = [...selectedForAI]
    .map(lc => problemByLc(lc))
    .filter(Boolean)
    .map(({ title, difficulty }) => ({ title, difficulty }))

  try {
    // Step 1 — generate problem draft
    generationStatus.value = 'generating'
    const draft = await apiFetch('/api/generate', {
      category: props.category.name,
      selectedProblems,
      businessField: businessField.value || null,
    })

    // Step 2 — review & fix examples
    generationStatus.value = 'reviewing'
    const problem = await apiFetch('/api/review', { problem: draft })

    // Show reviewed problem; switch panel to generated view
    generatedProblem.value = { ...problem, unitTests: '' }
    panelMode.value = 'generated'
    if (editorInstance) editorInstance.setValue(problem.starterCode)

    // Step 3 — generate unit tests
    generationStatus.value = 'writing tests'
    const { unitTests } = await apiFetch('/api/generate-tests', { problem })
    generatedProblem.value = { ...problem, unitTests }
  } catch (err) {
    generationError.value = err.message
    panelMode.value = selectedExercise.value ? 'exercise' : 'empty'
  } finally {
    stopAnim()
    isGenerating.value = false
    generationStatus.value = ''
  }
}

// ── Monaco editor ─────────────────────────────────────────────────────────────

const editorEl = ref(null)
const editorError = ref(null)
let editorInstance = null
let monacoRef = null

const PLACEHOLDER = '# Generate a problem above to start coding\n'

async function initEditor() {
  console.log('[editor] initEditor called, el:', editorEl.value)
  if (!editorEl.value) {
    console.error('[editor] editorEl not in DOM yet')
    return
  }

  try {
    if (!monacoRef) {
      console.log('[editor] loading Monaco from CDN…')
      monacoRef = await loader.init()
      console.log('[editor] Monaco loaded OK')
      monacoRef.editor.defineTheme('github-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
          { token: 'keyword', foreground: 'ff7b72' },
          { token: 'string', foreground: 'a5d6ff' },
          { token: 'number', foreground: '79c0ff' },
          { token: 'type', foreground: 'ffa657' },
        ],
        colors: {
          'editor.background': '#0d1117',
          'editor.foreground': '#e6edf3',
          'editor.lineHighlightBackground': '#161b2280',
          'editorLineNumber.foreground': '#3d444d',
          'editorLineNumber.activeForeground': '#6e7681',
          'editor.selectionBackground': '#264f7880',
          'editorCursor.foreground': '#e6edf3',
          'editorIndentGuide.background1': '#21262d',
          'editorIndentGuide.activeBackground1': '#30363d',
        },
      })
    }

    if (!editorEl.value) {
      console.error('[editor] editorEl disappeared after loader.init()')
      return
    }

    const rect = editorEl.value.getBoundingClientRect()
    console.log('[editor] container rect:', rect.width, 'x', rect.height)

    editorInstance = monacoRef.editor.create(editorEl.value, {
      value: generatedProblem.value?.starterCode ?? PLACEHOLDER,
      language: 'python',
      theme: 'github-dark',
      fontSize: 13.5,
      fontFamily: "'Fira Code', 'Cascadia Code', 'SF Mono', monospace",
      fontLigatures: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      lineNumbers: 'on',
      renderLineHighlight: 'line',
      padding: { top: 14, bottom: 14 },
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      renderWhitespace: 'none',
      scrollbar: { vertical: 'auto', horizontal: 'auto' },
      tabSize: 4,
      insertSpaces: true,
    })
    console.log('[editor] editor instance created OK')

    // Diagnostics — reveal CSS or focus issues
    const cs = window.getComputedStyle(editorEl.value)
    console.log('[editor] container pointer-events:', cs.pointerEvents)
    console.log('[editor] container user-select:', cs.userSelect)
    console.log('[editor] .is-resizing stuck:', rootEl.value?.classList.contains('is-resizing'))
    console.log('[editor] readOnly option:', editorInstance.getRawOptions().readOnly)

    editorInstance.focus()

    editorInstance.addAction({
      id: 'run-python',
      label: 'Run Python',
      keybindings: [monacoRef.KeyMod.CtrlCmd | monacoRef.KeyCode.Enter],
      run: () => runCode(),
    })
  } catch (err) {
    console.error('[editor] initialization failed:', err)
    editorError.value = `Editor failed to load: ${err.message}`
  }
}

function destroyEditor() {
  if (editorInstance) {
    editorInstance.dispose()
    editorInstance = null
  }
}

// ── Pyodide worker (module singleton) ────────────────────────────────────────

let _worker = null
const _callbacks = new Map()
let _nextId = 0

const workerReady = ref(false)

function ensureWorker() {
  if (_worker) return
  _worker = new Worker('/pyodide.worker.js')
  _worker.onmessage = ({ data }) => {
    if (data.type === 'ready') {
      console.log('[pyodide worker] ready')
      workerReady.value = true
    } else if (data.type === 'init-error') {
      console.error('[pyodide worker] init failed:', data.message)
    } else if (data.type === 'result') {
      const resolve = _callbacks.get(data.id)
      if (resolve) {
        resolve(data)
        _callbacks.delete(data.id)
      }
    }
  }
  _worker.onerror = (err) => console.error('[pyodide worker] error:', err.message, err)
}

function runPython(code) {
  return new Promise((resolve) => {
    const id = ++_nextId
    _callbacks.set(id, resolve)
    _worker.postMessage({ id, code })
  })
}

// ── Run code ──────────────────────────────────────────────────────────────────

const output   = ref('')
const hasError = ref(false)
const isRunning = ref(false)
const testResults = ref([]) // [{name, status, message?}]

const outputDisplay = computed(() =>
  output.value || '# Click "Run" or press Ctrl+Enter to execute'
)

// Extract test method names from raw unittest code for pre-run display
const parsedTestNames = computed(() => {
  const raw = generatedProblem.value?.unitTests ?? ''
  return [...raw.matchAll(/def (test_\w+)\(/g)].map(m => m[1])
})

const allTestsPassing = computed(() =>
  testResults.value.length > 0 && testResults.value.every(r => r.status === 'pass')
)

function testResultFor(name) {
  return testResults.value.find(r => r.name === name)
}

function formatTestName(name) {
  return name.replace(/^test_?/, '').replace(/_/g, ' ') || name
}

const expandedTest = ref(null)

function toggleTestExpand(name) {
  expandedTest.value = expandedTest.value === name ? null : name
}

// Extract the body of a single test method from the raw test code
function testSourceFor(name) {
  const raw = generatedProblem.value?.unitTests ?? ''
  const lines = raw.split('\n')
  const startIdx = lines.findIndex(l => new RegExp(`^\\s*def\\s+${name}\\s*\\(`).test(l))
  if (startIdx === -1) return null
  const methodIndent = lines[startIdx].match(/^(\s*)/)[1].length
  const bodyLines = []
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trimStart()
    if (!trimmed) { bodyLines.push(''); continue }
    const lineIndent = line.length - trimmed.length
    if (lineIndent <= methodIndent && (trimmed.startsWith('def ') || trimmed.startsWith('class '))) break
    // Strip one extra level of indentation so the body starts at column 0
    const bodyIndent = methodIndent + 4
    bodyLines.push(line.length >= bodyIndent ? line.slice(bodyIndent) : trimmed)
  }
  // Drop trailing blank lines
  while (bodyLines.length && !bodyLines[bodyLines.length - 1].trim()) bodyLines.pop()
  return bodyLines.join('\n')
}

// Custom Python reporter injected at runtime — outputs a single JSON line
const TEST_RUNNER = `
import json as _json, unittest as _unittest
class _C(_unittest.TestResult):
    def __init__(self):
        super().__init__(); self._r = []
    def addSuccess(self, t):
        self._r.append({'name': t._testMethodName, 'status': 'pass'})
    def addFailure(self, t, err):
        self._r.append({'name': t._testMethodName, 'status': 'fail', 'message': str(err[1])})
    def addError(self, t, err):
        self._r.append({'name': t._testMethodName, 'status': 'error', 'message': str(err[1])})
_s = _unittest.TestLoader().loadTestsFromTestCase(TestSolution)
_c = _C(); _s.run(_c)
print('__TEST_RESULTS__:' + _json.dumps(_c._r))
`

async function runCode() {
  if (!editorInstance || !workerReady.value || isRunning.value) return

  isRunning.value = true
  hasError.value = false
  output.value = ''
  testResults.value = []

  const userCode = editorInstance.getValue()
  const rawTests = generatedProblem.value?.unitTests ?? ''

  let code
  if (rawTests) {
    // Strip the `if __name__ == '__main__'` block so our runner controls execution
    const lines = rawTests.split('\n')
    const mainIdx = lines.findIndex(l => l.trimStart().startsWith('if __name__'))
    const testCode = (mainIdx >= 0 ? lines.slice(0, mainIdx) : lines).join('\n')
    code = `${userCode}\n\n${testCode}\n${TEST_RUNNER}`
  } else {
    code = userCode
  }

  try {
    const { stdout, stderr, error } = await runPython(code)

    if (rawTests && stdout.includes('__TEST_RESULTS__:')) {
      // Parse structured test results
      const lines = stdout.split('\n')
      const resultsLine = lines.find(l => l.startsWith('__TEST_RESULTS__:'))
      try { testResults.value = JSON.parse(resultsLine.slice('__TEST_RESULTS__:'.length)) } catch {}
      // Show remaining stdout (user print statements)
      const cleanOut = lines.filter(l => !l.startsWith('__TEST_RESULTS__:')).join('\n').trimEnd()
      output.value = cleanOut
      if (stderr) { output.value += (output.value ? '\n' : '') + stderr; hasError.value = true }
      if (error)  { output.value += (output.value ? '\n' : '') + error;  hasError.value = true }
    } else {
      let text = ''
      if (stdout) text += stdout
      if (stderr) { text += stderr; hasError.value = true }
      if (error)  { text += (text ? '\n' : '') + error; hasError.value = true }
      output.value = text.trimEnd()
    }
  } catch (e) {
    output.value = String(e)
    hasError.value = true
  } finally {
    isRunning.value = false
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

// ── Panel resize ──────────────────────────────────────────────────────────────

const panelWidth = ref(320)

let isResizing = false
let resizeStartX = 0
let resizeStartWidth = 0

const rootEl = ref(null)

function onResizeStart(e) {
  isResizing = true
  resizeStartX = e.clientX
  resizeStartWidth = panelWidth.value
  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
  // Apply no-select class to the view root only — avoids touching body.style
  // which can leak into Monaco's contenteditable and block typing.
  rootEl.value?.classList.add('is-resizing')
}

function onResizeMove(e) {
  if (!isResizing) return
  const delta = resizeStartX - e.clientX
  panelWidth.value = Math.max(220, Math.min(680, resizeStartWidth + delta))
}

function onResizeEnd() {
  isResizing = false
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
  rootEl.value?.classList.remove('is-resizing')
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

ensureWorker()

onMounted(() => initEditor())

onBeforeUnmount(() => {
  stopAnim()
  destroyEditor()
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
})
</script>

<style scoped>
/* ── Layout ── */
.category-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #0d1117;
  color: #e6edf3;
}
/* Applied during panel resize to prevent text-selection leaking into Monaco */
.category-view.is-resizing { cursor: col-resize; user-select: none; }
.category-view.is-resizing .editor-container { pointer-events: none; }

/* ── Top bar ── */
.topbar {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0 1.25rem;
  height: 50px;
  flex-shrink: 0;
  border-bottom: 1px solid #21262d;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: none;
  border: 1px solid #30363d;
  color: #8b949e;
  padding: 0.3rem 0.8rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.8rem;
  font-family: inherit;
  flex-shrink: 0;
  transition: border-color 0.15s, color 0.15s;
}
.back-btn:hover { border-color: #58a6ff; color: #58a6ff; }

.cat-info { display: flex; align-items: center; gap: 0.65rem; min-width: 0; }

.cat-dot { width: 11px; height: 11px; border-radius: 50%; flex-shrink: 0; }

.cat-title {
  font-size: 0.95rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cat-meta { color: #6e7681; font-size: 0.75rem; white-space: nowrap; }

.progress-bar {
  width: 100px;
  height: 3px;
  background: #21262d;
  border-radius: 2px;
  overflow: hidden;
  flex-shrink: 0;
}
.progress-fill { height: 100%; border-radius: 2px; transition: width 0.5s ease; }

/* ── Main 3-pane ── */
.main { flex: 1; display: flex; overflow: hidden; min-height: 0; }

/* ── Left sidebar ── */
.problems-sidebar {
  width: 220px;
  flex-shrink: 0;
  overflow-y: auto;
  border-right: 1px solid #21262d;
  display: flex;
  flex-direction: column;
  scrollbar-width: thin;
  scrollbar-color: #30363d transparent;
}

.sidebar-legend {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.45rem 0.9rem;
  border-bottom: 1px solid #161b22;
  flex-shrink: 0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.63rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #3d444d;
}

.legend-ai-icon {
  font-size: 0.65rem;
  color: #a371f7;
  opacity: 0.7;
}

.legend-done-icon {
  font-size: 0.75rem;
  color: #3fb950;
  opacity: 0.7;
}

.problem-item {
  padding: 0.65rem 0.9rem;
  border-left: 3px solid transparent;
  cursor: pointer;
  border-bottom: 1px solid #0d1117;
  transition: background 0.12s, border-left-color 0.12s;
  user-select: none;
}
.problem-item:hover { background: #161b22; }
.problem-item:focus-visible { outline: 2px solid #58a6ff; outline-offset: -2px; }
.problem-item.done { opacity: 0.55; }
.problem-item.checked { background: #161b22; }

.item-top { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.3rem; }

/* Done toggle — circle, green */
.done-toggle {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1.5px solid #30363d;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.55rem;
  color: #fff;
  padding: 0;
  margin-left: auto;
  flex-shrink: 0;
  transition: border-color 0.12s, background 0.12s;
}
.done-toggle:hover:not(.is-done) { border-color: #3fb950; }
.done-toggle.is-done { background: #3fb950; border-color: #3fb950; }

/* AI context checkbox — square, purple */
.item-ai-check {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1.5px dashed #3d444d;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.55rem;
  color: transparent;
  flex-shrink: 0;
  transition: border-color 0.12s, background 0.12s, color 0.12s;
}
.item-ai-check.active {
  border: 1.5px solid #a371f7;
  background: rgba(163, 113, 247, 0.15);
  color: #a371f7;
}
.problem-item:hover .item-ai-check:not(.active) {
  border-color: #a371f7;
  border-style: solid;
  color: rgba(163, 113, 247, 0.4);
}

.badge {
  font-size: 0.6rem;
  font-weight: 600;
  padding: 0.08rem 0.38rem;
  border-radius: 999px;
  letter-spacing: 0.02em;
}
.badge-Easy   { background: rgba(63,185,80,0.15);  color: #3fb950; }
.badge-Medium { background: rgba(210,153,34,0.15); color: #d29922; }
.badge-Hard   { background: rgba(248,81,73,0.15);  color: #f85149; }

.item-title-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.3rem;
}

.item-title { font-size: 0.8rem; font-weight: 500; line-height: 1.35; color: #c9d1d9; flex: 1; min-width: 0; }

.item-open-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 0.1rem 0.2rem;
  color: #3d444d;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, color 0.15s, border-color 0.15s;
}
.problem-item:hover .item-open-btn { opacity: 1; }
.item-open-btn:hover { color: #58a6ff; border-color: #30363d; }
.problem-item.is-viewing .item-open-btn { opacity: 1; color: #58a6ff; }

/* ── Center: editor area ── */
.editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* Generator bar */
.generator-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 1rem;
  border-bottom: 1px solid #21262d;
  background: #0d1117;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.gen-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.gen-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.18rem 0.5rem 0.18rem 0.6rem;
  border: 1px solid;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 500;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-remove {
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  opacity: 0.6;
  font-size: 0.65rem;
  padding: 0;
  line-height: 1;
  flex-shrink: 0;
}
.chip-remove:hover { opacity: 1; }

.gen-hint { font-size: 0.75rem; color: #3d444d; font-style: italic; }

.gen-controls { display: flex; align-items: center; gap: 0.6rem; flex-shrink: 0; }

.business-select {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #8b949e;
  font-size: 0.78rem;
  font-family: inherit;
  padding: 0.28rem 0.6rem;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s;
}
.business-select:hover, .business-select:focus { border-color: #58a6ff; color: #c9d1d9; }

.generate-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.28rem 0.85rem 0.28rem 0.7rem;
  background: none;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #6e7681;
  font-size: 0.78rem;
  font-weight: 500;
  font-family: 'Fira Code', 'SF Mono', monospace;
  cursor: pointer;
  white-space: nowrap;
  letter-spacing: 0.01em;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.generate-btn:not(:disabled):hover { background: #161b22; }
.generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.generate-btn.is-loading { color: #6e7681; border-color: #30363d; }

.gen-prompt {
  font-family: 'Fira Code', 'SF Mono', monospace;
  font-size: 0.68rem;
  letter-spacing: -0.04em;
  opacity: 0.75;
}

.anim-dots {
  display: inline-flex;
  font-family: 'Fira Code', 'SF Mono', monospace;
}
.anim-dots span { opacity: 0.15; animation: dot-pulse 1.2s ease-in-out infinite; }
.anim-dots span:nth-child(2) { animation-delay: 0.3s; }
.anim-dots span:nth-child(3) { animation-delay: 0.6s; }
@keyframes dot-pulse {
  0%, 100% { opacity: 0.15; }
  50%       { opacity: 1; }
}

.gen-error {
  padding: 0.45rem 1rem;
  font-size: 0.78rem;
  color: #f85149;
  background: rgba(248,81,73,0.08);
  border-bottom: 1px solid rgba(248,81,73,0.2);
  flex-shrink: 0;
}

/* Monaco toolbar */
.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  height: 36px;
  background: #161b22;
  border-bottom: 1px solid #21262d;
  flex-shrink: 0;
}

.editor-lang {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.73rem;
  font-weight: 600;
  color: #6e7681;
  letter-spacing: 0.02em;
}

.toolbar-actions { display: flex; align-items: center; gap: 0.65rem; }

.loading-py { display: flex; align-items: center; gap: 0.4rem; font-size: 0.73rem; color: #6e7681; }

.spinner {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 1.5px solid #30363d;
  border-top-color: #58a6ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.run-btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.7rem;
  background: none;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #6e7681;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.run-btn.is-ready:hover { background: #161b22; }
.run-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.editor-container { flex: 1; overflow: hidden; min-height: 0; }

.editor-error {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.82rem;
  color: #f85149;
  background: rgba(248,81,73,0.06);
  padding: 1rem;
  text-align: center;
}

/* Output */
.output-pane {
  height: 170px;
  flex-shrink: 0;
  border-top: 1px solid #21262d;
  display: flex;
  flex-direction: column;
}

.output-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  height: 28px;
  background: #161b22;
  border-bottom: 1px solid #21262d;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #6e7681;
  flex-shrink: 0;
}

.clear-btn {
  background: none;
  border: none;
  color: #6e7681;
  font-size: 0.65rem;
  cursor: pointer;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  font-family: inherit;
  transition: color 0.15s;
}
.clear-btn:hover { color: #c9d1d9; }

.output-content {
  flex: 1;
  overflow-y: auto;
  padding: 0.6rem 1rem;
  margin: 0;
  font-family: 'Fira Code', 'SF Mono', 'Cascadia Code', monospace;
  font-size: 0.78rem;
  line-height: 1.65;
  color: #8b949e;
  background: #0d1117;
  white-space: pre-wrap;
  word-break: break-word;
  scrollbar-width: thin;
  scrollbar-color: #30363d transparent;
}
.output-content.has-error { color: #f85149; }

/* ── Right: generated problem panel ── */
.problem-panel {
  /* width is set via inline style (panelWidth ref) */
  flex-shrink: 0;
  position: relative;
  border-left: 1px solid #21262d;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  cursor: col-resize;
  z-index: 10;
  transition: background 0.15s;
}
.resize-handle:hover,
.resize-handle:active {
  background: rgba(88, 166, 255, 0.25);
}

.panel-topbar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #21262d;
  flex-shrink: 0;
}

.panel-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: #e6edf3;
  line-height: 1.3;
}

.panel-badge {
  font-size: 0.62rem;
  font-weight: 600;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  flex-shrink: 0;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  scrollbar-width: thin;
  scrollbar-color: #30363d transparent;
}

.panel-description { margin: 0; }

/* Markdown body styles (scoped under .md-body) */
.md-body { font-size: 0.84rem; line-height: 1.7; color: #c9d1d9; }
.md-body :deep(p) { margin: 0 0 0.6em; }
.md-body :deep(p:last-child) { margin-bottom: 0; }
.md-body :deep(strong) { color: #e6edf3; font-weight: 600; }
.md-body :deep(code) {
  font-family: 'Fira Code', 'SF Mono', monospace;
  font-size: 0.78rem;
  background: #21262d;
  color: #a5d6ff;
  padding: 0.1em 0.35em;
  border-radius: 4px;
}

.panel-section { display: flex; flex-direction: column; gap: 0.55rem; }

.section-label {
  font-size: 0.67rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #6e7681;
}

.section-label-row { display: flex; align-items: center; justify-content: space-between; }

.toggle-tests-btn {
  background: none;
  border: 1px solid #30363d;
  border-radius: 4px;
  color: #6e7681;
  font-size: 0.65rem;
  font-family: inherit;
  padding: 0.1rem 0.4rem;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.toggle-tests-btn:hover { color: #c9d1d9; border-color: #58a6ff; }

.example-block {
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 6px;
  padding: 0.6rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.example-io {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.ex-key {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6e7681;
  flex-shrink: 0;
}

.ex-val {
  font-family: 'Fira Code', 'SF Mono', monospace;
  font-size: 0.78rem;
  color: #a5d6ff;
  background: #21262d;
  padding: 0.1em 0.4em;
  border-radius: 4px;
}

.ex-arrow { color: #3d444d; font-size: 0.8rem; flex-shrink: 0; }

.ex-explanation {
  margin-top: 0.3rem;
  font-size: 0.76rem;
  color: #6e7681;
  font-style: italic;
  line-height: 1.4;
}

.constraint-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding-left: 0.9rem;
}
.constraint-list li {
  font-size: 0.8rem;
  color: #8b949e;
  position: relative;
}
.constraint-list li::before {
  content: '·';
  position: absolute;
  left: -0.8rem;
  color: #3d444d;
}

.tests-preview {
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 6px;
  padding: 0.65rem 0.75rem;
  font-family: 'Fira Code', 'SF Mono', monospace;
  font-size: 0.72rem;
  line-height: 1.6;
  color: #8b949e;
  white-space: pre;
  overflow-x: auto;
  margin: 0;
}

/* Panel loading state (step 1) */
.panel-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.9rem;
  padding: 1.5rem;
}

.panel-anim-code {
  font-family: 'Fira Code', 'SF Mono', monospace;
  font-size: 0.76rem;
  line-height: 1.7;
  color: #8b949e;
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 8px;
  padding: 0.85rem 1rem;
  margin: 0;
  white-space: pre;
  min-width: 230px;
  min-height: 72px;
}

.panel-anim-status {
  font-family: 'Fira Code', 'SF Mono', monospace;
  font-size: 0.72rem;
  color: #3d444d;
  letter-spacing: 0.03em;
}

/* Unit tests loading indicator */
.tests-status {
  font-family: 'Fira Code', 'SF Mono', monospace;
  font-size: 0.67rem;
  color: #3d444d;
  letter-spacing: 0.02em;
}
.spinner-sm {
  width: 8px;
  height: 8px;
  border-width: 1.5px;
}
.tests-loading-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0;
  color: #6e7681;
  font-size: 0.75rem;
}

/* Predefined exercise details */
.platform-link {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.85rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  text-decoration: none;
  border: 1px solid;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  align-self: flex-start;
}
.lc-link {
  color: #f0a500;
  border-color: rgba(240,165,0,0.3);
  background: rgba(240,165,0,0.06);
}
.lc-link:hover {
  background: rgba(240,165,0,0.14);
  border-color: rgba(240,165,0,0.6);
}
.link-arrow { opacity: 0.7; }

.detail-text {
  font-size: 0.83rem;
  color: #8b949e;
  line-height: 1.65;
  margin: 0;
}

.hint-block {
  background: rgba(255,255,255,0.015);
  border: 1px solid #21262d;
  border-radius: 6px;
  overflow: hidden;
}
.hint-block::before {
  content: '[';
  display: block;
  padding: 0.55rem 0.75rem 0;
  font-family: 'Fira Code', 'SF Mono', monospace;
  font-size: 0.72rem;
  color: #3d444d;
  line-height: 1;
  user-select: none;
}
.hint-block::after {
  content: ']';
  display: block;
  padding: 0 0.75rem 0.55rem;
  font-family: 'Fira Code', 'SF Mono', monospace;
  font-size: 0.72rem;
  color: #3d444d;
  line-height: 1;
  user-select: none;
}
.hint-text {
  margin: 0;
  padding: 0.18rem 0.75rem 0.18rem 1.4rem;
  font-size: 0.82rem;
  color: #8b949e;
  line-height: 1.7;
}
.hint-text::before {
  content: '"';
  font-family: 'Fira Code', 'SF Mono', monospace;
  color: #3d444d;
  font-size: 0.88em;
  margin-right: 0.08em;
}
.hint-text::after {
  content: '"';
  font-family: 'Fira Code', 'SF Mono', monospace;
  color: #3d444d;
  font-size: 0.88em;
  margin-left: 0.08em;
}

.detail-empty {
  font-size: 0.78rem;
  color: #3d444d;
  font-style: italic;
  padding: 0.5rem 0;
}

/* Sidebar: currently-viewed exercise highlight */
.problem-item.is-viewing {
  background: #161b22;
  border-left-color: #58a6ff !important;
}
.problem-item.is-viewing .item-title { color: #e6edf3; }

/* Empty state */
.panel-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  padding: 1.5rem;
  text-align: center;
}
.empty-icon { font-size: 2rem; }
.panel-empty p { font-size: 0.85rem; color: #6e7681; margin: 0; }
.empty-sub { font-size: 0.75rem !important; color: #3d444d !important; line-height: 1.5; }

/* ── Test list ── */
.tests-header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tests-summary {
  font-size: 0.63rem;
  font-weight: 700;
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
}
.tests-all-pass  { color: #3fb950; background: rgba(63,185,80,0.12); }
.tests-some-fail { color: #f85149; background: rgba(248,81,73,0.12); }

.test-list {
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
}

.test-item {
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 6px;
  padding: 0.42rem 0.6rem;
  cursor: pointer;
  transition: border-color 0.18s, background 0.18s;
}
.test-item:hover { border-color: #30363d; }
.test-item.test-pass {
  border-color: rgba(63,185,80,0.3);
  background: rgba(63,185,80,0.05);
}
.test-item.test-fail {
  border-color: rgba(248,81,73,0.3);
  background: rgba(248,81,73,0.05);
}

.test-item-main {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.test-status-icon {
  width: 15px;
  height: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 0.72rem;
  font-weight: 700;
}
.icon-pass    { color: #3fb950; }
.icon-fail    { color: #f85149; }
.icon-pending { color: #3d444d; font-size: 0.65rem; }

.spinner-xs {
  width: 7px;
  height: 7px;
  border-width: 1.5px;
}

.test-name {
  font-size: 0.78rem;
  font-family: 'Fira Code', 'SF Mono', monospace;
  color: #8b949e;
  line-height: 1.3;
  flex: 1;
}
.test-item.test-pass .test-name { color: #3fb950; }
.test-item.test-fail .test-name { color: #f85149; }

.test-expand-icon {
  font-size: 0.6rem;
  color: #3d444d;
  flex-shrink: 0;
  transition: color 0.15s;
}
.test-item:hover .test-expand-icon,
.test-item.is-expanded .test-expand-icon { color: #6e7681; }

.test-source {
  margin: 0.4rem 0 0.1rem 1.5rem;
  padding: 0.5rem 0.65rem;
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 5px;
  font-family: 'Fira Code', 'SF Mono', monospace;
  font-size: 0.72rem;
  line-height: 1.6;
  color: #8b949e;
  white-space: pre;
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: #30363d transparent;
}

.test-error-msg {
  margin: 0.28rem 0 0 1.5rem;
  font-size: 0.69rem;
  color: #f85149;
  opacity: 0.8;
  font-family: 'Fira Code', 'SF Mono', monospace;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Responsive */
@media (max-width: 900px) {
  .problem-panel { display: none; }
}
@media (max-width: 650px) {
  .problems-sidebar { width: 160px; }
}

/* ── Exercise popup ── */
.popup-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(1, 4, 9, 0.7);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 1.5rem;
}

.popup-card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,0.6);
}

.popup-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid #21262d;
  flex-shrink: 0;
}

.popup-title {
  font-size: 0.92rem;
  font-weight: 700;
  color: #e6edf3;
  flex: 1;
  min-width: 0;
  line-height: 1.3;
}

.popup-close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: none;
  border: 1px solid transparent;
  border-radius: 6px;
  color: #6e7681;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.popup-close:hover {
  color: #e6edf3;
  border-color: #30363d;
  background: #21262d;
}

.popup-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  scrollbar-width: thin;
  scrollbar-color: #30363d transparent;
}

.popup-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Transition */
.popup-enter-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.popup-leave-active { transition: opacity 0.14s ease, transform 0.14s ease; }
.popup-enter-from  { opacity: 0; }
.popup-leave-to    { opacity: 0; }
.popup-enter-from .popup-card { transform: scale(0.96) translateY(6px); }
.popup-leave-to   .popup-card { transform: scale(0.96) translateY(6px); }
</style>
