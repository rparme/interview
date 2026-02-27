<template>
  <div class="explain-panel">

    <!-- IDLE -->
    <div v-if="recordingState === 'idle'" class="state-idle">
      <div class="blurb">
        <div class="blurb-title">Explain your approach</div>
        <div class="blurb-body">
          Before you code, explain your thinking out loud — just like a real interview.<br>
          Describe the pattern, why it fits, and any complexity tradeoffs.
        </div>
        <div v-if="transcript" class="transcript-preview">
          <div class="transcript-label">previous transcript</div>
          <div class="transcript-text">{{ transcript }}</div>
        </div>
      </div>
      <div class="idle-actions">
        <button
          v-if="isSpeechSupported"
          class="rec-btn rec-start"
          @click="$emit('start')"
        >
          <span class="rec-dot" aria-hidden="true" />
          Start Recording
        </button>
        <span v-else class="unsupported-note">
          ⚠ Web Speech API not supported in this browser
        </span>
        <button
          v-if="transcript"
          class="analyze-btn-inline"
          @click="$emit('submit')"
        >→ Analyze transcript</button>
      </div>
    </div>

    <!-- RECORDING -->
    <div v-else-if="recordingState === 'recording'" class="state-recording">
      <div class="recording-indicator">
        <span class="rec-pulse" aria-hidden="true" />
        <span class="recording-label">recording…</span>
      </div>
      <div class="live-transcript">
        <span class="final-text">{{ transcript }}</span>
        <span v-if="interimText" class="interim-text">{{ interimText }}</span>
        <span v-if="!transcript && !interimText" class="placeholder-text">Start speaking…</span>
      </div>
      <div class="recording-actions">
        <button class="rec-btn rec-stop" @click="$emit('stop')">
          <span class="stop-icon" aria-hidden="true">■</span>
          Stop
        </button>
        <button
          class="analyze-btn-inline"
          :disabled="!transcript.trim()"
          @click="$emit('submit')"
        >→ Analyze</button>
        <button
          v-if="transcript"
          class="clear-btn"
          @click="$emit('clear')"
        >✕ Clear</button>
      </div>
    </div>

    <!-- REVIEWING -->
    <div v-else-if="recordingState === 'reviewing'" class="state-reviewing">
      <div class="analyzing-indicator">
        <span class="spinner" aria-hidden="true" />
        <span class="analyzing-label">analyzing<span class="dots"><span>.</span><span>.</span><span>.</span></span></span>
      </div>
    </div>

    <!-- DONE -->
    <div v-else-if="recordingState === 'done'" class="state-done">

      <div v-if="reviewError" class="review-error">
        <span class="error-icon">!</span> {{ reviewError }}
      </div>

      <div v-if="reviewResult" class="done-layout">

        <!-- Left: transcript -->
        <div class="transcript-panel">
          <div class="transcript-panel-label">your explanation</div>
          <div class="transcript-panel-text">{{ transcript }}</div>
        </div>

        <!-- Right: score card -->
        <div class="score-card">
          <div class="score-overall">
            <span class="score-label">Overall</span>
            <span class="score-value">{{ reviewResult.overall }}<span class="score-max"> / 10</span></span>
          </div>

          <div class="score-bars">
            <div v-for="(val, key) in reviewResult.dimensions" :key="key" class="score-bar-row">
              <span class="bar-label">{{ key }}</span>
              <div class="bar-outer">
                <div class="bar-inner" :style="{ width: val * 10 + '%' }" />
              </div>
              <span class="bar-num">{{ val }}</span>
            </div>
          </div>

          <div v-if="reviewResult.summary" class="score-summary">
            "{{ reviewResult.summary }}"
          </div>

          <div v-if="reviewResult.strengths?.length" class="score-list score-strengths">
            <div
              v-for="(s, i) in reviewResult.strengths"
              :key="i"
              class="score-list-item strength"
            >
              <span class="list-icon" aria-hidden="true">✓</span> {{ s }}
            </div>
          </div>

          <div v-if="reviewResult.improve?.length" class="score-list score-improve">
            <div
              v-for="(s, i) in reviewResult.improve"
              :key="i"
              class="score-list-item improve"
            >
              <span class="list-icon" aria-hidden="true">△</span> {{ s }}
            </div>
          </div>
        </div>
      </div>

      <div class="done-actions">
        <button class="rec-btn rec-reset" @click="$emit('reset')">
          ↺ Record again
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
const props = defineProps({
  recordingState:    { type: String, required: true },
  transcript:        { type: String, default: '' },
  interimText:       { type: String, default: '' },
  reviewResult:      { type: Object, default: null },
  reviewError:       { type: String, default: null },
  isSpeechSupported: { type: Boolean, default: false },
})

