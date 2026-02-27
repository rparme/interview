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
        <div class="progress-bar" role="progressbar" :aria-valuenow="pct" aria-valuemin="0" aria-valuemax="100" :aria-label="category.name + ' progress'">
          <div class="progress-fill" :style="{ width: pct + '%', background: category.color }" />
        </div>
      </div>
    </div>

    <!-- MAIN 3-PANE -->
    <div class="main">

      <!-- LEFT: problem list sidebar -->
      <div class="problems-sidebar" :style="{ width: sidebarWidth + 'px' }">
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
          <div class="item-content">
            <span class="badge" :class="`badge-${problem.difficulty}`">{{ problem.difficulty }}</span>
            <span class="item-title" :title="problem.title">{{ problem.title }}</span>
          </div>
          <div class="item-actions" aria-hidden="true">
            <button
              class="action-btn action-ai"
              :class="{ active: selectedForAI.has(problem.lc) }"
              tabindex="-1"
              title="Toggle AI context"
              :aria-label="`Toggle AI context for ${problem.title}`"
              @click.stop="toggleAISelect(problem)"
            ><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16l-6.4 5.2 2.4-7.2-6-4.8h7.6z"/></svg></button>
            <button
              class="action-btn action-done"
              :class="{ 'is-done': problem.done }"
              tabindex="-1"
              :aria-label="problem.done ? 'Mark as not done' : 'Mark as done'"
              title="Toggle done"
              @click.stop="$emit('toggle-done', problem.lc)"
            ><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"/><path v-if="problem.done" d="M8 12l3 3 5-6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            <button
              class="action-btn action-chevron"
              tabindex="-1"
              title="Open exercise popup"
              :aria-label="`Open exercise popup for ${problem.title}`"
              @click.stop="openExercise(problem)"
            ><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg></button>
          </div>
        </div>

        <!-- DB save error -->
        <div v-if="dbSaveError" class="sidebar-db-error">
          <span class="db-error-icon">!</span>{{ dbSaveError }}
        </div>

        <!-- Saved generated exercises -->
        <template v-if="savedExercises.length">
          <div class="sidebar-divider">
            <span class="divider-label">Generated</span>
          </div>
          <div
            v-for="ex in savedExercises"
            :key="ex.id"
            class="saved-ex-item"
            :class="{
              'is-active': currentExerciseId === ex.id,
              done: ex.done,
              checked: selectedGenForAI.has(ex.id),
            }"
            :style="selectedGenForAI.has(ex.id) ? { borderLeftColor: '#a371f7' } : {}"
            tabindex="0"
            role="button"
            :aria-label="ex.title"
            @click="openSavedExercise(ex)"
            @keydown.enter="openSavedExercise(ex)"
          >
            <div class="item-content">
              <span class="badge" :class="`badge-${ex.difficulty}`">{{ ex.difficulty }}</span>
              <span class="item-title" :title="ex.title">{{ ex.title }}</span>
            </div>
            <div class="item-actions" aria-hidden="true">
              <button
                class="action-btn action-ai"
                :class="{ active: selectedGenForAI.has(ex.id) }"
                tabindex="-1"
                title="Toggle AI context"
                :aria-label="`Toggle AI context for ${ex.title}`"
                @click.stop="toggleGenAISelect(ex)"
              ><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16l-6.4 5.2 2.4-7.2-6-4.8h7.6z"/></svg></button>
              <button
                class="action-btn action-done"
                :class="{ 'is-done': ex.done }"
                tabindex="-1"
                :aria-label="ex.done ? 'Mark as not done' : 'Mark as done'"
                title="Toggle done"
                @click.stop="toggleGenDone(ex)"
              ><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"/><path v-if="ex.done" d="M8 12l3 3 5-6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
              <button
                v-if="isSubscribed"
                class="action-btn action-delete"
                tabindex="-1"
                title="Delete exercise"
                aria-label="Delete generated exercise"
                @click.stop="deleteGeneratedExercise(ex, $event)"
              ><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              <span v-else class="action-btn action-placeholder" aria-hidden="true" />
            </div>
          </div>
        </template>
        <div class="sidebar-resize-handle" @mousedown.prevent="onSidebarResizeStart" />
      </div>

      <!-- CENTER: editor -->
      <div class="editor-area">
        <GeneratorBar
          :selected-for-a-i="selectedForAI"
          :selected-gen-for-a-i="selectedGenForAI"
          :saved-exercises="savedExercises"
          :category-color="category.color"
          :is-generating="isGenerating"
          :generation-blocked="generationBlocked"
          :generation-status="generationStatus"
          :generation-error="generationError"
          :business-field="businessField"
          :business-fields="BUSINESS_FIELDS"
          :problem-by-lc="problemByLc"
          @update:business-field="businessField = $event"
          @remove-ai-chip="selectedForAI.delete($event)"
          @remove-gen-chip="selectedGenForAI.delete($event)"
          @generate="generate"
        />

        <!-- Monaco toolbar -->
        <div class="editor-toolbar">
          <span class="editor-lang">py3</span>
          <div class="toolbar-actions">
            <span v-if="isGenerating" class="loading-py">
              <span class="spinner" aria-hidden="true" />
              {{ generationStatus === 'solving' ? 'solving…' : generationStatus === 'verifying' ? 'verifying…' : generationStatus === 'writing tests' ? 'writing tests…' : 'generating…' }}
            </span>
            <span v-else-if="!workerReady" class="loading-py">
              <span class="spinner" aria-hidden="true" />
              loading python…
            </span>
            <span v-if="(isGenerating || !workerReady)" class="toolbar-sep" aria-hidden="true" />
            <button
              class="run-btn"
              :class="{ 'is-ready': workerReady && !isRunning && !isGenerating }"
              :style="workerReady && !isRunning && !isGenerating ? { borderColor: category.color + '70', color: category.color } : {}"
              :disabled="!workerReady || isRunning || isGenerating"
              :title="isGenerating ? 'waiting for generation…' : workerReady ? 'Run (Ctrl+Enter)' : 'loading python…'"
              @click="runCode"
            >
              <span v-if="isRunning" class="spinner spinner-run" aria-hidden="true" />
              <span v-else aria-hidden="true">▶</span>
              {{ isRunning ? 'running…' : 'Run' }}
            </button>
            <button
              v-show="activeEditorTab !== 'explain'"
              class="run-btn analyze-btn"
              :class="{
                'is-ready':    isSubscribed && !isAnalyzing && !isGenerating && workerReady,
                'is-analyzing': isAnalyzing,
              }"
              :disabled="!isSubscribed || isAnalyzing || isGenerating || !workerReady"
              :title="!isSubscribed ? 'Subscribe to unlock complexity analysis' : isAnalyzing ? 'Analyzing…' : 'Analyze time & space complexity (∑)'"
              @click="analyze().then(() => { activeTestTab = '__complexity__' })"
            >
              <span class="analyze-icon" aria-hidden="true">{{ !isSubscribed ? '⌁' : '∑' }}</span>
              {{ isAnalyzing ? 'analyzing…' : 'analyze' }}
            </button>
          </div>
        </div>

        <div v-if="hasSolution || isGenerating || panelMode === 'generated'" class="editor-tabs">
          <button
            v-if="panelMode === 'generated'"
            class="editor-tab"
            :class="{ active: activeEditorTab === 'explain' }"
            @click="switchEditorTab('explain')"
          >explain</button>
          <button
            class="editor-tab"
            :class="{ active: activeEditorTab === 'code' }"
            @click="switchEditorTab('code')"
          >your code</button>
          <button
            class="editor-tab"
            :class="{ active: activeEditorTab === 'solution' }"
            :disabled="!hasSolution"
            @click="switchEditorTab('solution')"
          >&#9670; solution</button>
        </div>

        <div v-if="editorError && activeEditorTab !== 'explain'" class="editor-error">{{ editorError }}</div>
        <div v-show="activeEditorTab !== 'explain'" class="editor-wrap">
          <div ref="editorEl" class="editor-container" :style="editorError ? { display: 'none' } : {}" />
          <div v-if="isGenerating" class="editor-disabled-overlay">
            <span class="spinner" aria-hidden="true" />
            {{ generationStatus === 'solving' ? 'solving…' : generationStatus === 'verifying' ? 'verifying…' : generationStatus === 'writing tests' ? 'writing tests…' : 'generating…' }}
          </div>

        </div>

        <ExplainPanel
          v-if="panelMode === 'generated' && activeEditorTab === 'explain'"
          :recording-state="recordingState"
          :transcript="transcript"
          :interim-text="interimText"
          :review-result="reviewResult"
          :review-error="reviewError"
          :is-speech-supported="isSpeechSupported"
          @start="startRecording"
          @stop="stopRecording"
          @submit="submitForReview"
          @reset="resetExplain"
          @clear="clearTranscript"
        />

        <OutputPane
          :height="outputHeight"
          :output="output"
          :has-error="hasError"
          :output-display="outputDisplay"
          :test-results="testResults"
          :active-test-tab="activeTestTab"
          :parsed-test-cases="parsedTestCases"
          :analysis-result="analysisResult"
          :analysis-error="analysisError"
          :is-analyzing="isAnalyzing"
          @resize-start="onOutputResizeStart"
          @update:active-test-tab="activeTestTab = $event"
          @select-complexity="activeTestTab = '__complexity__'"
          @clear="clearOutput(); clearAnalysis()"
        />
      </div>

      <!-- RIGHT: detail panel (resizable) -->
      <DetailPanel
        :width="panelWidth"
        :panel-mode="panelMode"
        :generated-problem="generatedProblem"
        :selected-exercise="selectedExercise"
        :description-html="descriptionHtml"
        :difficulty-guess="difficultyGuess"
        :panel-anim-text="panelAnimText"
        :generation-status="generationStatus"
        :is-generating="isGenerating"
        :is-generating-tests="isGeneratingTests"
        :is-running="isRunning"
        :show-tests="showTests"
        :test-results="testResults"
        :parsed-test-names="parsedTestNames"
        :parsed-test-cases="parsedTestCases"
        :all-tests-passing="allTestsPassing"
        :expanded-test="expandedTest"
        :test-result-for="testResultFor"
        :format-test-name="formatTestName"
        :test-source-for="testSourceFor"
        @resize-start="onResizeStart"
        @update:show-tests="showTests = $event"
        @update:expanded-test="expandedTest = $event"
      />
    </div>
  </div>

  <ExercisePopup :problem="popupProblem" @close="closePopup" />
