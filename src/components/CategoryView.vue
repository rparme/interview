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
            <div
              class="item-ai-check"
              :class="{ active: selectedForAI.has(problem.lc) }"
              title="Add as AI context"
              @click.stop="toggleAISelect(problem)"
            >
              <svg aria-hidden="true" width="8" height="8" viewBox="0 0 10 10" fill="currentColor"><path d="M5 0 L5.8 3.8 L9.5 3.8 L6.5 6.1 L7.6 10 L5 7.5 L2.4 10 L3.5 6.1 L0.5 3.8 L4.2 3.8 Z"/></svg>
            </div>
            <span class="badge" :class="`badge-${problem.difficulty}`">{{ problem.difficulty }}</span>
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
            @click="openSavedExercise(ex)"
          >
            <div class="saved-ex-top">
              <div class="saved-ex-left">
                <div
                  class="item-ai-check"
                  :class="{ active: selectedGenForAI.has(ex.id) }"
                  title="Add as AI context"
                  @click.stop="toggleGenAISelect(ex)"
                >
                  <svg aria-hidden="true" width="8" height="8" viewBox="0 0 10 10" fill="currentColor"><path d="M5 0 L5.8 3.8 L9.5 3.8 L6.5 6.1 L7.6 10 L5 7.5 L2.4 10 L3.5 6.1 L0.5 3.8 L4.2 3.8 Z"/></svg>
                </div>
                <span class="badge" :class="`badge-${ex.difficulty}`">{{ ex.difficulty }}</span>
              </div>
              <div class="saved-ex-right">
                <button
                  class="done-toggle"
                  :class="{ 'is-done': ex.done }"
                  :aria-label="ex.done ? 'Mark as not done' : 'Mark as done'"
                  title="Mark as done"
                  @click.stop="toggleGenDone(ex)"
                >
                  <span aria-hidden="true">{{ ex.done ? '✓' : '' }}</span>
                </button>
                <button
                  v-if="isSubscribed"
                  class="saved-ex-delete"
                  title="Delete"
                  aria-label="Delete generated exercise"
                  @click.stop="deleteGeneratedExercise(ex, $event)"
                >✕</button>
              </div>
            </div>
            <span class="saved-ex-title">{{ ex.title }}</span>
          </div>
        </template>
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
          <span class="editor-lang">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="opacity:0.6"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            Python 3
          </span>
          <div class="toolbar-actions">
            <span v-if="isGenerating" class="loading-py">
              <span class="spinner" aria-hidden="true" />
              {{ isGeneratingTests ? 'Writing tests…' : 'Generating…' }}
            </span>
            <span v-else-if="!workerReady" class="loading-py">
              <span class="spinner" aria-hidden="true" />
              Loading Python…
            </span>
            <button
              class="run-btn"
              :class="{ 'is-ready': workerReady && !isRunning && !isGenerating }"
              :style="workerReady && !isRunning && !isGenerating ? { borderColor: category.color + '70', color: category.color } : {}"
              :disabled="!workerReady || isRunning || isGenerating"
              :title="isGenerating ? 'Waiting for generation to finish…' : workerReady ? 'Run (Ctrl+Enter)' : 'Waiting for Python…'"
              @click="runCode"
            >
              <span aria-hidden="true">{{ isRunning ? '⟳' : '▶' }}</span>
              {{ isRunning ? 'Running…' : 'Run' }}
            </button>
          </div>
        </div>

        <div v-if="editorError" class="editor-error">{{ editorError }}</div>
        <div class="editor-wrap">
          <div ref="editorEl" class="editor-container" :style="editorError ? { display: 'none' } : {}" />
          <div v-if="isGeneratingTests" class="editor-disabled-overlay">
            <span class="spinner" aria-hidden="true" />
            writing tests…
          </div>
        </div>

        <OutputPane
          :height="outputHeight"
          :output="output"
          :has-error="hasError"
          :output-display="outputDisplay"
          :test-results="testResults"
          :active-test-tab="activeTestTab"
          :parsed-test-cases="parsedTestCases"
          @resize-start="onOutputResizeStart"
          @update:active-test-tab="activeTestTab = $event"
          @clear="clearOutput"
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
import { useSavedExercises } from '../composables/useSavedExercises.js'
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
const { panelWidth, outputHeight, onResizeStart, onOutputResizeStart, cleanupResize } =
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
const {
  savedExercises, currentExerciseId, dbSaveError,
  loadSavedExercises, persistGeneratedExercise, deleteGeneratedExercise: _deleteGenExercise,
  toggleGenDone, scheduleSave, flushSave, prepareOpenSavedExercise, cleanupSave,
} = useSavedExercises({
  getCategoryId: () => props.category.id,
  openAuth: () => emit('open-auth'),
  getEditorValue: () => getEditorValue(),
})

// Wrap deleteGeneratedExercise to handle panelMode reset
async function deleteGeneratedExercise(ex, event) {
  await _deleteGenExercise(ex, event)
  // If the deleted exercise was showing, reset panel
  if (currentExerciseId.value === null && panelMode.value === 'generated') {
    panelMode.value = selectedExercise.value ? 'exercise' : 'empty'
  }
}

// ── Composable 4: Code execution ──
const unitTests = computed(() => generatedProblem.value?.unitTests ?? '')

const {
  workerReady, isRunning, output, hasError, testResults, activeTestTab,
  outputDisplay, parsedTestNames, parsedTestCases, allTestsPassing,
  expandedTest, showTests, runCode, clearOutput, ensureWorker,
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
})

