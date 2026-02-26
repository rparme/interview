<template>
  <div class="output-pane" :style="{ height: height + 'px' }">
    <!-- Horizontal resize handle at top edge -->
    <div class="output-resize-handle" @mousedown.prevent="$emit('resize-start', $event)" />

    <!-- Plain header when no tests ran and no complexity state -->
    <div v-if="!testResults.length && !analysisResult && !analysisError && !isAnalyzing" class="output-header">
      <span>Output</span>
      <button v-if="output" class="clear-btn" @click="$emit('clear')">Clear</button>
    </div>

    <!-- Tab bar when tests ran or complexity active -->
    <div v-else class="output-tabs">
      <div class="output-tabs-scroll" @wheel.prevent="e => e.currentTarget.scrollLeft += e.deltaY">
        <button
          v-if="output"
          class="out-tab"
          :class="{ 'out-tab-active': activeTestTab === '__console__' }"
          @click="$emit('update:activeTestTab', '__console__')"
        >Console</button>
        <button
          v-for="r in testResults"
          :key="r.name"
          class="out-tab"
          :class="[{ 'out-tab-active': activeTestTab === r.name }, `out-tab-${r.status}`]"
          @click="$emit('update:activeTestTab', r.name)"
        >
          <span class="out-tab-indicator">{{ r.status === 'pass' ? '✓' : r.status === 'fail' || r.status === 'error' ? '✗' : '·' }}</span>
          {{ r.name }}
        </button>
        <button
          v-if="analysisResult || analysisError || isAnalyzing"
          class="out-tab complexity-tab"
          :class="{ 'out-tab-active': activeTestTab === '__complexity__' }"
          @click="$emit('select-complexity')"
        >
          <span
            class="out-tab-dot"
            :class="{
              'complexity-dot-analyzing': isAnalyzing,
              'complexity-dot-done':     analysisResult && !isAnalyzing,
              'complexity-dot-error':    analysisError  && !isAnalyzing,
            }"
          />
          <span class="complexity-tab-label">∑ cmplx</span>
        </button>
      </div>
      <button class="clear-btn tabs-clear-btn" @click="$emit('clear')">Clear</button>
    </div>

    <!-- Content -->
    <div class="output-scroll">
      <!-- Complexity tab content -->
      <template v-if="activeTestTab === '__complexity__'">
        <!-- Loading -->
        <div v-if="isAnalyzing" class="complexity-loading">
          <span class="complexity-spinner-ring" aria-hidden="true" />
          <span class="complexity-loading-text">analyzing…</span>
        </div>

        <!-- Result -->
        <div v-else-if="analysisResult" class="tab-body">
          <div class="complexity-metrics">
            <div class="complexity-metric">
              <span class="complexity-metric-key">time</span>
              <code class="complexity-metric-val">{{ analysisResult.timeComplexity }}</code>
            </div>
            <div class="complexity-metric-sep" aria-hidden="true" />
            <div class="complexity-metric">
              <span class="complexity-metric-key">space</span>
              <code class="complexity-metric-val">{{ analysisResult.spaceComplexity }}</code>
            </div>
          </div>
          <pre class="output-content complexity-explanation">{{ analysisResult.explanation }}</pre>
        </div>

        <!-- Error -->
        <div v-else-if="analysisError" class="complexity-error">
          <span class="complexity-error-glyph" aria-hidden="true">✕</span>
          <pre class="complexity-error-msg">{{ analysisError }}</pre>
        </div>
      </template>
      <template v-else-if="testResults.length">
        <pre v-if="activeTestTab === '__console__'" class="output-content" :class="{ 'has-error': hasError }">{{ output.trimEnd() || '(no output)' }}</pre>
        <template v-for="r in testResults" :key="r.name">
          <div v-if="activeTestTab === r.name" class="tab-body">
            <div v-if="parsedTestCases[r.name]" class="tab-meta">
              <span class="tab-meta-key">In</span>
              <code class="tab-meta-val">{{ parsedTestCases[r.name].input }}</code>
              <span class="tab-meta-arrow">→</span>
              <span class="tab-meta-key">Expected</span>
              <code class="tab-meta-val">{{ parsedTestCases[r.name].expected }}</code>
            </div>
            <pre v-if="r.stdout?.trim() || r.message" class="output-content" :class="r.status !== 'pass' ? 'has-error' : ''">{{ [r.stdout?.trimEnd(), r.message].filter(Boolean).join('\n') }}</pre>
            <div v-else class="tob-empty">No output — test passed cleanly.</div>
          </div>
        </template>
      </template>
      <pre v-else class="output-content" :class="{ 'has-error': hasError }">{{ outputDisplay }}</pre>
    </div>
  </div>