</template>

<script setup>
import { ref, computed, watch, reactive, onMounted, onBeforeUnmount } from 'vue'
import { useAuth } from '../composables/useAuth.js'
import { useResizePanels } from '../composables/useResizePanels.js'
import GeneratorBar from './GeneratorBar.vue'
import OutputPane from './OutputPane.vue'
import DetailPanel from './DetailPanel.vue'
import ExercisePopup from './ExercisePopup.vue'
import { useMonacoEditor } from '../composables/useMonacoEditor.js'
import { useCodeExecution } from '../composables/useCodeExecution.js'
import { useComplexityAnalysis } from '../composables/useComplexityAnalysis.js'
import { useExplanationReview } from '../composables/useExplanationReview.js'
import { useSavedExercises } from '../composables/useSavedExercises.js'
import ExplainPanel from './ExplainPanel.vue'
import { useProblemGeneration } from '../composables/useProblemGeneration.js'

const props = defineProps({
  category: { type: Object, required: true },
})

const emit = defineEmits(['back', 'toggle-done', 'open-auth'])

const { user, isSubscribed } = useAuth()

// ── Template refs ──
const rootEl = ref(null)
const editorEl = ref(null)

// ── Problem list ──
const DIFFICULTY_ORDER = { Easy: 0, Medium: 1, Hard: 2 }
const sortedProblems = computed(() =>
  [...props.category.problems].sort(
    (a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]
  )
)