// Wire late-binding callbacks now that all composables are initialised
_runCode = runCode
_scheduleSave = scheduleSave

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
  generatedProblem.value = exercise
  panelMode.value = 'generated'
  testResults.value = []
  expandedTest.value = null
  setEditorValue(savedCode ?? exercise.starterCode)
}

// ── Watchers ──
watch(user, () => loadSavedExercises())

watch(isGeneratingTests, (generating) => {
  setEditorReadOnly(generating)
})

watch(() => generatedProblem.value?.unitTests, (tests) => {
  if (tests) showTests.value = false
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
.legend-ai-icon { font-size: 0.65rem; color: #a371f7; opacity: 0.7; }
.legend-done-icon { font-size: 0.75rem; color: #3fb950; opacity: 0.7; }

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
.problem-item.is-viewing { background: #161b22; border-left-color: #58a6ff !important; }
.problem-item.is-viewing .item-title { color: #e6edf3; }

.item-top { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.3rem; }

.done-toggle {
  width: 16px; height: 16px; border-radius: 50%;
  border: 1.5px solid #30363d; background: transparent;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  font-size: 0.55rem; color: #fff; padding: 0; margin-left: auto; flex-shrink: 0;
  transition: border-color 0.12s, background 0.12s;
}
.done-toggle:hover:not(.is-done) { border-color: #3fb950; }
.done-toggle.is-done { background: #3fb950; border-color: #3fb950; }

.item-ai-check {
  width: 16px; height: 16px; border-radius: 4px;
  border: 1.5px dashed #3d444d; background: transparent;
  display: flex; align-items: center; justify-content: center;
  color: transparent; flex-shrink: 0;
  transition: border-color 0.12s, background 0.12s, color 0.12s;
}
.item-ai-check.active {
  border: 1.5px solid #a371f7;
  background: rgba(163, 113, 247, 0.15);
  color: #a371f7;
}
.problem-item:hover .item-ai-check:not(.active),
.saved-ex-item:hover .item-ai-check:not(.active) {
  border-color: #a371f7; border-style: solid; color: rgba(163, 113, 247, 0.4);
}

.badge {
  font-size: 0.6rem; font-weight: 600; padding: 0.08rem 0.38rem;
  border-radius: 999px; letter-spacing: 0.02em;
}
.badge-Easy   { background: rgba(63,185,80,0.15);  color: #3fb950; }
.badge-Medium { background: rgba(210,153,34,0.15); color: #d29922; }
.badge-Hard   { background: rgba(248,81,73,0.15);  color: #f85149; }

.item-title-row { display: flex; align-items: center; gap: 0.25rem; margin-top: 0.3rem; }
.item-title { font-size: 0.8rem; font-weight: 500; line-height: 1.35; color: #c9d1d9; flex: 1; min-width: 0; }

.item-open-btn {
  flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  background: none; border: 1px solid transparent; border-radius: 4px;
  padding: 0.1rem 0.2rem; color: #3d444d; cursor: pointer; opacity: 0;
  transition: opacity 0.15s, color 0.15s, border-color 0.15s;
}
.problem-item:hover .item-open-btn { opacity: 1; }
.item-open-btn:hover { color: #58a6ff; border-color: #30363d; }
.problem-item.is-viewing .item-open-btn { opacity: 1; color: #58a6ff; }

/* ── Sidebar DB error ── */
.sidebar-db-error {
  display: flex; gap: 0.4rem; align-items: flex-start;
  margin: 0.55rem 0.75rem 0; padding: 0.45rem 0.6rem;
  background: rgba(248,81,73,0.07); border: 1px solid rgba(248,81,73,0.2);
  border-radius: 6px; font-size: 0.69rem; color: #f0857a; line-height: 1.4;
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
  padding: 0.55rem 0.9rem; border-left: 3px solid transparent;
  cursor: pointer; border-bottom: 1px solid #0d1117;
  transition: background 0.12s, border-left-color 0.12s; user-select: none;
}
.saved-ex-item:hover { background: #161b22; }
.saved-ex-item.is-active { background: #161b22; border-left-color: #a371f7; }
.saved-ex-item.done { opacity: 0.55; }
.saved-ex-item .done-toggle { opacity: 1; }

.saved-ex-top {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 0.22rem; gap: 0.3rem;
}
.saved-ex-left { display: flex; align-items: center; gap: 0.3rem; }
.saved-ex-right { display: flex; align-items: center; gap: 0.15rem; }

.saved-ex-title {
  display: block; font-size: 0.78rem; font-weight: 500; color: #6e7681; line-height: 1.35;
}
.saved-ex-item:hover .saved-ex-title,
.saved-ex-item.is-active .saved-ex-title { color: #c9d1d9; }

.saved-ex-delete {
  background: none; border: none; color: #3d444d; font-size: 0.58rem;
  cursor: pointer; padding: 0.1rem 0.25rem; border-radius: 3px;
  opacity: 0; line-height: 1; transition: color 0.15s, opacity 0.15s;
}
.saved-ex-item:hover .saved-ex-delete { opacity: 1; }
.saved-ex-delete:hover { color: #f85149; }

/* ── Center: editor area ── */
.editor-area {
  flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0;
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

.spinner {
  display: inline-block; width: 10px; height: 10px;
  border: 1.5px solid #30363d; border-top-color: #58a6ff;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.run-btn {
  display: flex; align-items: center; gap: 0.35rem;
  padding: 0.25rem 0.7rem; background: none;
  border: 1px solid #30363d; border-radius: 6px;
  color: #6e7681; font-size: 0.75rem; font-weight: 600;
  font-family: inherit; cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.run-btn.is-ready:hover { background: #161b22; }
.run-btn:disabled { opacity: 0.5; cursor: not-allowed; }

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
  .problems-sidebar { width: 160px; }
}
</style>
