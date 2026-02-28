<template>
  <Teleport to="body">
    <Transition name="overlay">
      <div v-if="problem" class="overlay" role="dialog" :aria-label="problem.title">

        <!-- TOP BAR -->
        <div class="topbar" :style="{ borderBottomColor: categoryColor + '30' }">
          <div class="topbar-left">
            <span class="badge" :class="`badge-${problem.difficulty}`">{{ problem.difficulty }}</span>
            <h2 class="problem-title">{{ problem.title }}</h2>
          </div>
          <div class="topbar-right">
            <button
              class="done-btn"
              :class="{ 'is-done': problem.done }"
              :style="problem.done
                ? { borderColor: categoryColor, background: categoryColor + '20', color: categoryColor }
                : {}"
              @click="$emit('toggle-done', problem.lc)"
            >
              <span aria-hidden="true">{{ problem.done ? '✓' : '○' }}</span>
              {{ problem.done ? 'Done' : 'Mark done' }}
            </button>
            <button class="close-btn" @click="$emit('close')" aria-label="Close panel">✕</button>
          </div>
        </div>

        <!-- MAIN SPLIT -->
        <div class="main">

          <!-- LEFT: problem hints -->
          <div class="info-pane">
            <section class="hint-section">
              <h3 class="hint-title">
                <span class="hint-icon" :style="{ color: categoryColor }">⚙</span>
                How to solve
              </h3>
              <ul class="hint-list">
                <li v-for="(hint, i) in problem.howTo" :key="i" class="hint-item">
                  <span class="hint-bullet" :style="{ background: categoryColor }" />
                  {{ hint }}
                </li>
              </ul>
            </section>

            <section class="hint-section">
              <h3 class="hint-title">
                <span class="hint-icon" :style="{ color: categoryColor }">◎</span>
                When to use
              </h3>
              <ul class="hint-list">
                <li v-for="(hint, i) in problem.whenTo" :key="i" class="hint-item">
                  <span class="hint-bullet" :style="{ background: categoryColor }" />
                  {{ hint }}
                </li>
              </ul>
            </section>
          </div>

          <!-- RIGHT: Python editor -->
          <div class="editor-pane">
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
                  :style="workerReady && !isRunning ? { borderColor: categoryColor + '70', color: categoryColor } : {}"
                  :disabled="!workerReady || isRunning"
                  :title="workerReady ? 'Run (Ctrl+Enter)' : 'Waiting for Python…'"
                  @click="runCode"
                >
                  <span aria-hidden="true">{{ isRunning ? '⟳' : '▶' }}</span>
                  {{ isRunning ? 'Running…' : 'Run' }}
                </button>
              </div>
            </div>

            <div ref="editorEl" class="editor-container" />

            <div class="output-pane">
              <div class="output-header">
                <span>Output</span>
                <button v-if="output" class="clear-btn" @click="output = ''; hasError = false">Clear</button>
              </div>
              <pre class="output-content" :class="{ 'has-error': hasError }">{{ outputDisplay }}</pre>
            </div>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import loader from '@monaco-editor/loader'

const props = defineProps({
  problem:       { type: Object, default: null },
  categoryColor: { type: String, default: '#58a6ff' },
})

const emit = defineEmits(['close', 'toggle-done'])

// ── Monaco editor ────────────────────────────────────────────────────────────

const editorEl = ref(null)
let editorInstance = null
let monacoRef = null

function getDefaultCode(problem) {
  return `# ${problem.title}\n# Difficulty: ${problem.difficulty}\n\nclass Solution:\n    def solve(self):\n        pass\n\n\n# Test your solution:\nsol = Solution()\nprint(sol.solve())\n`
}