function problemByLc(lc) {
  return props.category.problems.find(p => p.lc === lc)
}

// ── AI context selection ──
const selectedForAI = reactive(new Set())
const selectedGenForAI = reactive(new Set())

function toggleAISelect(problem) {
  if (selectedForAI.has(problem.lc)) selectedForAI.delete(problem.lc)
  else selectedForAI.add(problem.lc)
}

function toggleGenAISelect(ex) {
  if (selectedGenForAI.has(ex.id)) selectedGenForAI.delete(ex.id)
  else selectedGenForAI.add(ex.id)
}

// ── Exercise detail / panel state ──
const selectedExercise = ref(null)
const panelMode = ref('empty')

function selectExercise(problem) {
  selectedExercise.value = problem
  if (panelMode.value !== 'generated') panelMode.value = 'exercise'
}

// ── Exercise popup ──
const popupProblem = ref(null)

function openExercise(problem) { popupProblem.value = problem }
function closePopup() { popupProblem.value = null }
function onPopupKey(e) { if (e.key === 'Escape') closePopup() }

watch(popupProblem, (val) => {
  if (val) document.addEventListener('keydown', onPopupKey)
  else document.removeEventListener('keydown', onPopupKey)
})

// ── Composable 1: Resize panels ──
const { panelWidth, outputHeight, sidebarWidth, onResizeStart, onSidebarResizeStart, onOutputResizeStart, cleanupResize } =
  useResizePanels(rootEl)

