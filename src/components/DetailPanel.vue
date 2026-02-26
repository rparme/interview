<template>
  <div class="problem-panel" :style="{ width: width + 'px' }">
    <div class="resize-handle" @mousedown.prevent="$emit('resize-start', $event)" />

    <!-- ── Mode: generating problem (step 1) ── -->
    <div v-if="panelMode === 'loading'" class="panel-loading">
      <pre class="panel-anim-code" aria-hidden="true">{{ panelAnimText }}</pre>
      <span class="panel-anim-status">{{ generationStatus }}<span class="anim-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></span>
    </div>

    <!-- ── Mode: generated AI problem ── -->
    <template v-else-if="panelMode === 'generated' && generatedProblem">
      <div class="panel-topbar">
        <span class="panel-badge" :class="`badge-${generatedProblem.difficulty ?? difficultyGuess}`">{{ generatedProblem.difficulty ?? difficultyGuess }}</span>
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
                <button class="toggle-tests-btn" @click="$emit('update:showTests', !showTests)">
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
              @click="$emit('update:expandedTest', expandedTest === name ? null : name)"
            >
              <div class="test-item-main">
                <span class="test-status-icon">
                  <span v-if="isRunning" class="spinner spinner-xs" />
                  <span v-else-if="testResultFor(name)?.status === 'pass'" class="icon-pass">✓</span>
                  <span v-else-if="testResultFor(name)?.status === 'fail' || testResultFor(name)?.status === 'error'" class="icon-fail">✗</span>
                  <span v-else class="icon-pending">○</span>
                </span>
                <div class="test-name-col">
                  <span class="test-name">{{ formatTestName(name) }}</span>
                  <span v-if="parsedTestCases[name]" class="test-io-row">
                    <span class="test-io-key">In</span><code class="test-io-val">{{ parsedTestCases[name].input }}</code>
                    <span class="test-io-arrow">→</span>
                    <span class="test-io-key">Exp</span><code class="test-io-val">{{ parsedTestCases[name].expected }}</code>
                  </span>
                </div>
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

        <section v-if="selectedExercise.whenTo?.length" class="panel-section">
          <h3 class="section-label">When to use</h3>
          <div class="hint-block">
            <ul class="hint-list">
              <li v-for="(item, i) in selectedExercise.whenTo" :key="i">{{ item }}</li>
            </ul>
          </div>
        </section>

        <section v-if="selectedExercise.howTo?.length" class="panel-section">
          <h3 class="section-label">How to approach</h3>
          <div class="hint-block">
            <ul class="hint-list">
              <li v-for="(item, i) in selectedExercise.howTo" :key="i">{{ item }}</li>
            </ul>
          </div>
        </section>

        <div v-if="!selectedExercise.whenTo && !selectedExercise.howTo" class="detail-empty">
          No hints available for this exercise.
        </div>
      </div>
    </template>

    <!-- ── Mode: empty ── -->
    <div v-else class="panel-empty">
      <div class="empty-icon">◇</div>
      <p>Click an exercise to view details</p>
      <p class="empty-sub">Or generate an AI problem using the bar above the editor.</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  width:              { type: Number, required: true },
  panelMode:          { type: String, default: 'empty' },
  generatedProblem:   { type: Object, default: null },
  selectedExercise:   { type: Object, default: null },
  descriptionHtml:    { type: String, default: '' },
  difficultyGuess:    { type: String, default: 'Medium' },
  panelAnimText:      { type: String, default: '' },
  generationStatus:   { type: String, default: '' },
  isGenerating:       { type: Boolean, default: false },
  isGeneratingTests:  { type: Boolean, default: false },
  isRunning:          { type: Boolean, default: false },
  showTests:          { type: Boolean, default: false },
  testResults:        { type: Array, default: () => [] },
  parsedTestNames:    { type: Array, default: () => [] },
  parsedTestCases:    { type: Object, default: () => ({}) },
  allTestsPassing:    { type: Boolean, default: false },
  expandedTest:       { type: String, default: null },
  testResultFor:      { type: Function, required: true },
  formatTestName:     { type: Function, required: true },
  testSourceFor:      { type: Function, required: true },
})

defineEmits(['resize-start', 'update:showTests', 'update:expandedTest'])
</script>