async function initEditor(problem) {
  if (!editorEl.value) return

  if (!monacoRef) {
    monacoRef = await loader.init()
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

  if (!editorEl.value) return // guard: may have been hidden while awaiting

  editorInstance = monacoRef.editor.create(editorEl.value, {
    value: getDefaultCode(problem),
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

  editorInstance.addAction({
    id: 'run-python',
    label: 'Run Python',
    keybindings: [monacoRef.KeyMod.CtrlCmd | monacoRef.KeyCode.Enter],
    run: () => runCode(),
  })
}

function destroyEditor() {
  if (editorInstance) {
    editorInstance.dispose()
    editorInstance = null
  }
}

// ── Pyodide worker (module singleton) ───────────────────────────────────────

let _worker = null
const _callbacks = new Map()
let _nextId = 0

const workerReady = ref(false)

function ensureWorker() {
  if (_worker) return
  _worker = new Worker('/pyodide.worker.js')
  _worker.onmessage = ({ data }) => {
    if (data.type === 'ready') {
      workerReady.value = true
    } else if (data.type === 'result') {
      const resolve = _callbacks.get(data.id)
      if (resolve) {
        resolve(data)
        _callbacks.delete(data.id)
      }
    }
  }
  _worker.onerror = (err) => {
    console.error('[pyodide worker]', err)
  }
}

function runPython(code) {
  return new Promise((resolve) => {
    const id = ++_nextId
    _callbacks.set(id, resolve)
    _worker.postMessage({ id, code })
  })
}

// ── Run code ─────────────────────────────────────────────────────────────────

const output = ref('')
const hasError = ref(false)
const isRunning = ref(false)

const outputDisplay = computed(() =>
  output.value || '# Click "Run" to execute your code'
)

async function runCode() {
  if (!editorInstance || !workerReady.value || isRunning.value) return

  isRunning.value = true
  hasError.value = false
  output.value = ''

  const code = editorInstance.getValue()

  try {
    const { stdout, stderr, error } = await runPython(code)
    let text = ''
    if (stdout) text += stdout
    if (stderr) { text += stderr; hasError.value = true }
    if (error)  { text += (text ? '\n' : '') + error; hasError.value = true }
    output.value = text.trimEnd() || '(no output)'
  } catch (e) {
    output.value = String(e)
    hasError.value = true
  } finally {
    isRunning.value = false
  }
}

// ── Keyboard ─────────────────────────────────────────────────────────────────

function onKeyDown(e) {
  if (e.key === 'Escape') emit('close')
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

watch(() => props.problem, async (newProblem, oldProblem) => {
  if (newProblem) {
    ensureWorker()
    document.addEventListener('keydown', onKeyDown)

    if (!oldProblem) {
      // Panel opening
      output.value = ''
      hasError.value = false
      await nextTick()
      await initEditor(newProblem)
    } else if (newProblem.lc !== oldProblem.lc) {
      // Switching problems without closing the panel
      output.value = ''
      hasError.value = false
      if (editorInstance) {
        editorInstance.setValue(getDefaultCode(newProblem))
      }
    }
  } else {
    document.removeEventListener('keydown', onKeyDown)
    destroyEditor()
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeyDown)
  destroyEditor()
})
</script>

<style scoped>
/* ── Overlay ── */
.overlay {
  position: fixed;
  inset: 0;
  background: #0d1117;
  z-index: 50;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
  transform: scale(0.985);
}

/* ── Top bar ── */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.25rem;
  height: 48px;
  flex-shrink: 0;
  border-bottom: 1px solid;
  gap: 1rem;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  flex: 1;
  overflow: hidden;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-shrink: 0;
}

.badge {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 0.12rem 0.5rem;
  border-radius: 999px;
  letter-spacing: 0.02em;
  flex-shrink: 0;
}
.badge-Easy   { background: rgba(63,185,80,0.15);  color: #3fb950; }
.badge-Medium { background: rgba(210,153,34,0.15); color: #d29922; }
.badge-Hard   { background: rgba(248,81,73,0.15);  color: #f85149; }

.problem-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #e6edf3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.done-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  background: #21262d;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #8b949e;
  font-size: 0.8rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
  white-space: nowrap;
}
.done-btn:hover:not(.is-done) { border-color: #58a6ff; color: #c9d1d9; }

.close-btn {
  background: none;
  border: none;
  color: #6e7681;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem 0.4rem;
  border-radius: 6px;
  line-height: 1;
  transition: color 0.15s, background 0.15s;
}
.close-btn:hover { color: #e6edf3; background: #21262d; }

/* ── Main split ── */
.main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ── Info pane (left) ── */
.info-pane {
  width: 340px;
  flex-shrink: 0;
  border-right: 1px solid #21262d;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  scrollbar-width: thin;
  scrollbar-color: #30363d transparent;
}

.hint-section { display: flex; flex-direction: column; gap: 0.75rem; }

.hint-title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #6e7681;
}

.hint-icon { font-size: 0.95rem; line-height: 1; }

.hint-list { display: flex; flex-direction: column; gap: 0.6rem; list-style: none; }

.hint-item {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  font-size: 0.875rem;
  line-height: 1.55;
  color: #c9d1d9;
}

.hint-bullet {
  flex-shrink: 0;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  margin-top: 0.48rem;
  opacity: 0.75;
}

/* ── Editor pane (right) ── */
.editor-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  height: 40px;
  background: #161b22;
  border-bottom: 1px solid #21262d;
  flex-shrink: 0;
}

.editor-lang {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: #6e7681;
  letter-spacing: 0.02em;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.loading-py {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: #6e7681;
}

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
  padding: 0.3rem 0.8rem;
  background: none;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #6e7681;
  font-size: 0.8rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.run-btn.is-ready:hover { background: v-bind("categoryColor + '12'"); }
.run-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.editor-container {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

/* ── Output ── */
.output-pane {
  height: 190px;
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
  height: 32px;
  background: #161b22;
  border-bottom: 1px solid #21262d;
  font-size: 0.7rem;
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
  font-size: 0.7rem;
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
  padding: 0.75rem 1rem;
  margin: 0;
  font-family: 'Fira Code', 'SF Mono', 'Cascadia Code', monospace;
  font-size: 0.8rem;
  line-height: 1.65;
  color: #8b949e;
  background: #0d1117;
  white-space: pre-wrap;
  word-break: break-word;
  scrollbar-width: thin;
  scrollbar-color: #30363d transparent;
}
.output-content.has-error { color: #f85149; }

/* ── Responsive ── */
@media (max-width: 768px) {
  .main { flex-direction: column; }
  .info-pane {
    width: 100%;
    height: 220px;
    border-right: none;
    border-bottom: 1px solid #21262d;
    flex-shrink: 0;
  }
  .topbar-left .problem-title { display: none; }
}
</style>