// ── Composable 2: Monaco editor ──
// Late-binding wrappers for circular deps (runCode, scheduleSave not available yet)
let _runCode = () => {}
let _scheduleSave = () => {}

const { editorError, initEditor, destroyEditor, getValue: getEditorValue, setValue: setEditorValue, setReadOnly: setEditorReadOnly } =
  useMonacoEditor({
    editorEl,
    getInitialValue: () => generatedProblem.value?.starterCode,
    onContentChange: () => _scheduleSave(),
    onRunAction: () => _runCode(),
  })

// ── Composable 3: Saved exercises ──
// getUserCode returns the user's code regardless of which editor tab is active.
// When on the solution tab, the user's code lives in savedUserCode (not in the editor).
function getUserCode() {
  if (activeEditorTab.value === 'solution') return savedUserCode.value
  return getEditorValue()
}

const {
  savedExercises, currentExerciseId, dbSaveError,
  loadSavedExercises, persistGeneratedExercise, deleteGeneratedExercise: _deleteGenExercise,
  toggleGenDone, scheduleSave, flushSave, prepareOpenSavedExercise, cleanupSave,
} = useSavedExercises({
  getCategoryId: () => props.category.id,
  openAuth: () => emit('open-auth'),
  getEditorValue: () => getUserCode(),
})

// Wrap deleteGeneratedExercise to handle panelMode + editor reset
async function deleteGeneratedExercise(ex, event) {
  const wasActive = currentExerciseId.value === ex.id
  await _deleteGenExercise(ex, event)
  if (wasActive) {
    generatedProblem.value = null
    activeEditorTab.value = 'code'
    savedUserCode.value = ''
    setEditorReadOnly(false)
    setEditorValue('')
    clearOutput()
    testResults.value = []
    panelMode.value = selectedExercise.value ? 'exercise' : 'empty'
  }
}

// ── Composable 4: Code execution ──
const unitTests = computed(() => generatedProblem.value?.unitTests ?? '')

const {
  workerReady, isRunning, output, hasError, testResults, activeTestTab,
  outputDisplay, parsedTestNames, parsedTestCases, allTestsPassing,
  expandedTest, showTests, runCode, runPython, clearOutput, ensureWorker,
  testResultFor, formatTestName, testSourceFor,
} = useCodeExecution({
  getEditorValue: () => getEditorValue(),
  unitTests,
})

// ── Composable 5: Problem generation ──
const {
  businessField, generatedProblem, isGenerating, isGeneratingTests,
  generationStatus, generationError, generationBlocked, descriptionHtml,
  difficultyGuess, panelAnimText, BUSINESS_FIELDS,
  generate, stopAnim,
} = useProblemGeneration({
  getCategoryName: () => props.category.name,
  getCategoryId: () => props.category.id,
  selectedForAI,
  selectedGenForAI,
  problemByLc,
  savedExercises,
  loadSavedExercises,
  persistGeneratedExercise,
  flushSave,
  setEditorValue,
  openAuth: () => emit('open-auth'),
  panelMode,
  currentExerciseId,
  dbSaveError,
  showTests,
  getSelectedExercise: () => selectedExercise.value,
  runPython,
})