</template>

<script setup>
defineProps({
  height:         { type: Number, required: true },
  output:         { type: String, default: '' },
  hasError:       { type: Boolean, default: false },
  outputDisplay:  { type: String, default: '' },
  testResults:    { type: Array, default: () => [] },
  activeTestTab:  { type: String, default: null },
  parsedTestCases:{ type: Object, default: () => ({}) },
  analysisResult: { type: Object, default: null },
  analysisError:  { type: String, default: null },
  isAnalyzing:    { type: Boolean, default: false },
})

defineEmits(['resize-start', 'update:activeTestTab', 'clear', 'select-complexity'])
</script>

<style scoped>
.output-pane {
  flex-shrink: 0;
  border-top: 1px solid #21262d;
  display: flex;
  flex-direction: column;
  position: relative;
}

.output-resize-handle {
  position: absolute;
  top: -4px;
  left: 0;
  right: 0;
  height: 8px;
  cursor: row-resize;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.output-resize-handle::after {
  content: '';
  height: 2px;
  width: 28px;
  border-radius: 1px;
  background: #30363d;
  transition: background 0.15s, width 0.15s;
}
.output-resize-handle:hover::after,
.output-resize-handle:active::after {
  background: #58a6ff;
  width: 40px;
}
.output-resize-handle:hover,
.output-resize-handle:active {
  background: rgba(88, 166, 255, 0.08);
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

.output-scroll {
  flex: 1;
  overflow-y: auto;
  background: #0d1117;
  scrollbar-width: thin;
  scrollbar-color: #30363d transparent;
  display: flex;
  flex-direction: column;
}

.output-content {
  flex: 1;
  padding: 0.6rem 1rem;
  margin: 0;
  font-family: 'Fira Code', 'SF Mono', 'Cascadia Code', monospace;
  font-size: 0.78rem;
  line-height: 1.65;
  color: #8b949e;
  white-space: pre-wrap;
  word-break: break-word;
}
.output-content.has-error { color: #f85149; }

/* Tab bar */
.output-tabs {
  display: flex;
  align-items: stretch;
  height: 28px;
  background: #161b22;
  border-bottom: 1px solid #21262d;
  flex-shrink: 0;
}

.output-tabs-scroll {
  flex: 1;
  display: flex;
  align-items: stretch;
  overflow-x: auto;
  min-width: 0;
  scrollbar-width: thin;
  scrollbar-color: #30363d transparent;
}
.output-tabs-scroll::-webkit-scrollbar { height: 3px; }
.output-tabs-scroll::-webkit-scrollbar-track { background: transparent; }
.output-tabs-scroll::-webkit-scrollbar-thumb { background: #30363d; border-radius: 2px; }

.out-tab {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0 0.75rem;
  background: none;
  border: none;
  border-right: 1px solid #21262d;
  color: #6e7681;
  font-size: 0.7rem;
  font-family: 'Fira Code', 'SF Mono', monospace;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.12s, background 0.12s;
  flex-shrink: 0;
}
.out-tab:hover { background: #1c2128; color: #c9d1d9; }
.out-tab-active { background: #0d1117 !important; color: #e6edf3 !important; border-bottom: 2px solid #58a6ff; }

.out-tab-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #484f58;
  flex-shrink: 0;
}
.out-tab-indicator {
  font-size: 0.6rem;
  font-weight: 700;
  flex-shrink: 0;
  color: #484f58;
}
.out-tab-pass .out-tab-indicator { color: #3fb950; }
.out-tab-fail .out-tab-indicator,
.out-tab-error .out-tab-indicator { color: #f85149; }

.tabs-clear-btn {
  flex-shrink: 0;
  border-left: 1px solid #21262d;
  padding: 0 0.6rem;
}

.tab-body { flex: 1; display: flex; flex-direction: column; }

.tab-meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 1rem;
  background: #161b22;
  border-bottom: 1px solid #21262d;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.tab-meta-key {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #484f58;
  flex-shrink: 0;
}
.tab-meta-val {
  font-family: 'Fira Code', 'SF Mono', monospace;
  font-size: 0.75rem;
  color: #a5d6ff;
  background: #21262d;
  padding: 0.1em 0.4em;
  border-radius: 4px;
}
.tab-meta-arrow { color: #3d444d; font-size: 0.8rem; flex-shrink: 0; }

.tob-empty {
  padding: 0.6rem 1rem;
  color: #484f58;
  font-size: 0.75rem;
  font-style: italic;
  font-family: 'Fira Code', 'SF Mono', monospace;
}

/* ── Complexity tab dot states ── */
.complexity-dot-analyzing {
  background: #e5c07b !important;
  animation: complexity-pulse 1s ease-in-out infinite;
}
.complexity-dot-done    { background: #e5c07b !important; }
.complexity-dot-error   { background: #f85149 !important; }

@keyframes complexity-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.35; }
}

/* Tab label in monospace, tighter */
.complexity-tab-label {
  font-family: 'Fira Code', 'SF Mono', monospace;
  font-size: 0.67rem;
  letter-spacing: 0.02em;
}

/* ── Loading state ── */
.complexity-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: #6e7681;
  font-family: 'Fira Code', 'SF Mono', monospace;
}

.complexity-spinner-ring {
  display: block;
  width: 18px;
  height: 18px;
  border: 1.5px solid #21262d;
  border-top-color: #e5c07b;
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
}

.complexity-loading-text {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  color: #484f58;
}

/* ── Result metrics grid ── */
.complexity-metrics {
  display: flex;
  align-items: stretch;
  background: #161b22;
  border-bottom: 1px solid #21262d;
  flex-shrink: 0;
}

.complexity-metric {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.55rem 1rem;
}

.complexity-metric-sep {
  width: 1px;
  background: #21262d;
  flex-shrink: 0;
  margin: 0.4rem 0;
}

.complexity-metric-key {
  font-size: 0.58rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #484f58;
}

.complexity-metric-val {
  font-family: 'Fira Code', 'SF Mono', monospace;
  font-size: 0.92rem;
  font-weight: 500;
  color: #e5c07b;
  background: none;
  padding: 0;
  border-radius: 0;
  line-height: 1.2;
}

/* ── Explanation block ── */
.complexity-explanation {
  border-left: 2px solid #21262d;
  margin-left: 1rem;
  padding-left: 0.85rem;
  color: #8b949e;
}

/* ── Error state ── */
.complexity-error {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  margin: 0.5rem;
  background: rgba(248, 81, 73, 0.06);
  border: 1px solid rgba(248, 81, 73, 0.18);
  border-radius: 4px;
}

.complexity-error-glyph {
  font-size: 0.7rem;
  color: #f85149;
  flex-shrink: 0;
  margin-top: 0.1rem;
  font-family: 'Fira Code', 'SF Mono', monospace;
}

.complexity-error-msg {
  margin: 0;
  font-family: 'Fira Code', 'SF Mono', monospace;
  font-size: 0.76rem;
  color: #f0857a;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.55;
}
</style>