<style scoped>
/* ── Right: detail panel ── */
.problem-panel {
  flex-shrink: 0;
  position: relative;
  border-left: 1px solid #21262d;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.resize-handle {
  position: absolute;
  left: -2px;
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
.resize-handle::after {
  content: '';
  width: 2px;
  height: 28px;
  border-radius: 1px;
  background: #30363d;
  transition: background 0.15s, height 0.15s;
}
.resize-handle:hover::after,
.resize-handle:active::after {
  background: #58a6ff;
  height: 40px;
}
.resize-handle:hover,
.resize-handle:active {
  background: rgba(88, 166, 255, 0.08);
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
.badge-Easy   { background: rgba(63,185,80,0.15);  color: #3fb950; }
.badge-Medium { background: rgba(210,153,34,0.15); color: #d29922; }
.badge-Hard   { background: rgba(248,81,73,0.15);  color: #f85149; }

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

/* Markdown body styles */
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
  border-radius: 4px;
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
  border-radius: 4px;
  padding: 0.65rem 0.75rem;
  font-family: 'Fira Code', 'SF Mono', monospace;
  font-size: 0.72rem;
  line-height: 1.6;
  color: #8b949e;
  white-space: pre;
  overflow-x: auto;
  margin: 0;
}

/* Panel loading state */
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
  border-radius: 4px;
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

/* Unit tests */
.tests-header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tests-status {
  font-family: 'Fira Code', 'SF Mono', monospace;
  font-size: 0.67rem;
  color: #3d444d;
  letter-spacing: 0.02em;
}

.tests-summary {
  font-size: 0.63rem;
  font-weight: 700;
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
}
.tests-all-pass  { color: #3fb950; background: rgba(63,185,80,0.12); }
.tests-some-fail { color: #f85149; background: rgba(248,81,73,0.12); }

.tests-loading-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0;
  color: #6e7681;
  font-size: 0.75rem;
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

.spinner-xs {
  width: 7px;
  height: 7px;
  border-width: 1.5px;
}

.test-list {
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
}

.test-item {
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 4px;
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

.test-name-col {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex: 1;
  min-width: 0;
}

.test-name {
  font-size: 0.78rem;
  font-family: 'Fira Code', 'SF Mono', monospace;
  color: #8b949e;
  line-height: 1.3;
}
.test-item.test-pass .test-name { color: #3fb950; }
.test-item.test-fail .test-name { color: #f85149; }

.test-io-row {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-wrap: wrap;
  min-width: 0;
}
.test-io-key {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #484f58;
  flex-shrink: 0;
}
.test-io-val {
  font-family: 'Fira Code', 'SF Mono', monospace;
  font-size: 0.68rem;
  color: #8b949e;
  background: #0d1117;
  padding: 0.05em 0.3em;
  border-radius: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
}
.test-io-arrow { color: #3d444d; font-size: 0.7rem; flex-shrink: 0; }

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
  border-radius: 4px;
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

/* Predefined exercise details */
.platform-link {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.85rem;
  border-radius: 4px;
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

.hint-block {
  background: rgba(255,255,255,0.015);
  border: 1px solid #21262d;
  border-radius: 4px;
  overflow: hidden;
}
.hint-block::before {
  content: '┌';
  display: block;
  padding: 0.4rem 0.75rem 0;
  font-family: 'Fira Code', 'SF Mono', monospace;
  font-size: 0.72rem;
  color: #3d444d;
  line-height: 1;
  user-select: none;
}
.hint-block::after {
  content: '└';
  display: block;
  padding: 0 0.75rem 0.4rem;
  font-family: 'Fira Code', 'SF Mono', monospace;
  font-size: 0.72rem;
  color: #3d444d;
  line-height: 1;
  user-select: none;
}
.hint-list {
  list-style: none;
  margin: 0;
  padding: 0.15rem 0.75rem 0.15rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.hint-list li {
  font-size: 0.82rem;
  color: #8b949e;
  line-height: 1.6;
  padding-left: 1rem;
  position: relative;
}
.hint-list li::before {
  content: '·';
  position: absolute;
  left: 0.2rem;
  color: #3d444d;
  font-family: 'Fira Code', 'SF Mono', monospace;
}

.detail-empty {
  font-size: 0.78rem;
  color: #3d444d;
  font-style: italic;
  padding: 0.5rem 0;
}

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

@media (max-width: 900px) {
  .problem-panel { display: none; }
}
</style>