// ── Composable 6: Complexity analysis ──
const { isAnalyzing, analysisResult, analysisError, analyze, clearAnalysis } =
  useComplexityAnalysis({
    getEditorValue: () => getEditorValue(),
    getGeneratedProblem: () => generatedProblem.value,
    openAuth: () => emit('open-auth'),
  })

// ── Composable 7: Explanation review ──
const {
  recordingState, transcript, interimText, reviewResult, reviewError,
  isSpeechSupported, startRecording, stopRecording, submitForReview, resetExplain, clearTranscript, loadExplanation,
} = useExplanationReview({
  getGeneratedProblem: () => generatedProblem.value,
  getCategoryName: () => props.category.name,
  openAuth: () => emit('open-auth'),
  getCurrentExerciseId: () => currentExerciseId.value,
})

// ── Editor tab bar (code vs solution) ──
const activeEditorTab = ref('code')
const savedUserCode = ref('')

// Wire late-binding callbacks now that all composables are initialised
_runCode = runCode
_scheduleSave = () => {
  // Only autosave when on the code tab — solution tab has solution code, explain tab has no editor
  if (activeEditorTab.value === 'code') scheduleSave()
}

const hasSolution = computed(() =>
  generatedProblem.value?.solutionCode && generatedProblem.value.solutionCode.length > 0
)

function switchEditorTab(tab) {
  if (tab === activeEditorTab.value) return
  if (tab === 'solution' && !hasSolution.value) return
  if (activeEditorTab.value === 'code' || tab === 'solution') savedUserCode.value = getEditorValue()
  if (tab === 'code')     { if (savedUserCode.value) setEditorValue(savedUserCode.value); setEditorReadOnly(false) }
  if (tab === 'solution') { setEditorValue(generatedProblem.value.solutionCode); setEditorReadOnly(true) }
  activeEditorTab.value = tab
}

// ── Derived counts ──
const doneCnt = computed(() =>
  props.category.problems.filter(p => p.done).length +
  savedExercises.value.filter(e => e.done).length
)
const totalCnt = computed(() =>
  props.category.problems.length + savedExercises.value.length
)
const pct = computed(() => Math.round((doneCnt.value / totalCnt.value) * 100))

// ── Open saved exercise (UI orchestration) ──
async function openSavedExercise(ex) {
  const { exercise, savedCode } = await prepareOpenSavedExercise(ex.id)
  selectedExercise.value = null
  activeEditorTab.value = 'explain'
  savedUserCode.value = ''
  setEditorReadOnly(false)
  generatedProblem.value = exercise
  panelMode.value = 'generated'
  testResults.value = []
  expandedTest.value = null
  setEditorValue(savedCode ?? exercise.starterCode)
  await loadExplanation(ex.id)
}

// ── Watchers ──
watch(user, () => loadSavedExercises())

watch(isGenerating, (generating) => {
  if (generating) {
    setEditorReadOnly(true)
    // Clear stale state from previous exercise
    testResults.value = []
    expandedTest.value = null
    activeTestTab.value = null
    clearOutput()
    clearAnalysis()
    resetExplain()
    activeEditorTab.value = 'code'
    savedUserCode.value = ''
  } else {
    if (activeEditorTab.value !== 'solution') setEditorReadOnly(false)
    // Switch to Explain tab once generation is fully done
    if (panelMode.value === 'generated') activeEditorTab.value = 'explain'
  }
})

watch(() => generatedProblem.value?.unitTests, (tests) => {
  if (tests) showTests.value = false
})

// Reset savedUserCode when a new problem is generated or a saved exercise is loaded
watch(generatedProblem, (newVal, oldVal) => {
  if (newVal !== oldVal) savedUserCode.value = ''
})


// ── Lifecycle ──
ensureWorker()

onMounted(() => { loadSavedExercises(); initEditor() })

