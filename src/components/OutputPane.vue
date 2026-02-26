<template>
  <div class="output-pane" :style="{ height: height + 'px' }">
    <!-- Horizontal resize handle at top edge -->
    <div class="output-resize-handle" @mousedown.prevent="$emit('resize-start', $event)" />

    <!-- Plain header when no tests ran -->
    <div v-if="!testResults.length" class="output-header">
      <span>Output</span>
      <button v-if="output" class="clear-btn" @click="$emit('clear')">Clear</button>
    </div>

    <!-- Tab bar when tests ran -->
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
          <span class="out-tab-dot" />
          {{ r.name }}
        </button>
      </div>
      <button class="clear-btn tabs-clear-btn" @click="$emit('clear')">Clear</button>
    </div>

    <!-- Content -->
    <div class="output-scroll">
      <template v-if="testResults.length">
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
})

defineEmits(['resize-start', 'update:activeTestTab', 'clear'])
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
  top: -3px;
  left: 0;
  right: 0;
  height: 6px;
  cursor: row-resize;
  z-index: 10;
}
.output-resize-handle:hover {
  background: #58a6ff40;
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
.out-tab-pass .out-tab-dot { background: #3fb950; }
.out-tab-fail .out-tab-dot,
.out-tab-error .out-tab-dot { background: #f85149; }

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
</style>