defineEmits(['start', 'stop', 'submit', 'reset', 'clear'])
</script>

<style scoped>
.explain-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 1.5rem 1.75rem;
  font-family: 'Fira Code', 'SF Mono', monospace;
  font-size: 0.82rem;
  color: #c9d1d9;
  background: #0d1117;
  scrollbar-width: thin;
  scrollbar-color: #30363d transparent;
}

/* ── Idle ── */
.blurb { max-width: 520px; }
.blurb-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: #e6edf3;
  margin-bottom: 0.5rem;
  letter-spacing: 0.02em;
}
.blurb-body {
  color: #6e7681;
  line-height: 1.65;
  font-size: 0.8rem;
  margin-bottom: 1.25rem;
}

.transcript-preview {
  margin-bottom: 1rem;
  padding: 0.65rem 0.85rem;
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 4px;
}
.transcript-label {
  font-size: 0.65rem;
  color: #484f58;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.35rem;
}
.transcript-text {
  color: #8b949e;
  line-height: 1.6;
  white-space: pre-wrap;
}

.idle-actions { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }

/* ── Recording ── */
.state-recording { display: flex; flex-direction: column; gap: 1rem; }

.recording-indicator {
  display: flex; align-items: center; gap: 0.55rem;
  font-size: 0.75rem; color: #f85149;
}
.rec-pulse {
  display: inline-block; width: 8px; height: 8px;
  background: #f85149; border-radius: 50%;
  animation: pulse 1.2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.4; transform: scale(0.75); }
}
.recording-label { font-size: 0.72rem; color: #f85149; font-weight: 600; }

.live-transcript {
  min-height: 80px;
  padding: 0.75rem 0.9rem;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 4px;
  line-height: 1.65;
  color: #c9d1d9;
  white-space: pre-wrap;
}
.interim-text { color: #484f58; font-style: italic; }
.placeholder-text { color: #30363d; font-style: italic; }

.recording-actions { display: flex; align-items: center; gap: 0.75rem; }

/* ── Reviewing ── */
.state-reviewing {
  flex: 1; display: flex; align-items: center; justify-content: center;
}
.analyzing-indicator {
  display: flex; align-items: center; gap: 0.55rem;
  font-size: 0.8rem; color: #6e7681;
}
.analyzing-label { display: flex; align-items: baseline; gap: 0; }
.dots span {
  animation: blink 1.4s infinite;
  opacity: 0;
}
.dots span:nth-child(1) { animation-delay: 0s; }
.dots span:nth-child(2) { animation-delay: 0.2s; }
.dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink { 0%, 80%, 100% { opacity: 0; } 40% { opacity: 1; } }

/* ── Done ── */
.state-done { display: flex; flex-direction: column; gap: 1.25rem; }

.done-layout {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

.transcript-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.transcript-panel-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #484f58;
}
.transcript-panel-text {
  padding: 0.65rem 0.8rem;
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 4px;
  color: #8b949e;
  font-size: 0.79rem;
  line-height: 1.65;
  white-space: pre-wrap;
}

.review-error {
  display: flex; align-items: flex-start; gap: 0.4rem;
  padding: 0.55rem 0.75rem;
  background: rgba(248,81,73,0.07);
  border: 1px solid rgba(248,81,73,0.2);
  border-radius: 4px;
  color: #f0857a;
  font-size: 0.78rem;
}
.error-icon { color: #f85149; font-weight: 700; flex-shrink: 0; }

/* ── Score card ── */
.score-card {
  display: flex; flex-direction: column; gap: 1rem;
  max-width: 520px;
}

.score-overall {
  display: flex; align-items: baseline; gap: 0.6rem;
}
.score-label {
  font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em;
  color: #484f58;
}
.score-value {
  font-size: 1.6rem; font-weight: 700; color: #e6edf3;
  line-height: 1;
}
.score-max { font-size: 0.9rem; color: #6e7681; font-weight: 400; }

.score-bars { display: flex; flex-direction: column; gap: 0.55rem; }
.score-bar-row {
  display: flex; align-items: center; gap: 0.75rem;
  font-size: 0.78rem;
}
.bar-label {
  width: 72px; flex-shrink: 0;
  color: #8b949e; text-transform: capitalize; font-size: 0.75rem;
}
.bar-outer {
  flex: 1; height: 4px;
  background: #21262d; border-radius: 2px; overflow: hidden;
}
.bar-inner {
  height: 100%; background: #58a6ff; border-radius: 2px;
  transition: width 0.5s ease;
}
.bar-num {
  width: 14px; text-align: right; flex-shrink: 0;
  color: #6e7681; font-size: 0.75rem;
}

.score-summary {
  color: #8b949e;
  font-style: italic;
  font-size: 0.8rem;
  line-height: 1.6;
  padding: 0.5rem 0;
  border-top: 1px solid #21262d;
  border-bottom: 1px solid #21262d;
}

.score-list { display: flex; flex-direction: column; gap: 0.3rem; }
.score-list-item {
  display: flex; align-items: flex-start; gap: 0.5rem;
  font-size: 0.79rem; line-height: 1.5;
}
.list-icon { flex-shrink: 0; width: 14px; }
.strength { color: #c9d1d9; }
.strength .list-icon { color: #3fb950; }
.improve  { color: #8b949e; }
.improve  .list-icon { color: #d29922; }

.done-actions { display: flex; align-items: center; gap: 0.75rem; }

/* ── Shared buttons ── */
.rec-btn {
  display: inline-flex; align-items: center; gap: 0.45rem;
  padding: 0.3rem 0.85rem;
  background: none; border-radius: 4px;
  font-family: inherit; font-size: 0.78rem; font-weight: 600;
  cursor: pointer; transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.rec-start {
  border: 1px solid rgba(248,81,73,0.4); color: #f85149;
}
.rec-start:hover { background: rgba(248,81,73,0.08); border-color: #f85149; }

.rec-stop {
  border: 1px solid #30363d; color: #8b949e;
}
.rec-stop:hover { border-color: #58a6ff; color: #58a6ff; }

.rec-reset {
  border: 1px solid #30363d; color: #6e7681;
}
.rec-reset:hover { border-color: #58a6ff; color: #58a6ff; }

.rec-dot {
  display: inline-block; width: 8px; height: 8px;
  background: currentColor; border-radius: 50; flex-shrink: 0;
}
.stop-icon { font-size: 0.65rem; }

.analyze-btn-inline {
  display: inline-flex; align-items: center;
  padding: 0.3rem 0.85rem;
  background: none;
  border: 1px solid rgba(88,166,255,0.35);
  border-radius: 4px; color: #58a6ff;
  font-family: inherit; font-size: 0.78rem; font-weight: 600;
  cursor: pointer; transition: background 0.15s, border-color 0.15s;
}
.analyze-btn-inline:hover:not(:disabled) {
  background: rgba(88,166,255,0.07); border-color: #58a6ff;
}
.analyze-btn-inline:disabled { opacity: 0.35; cursor: not-allowed; }

.clear-btn {
  display: inline-flex; align-items: center;
  padding: 0.3rem 0.65rem;
  background: none;
  border: 1px solid #30363d;
  border-radius: 4px; color: #484f58;
  font-family: inherit; font-size: 0.75rem;
  cursor: pointer; transition: border-color 0.15s, color 0.15s;
  margin-left: auto;
}
.clear-btn:hover { border-color: #f85149; color: #f85149; }

.unsupported-note {
  font-size: 0.76rem; color: #6e7681;
  padding: 0.3rem 0;
}

/* ── Spinner ── */
.spinner {
  display: inline-block; width: 12px; height: 12px;
  border: 1.5px solid #30363d; border-top-color: #58a6ff;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