onBeforeUnmount(() => {
  cleanupSave()
  stopAnim()
  destroyEditor()
  cleanupResize()
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
.category-view.is-resizing { cursor: col-resize; user-select: none; }
.category-view.is-resizing .editor-container,
.category-view.is-resizing .editor-wrap { pointer-events: none; }
.category-view.is-resizing-output { cursor: row-resize; user-select: none; }
.category-view.is-resizing-output .editor-container,
.category-view.is-resizing-output .editor-wrap { pointer-events: none; }

/* ── Top bar ── */
.topbar {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0 3.5rem 0 1.25rem;
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
  border-radius: 4px;
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
  flex-shrink: 0;
  overflow-y: auto;
  overflow-x: hidden;
  border-right: 1px solid #21262d;
  display: flex;
  flex-direction: column;
  position: relative;
  scrollbar-width: thin;
  scrollbar-color: #30363d transparent;
}

.sidebar-resize-handle {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: col-resize;
  z-index: 10;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sidebar-resize-handle::after {
  content: '';
  width: 2px;
  height: 28px;
  border-radius: 1px;
  background: #30363d;
  transition: background 0.15s, height 0.15s;
}
.sidebar-resize-handle:hover::after,
.sidebar-resize-handle:active::after {
  background: #58a6ff;
  height: 40px;
}
.sidebar-resize-handle:hover,
.sidebar-resize-handle:active {
  background: rgba(88, 166, 255, 0.08);
}

/* ── Problem item: two-zone row (Fixed Action Zone / Proposal C) ── */
.problem-item {
  display: flex;
  align-items: stretch;
  border-left: 3px solid transparent;
  cursor: pointer;
  border-bottom: 1px solid #0d1117;
  transition: background 0.12s, border-left-color 0.12s;
  user-select: none;
  min-height: 48px;
}
.problem-item:hover { background: #161b22; }
.problem-item:focus-visible { outline: 2px solid #58a6ff; outline-offset: -2px; }
.problem-item.done { opacity: 0.55; }
.problem-item.checked { background: #161b22; }
.problem-item.is-viewing { background: #161b22; border-left-color: #58a6ff !important; }
.problem-item.is-viewing .item-title { color: #e6edf3; }

/* Left content zone (~75%) */
.item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.28rem;
  padding: 0.55rem 0.7rem;
}

/* Right action zone (~25%) */
.item-actions {
  flex-shrink: 0;
  width: 64px;
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: #161b22;
  border-left: 1px solid #21262d;
  padding: 0 0.2rem;
}

/* Shared action button base */
.action-btn {
  background: none;
  border: none;
  padding: 0;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  line-height: 1;
  color: #484f58;
  cursor: pointer;
  border-radius: 3px;
  flex-shrink: 0;
  transition: color 0.12s, background 0.12s;
}

/* Star — AI context */
.action-ai.active {
  color: #a371f7;
  background: rgba(163, 113, 247, 0.15);
}
.action-ai:hover:not(.active) { color: #a371f7; }

/* Circle — done toggle */
.action-done.is-done { color: #3fb950; }
.action-done:hover:not(.is-done) { color: #3fb950; }

/* Arrow (open popup) */
.action-chevron:hover { color: #58a6ff; }

/* X — delete (generated exercises) */
.action-delete:hover { color: #f85149; }
.action-placeholder { cursor: default; pointer-events: none; }

.badge {
  font-size: 0.6rem; font-weight: 600; padding: 0.08rem 0.38rem;
  border-radius: 999px; letter-spacing: 0.02em;
  align-self: flex-start;
}
.badge-Easy   { background: rgba(63,185,80,0.15);  color: #3fb950; }
.badge-Medium { background: rgba(210,153,34,0.15); color: #d29922; }
.badge-Hard   { background: rgba(248,81,73,0.15);  color: #f85149; }

.item-title {
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 1.35;
  color: #c9d1d9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Sidebar DB error ── */
.sidebar-db-error {
  display: flex; gap: 0.4rem; align-items: flex-start;
  margin: 0.55rem 0.75rem 0; padding: 0.45rem 0.6rem;
  background: rgba(248,81,73,0.07); border: 1px solid rgba(248,81,73,0.2);
  border-radius: 4px; font-size: 0.69rem; color: #f0857a; line-height: 1.4;
}
.db-error-icon { font-weight: 700; font-size: 0.72rem; color: #f85149; flex-shrink: 0; line-height: 1.4; }

/* ── Saved generated exercises sidebar ── */
.sidebar-divider {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.65rem 0.9rem 0.2rem; flex-shrink: 0;
}
.sidebar-divider::before, .sidebar-divider::after {
  content: ''; flex: 1; height: 1px; background: #21262d;
}
.divider-label {
  font-size: 0.58rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.1em; color: #3d444d; white-space: nowrap; flex-shrink: 0;
}

.saved-ex-item {
  display: flex;
  align-items: stretch;
  border-left: 3px solid transparent;
  cursor: pointer;
  border-bottom: 1px solid #0d1117;
  transition: background 0.12s, border-left-color 0.12s;
  user-select: none;
  min-height: 48px;
}
.saved-ex-item:hover { background: #161b22; }
.saved-ex-item.is-active { background: #161b22; border-left-color: #a371f7; }
.saved-ex-item.done { opacity: 0.55; }
.saved-ex-item:hover .item-title,
.saved-ex-item.is-active .item-title { color: #e6edf3; }
.saved-ex-item .item-title { color: #8b949e; }

/* ── Center: editor area ── */
.editor-area {
  flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 400px;
}

.editor-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 1rem; height: 36px; background: #161b22;
  border-bottom: 1px solid #21262d; flex-shrink: 0;
}
.editor-lang {
  display: flex; align-items: center; gap: 0.4rem;
  font-size: 0.73rem; font-weight: 600; color: #6e7681; letter-spacing: 0.02em;
}
.toolbar-actions { display: flex; align-items: center; gap: 0.65rem; }
.loading-py { display: flex; align-items: center; gap: 0.4rem; font-size: 0.73rem; color: #6e7681; }
.toolbar-sep { width: 1px; height: 14px; background: #21262d; flex-shrink: 0; }
.spinner-run { width: 10px; height: 10px; border-width: 1.5px; }

.spinner {
  display: inline-block; width: 10px; height: 10px;
  border: 1.5px solid #30363d; border-top-color: #58a6ff;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.run-btn {
  display: flex; align-items: center; gap: 0.35rem;
  padding: 0.25rem 0.7rem; background: none;
  border: 1px solid #30363d; border-radius: 4px;
  color: #6e7681; font-size: 0.75rem; font-weight: 600;
  font-family: inherit; cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.run-btn.is-ready:hover { background: #161b22; }
.run-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Analyze button — distinct from Run: amber accent, monospace label */
.analyze-btn {
  font-family: 'Fira Code', 'SF Mono', monospace;
  font-size: 0.72rem;
  letter-spacing: 0.02em;
}
.analyze-btn.is-ready {
  border-color: #e5c07b60;
  color: #e5c07b;
}
.analyze-btn.is-ready:hover {
  background: rgba(229, 192, 123, 0.06);
  border-color: #e5c07b;
}
.analyze-btn.is-analyzing {
  border-color: #e5c07b40;
  color: #e5c07b80;
  cursor: wait;
}
.analyze-icon {
  font-size: 0.8rem;
  line-height: 1;
}

.editor-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #21262d;
  background: #0d1117;
  flex-shrink: 0;
}
.editor-tab {
  padding: 0.35rem 0.85rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #6e7681;
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.editor-tab:hover { color: #c9d1d9; }
.editor-tab.active {
  color: #e6edf3;
  border-bottom-color: #58a6ff;
}
.editor-tab:disabled { opacity: 0.4; cursor: default; }

.editor-wrap {
  flex: 1; position: relative; display: flex; flex-direction: column; min-height: 0;
}
.editor-container { flex: 1; overflow: hidden; min-height: 0; }

.editor-disabled-overlay {
  position: absolute; inset: 0;
  background: rgba(13, 17, 23, 0.55);
  display: flex; align-items: center; justify-content: center;
  gap: 0.55rem; font-size: 0.78rem; color: #6e7681;
  font-family: 'Fira Code', 'SF Mono', monospace;
  pointer-events: all; z-index: 5;
}
.editor-error {
  flex: 1; display: flex; align-items: center; justify-content: center;
  font-size: 0.82rem; color: #f85149;
  background: rgba(248,81,73,0.06); padding: 1rem; text-align: center;
}

/* Responsive */
@media (max-width: 650px) {
  .problems-sidebar { min-width: 140px; }
}
</style>
