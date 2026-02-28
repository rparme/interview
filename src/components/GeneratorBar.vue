<template>
  <div class="generator-bar" :class="{ 'is-generating': isGenerating }">
    <div class="gen-chips">
      <span
        v-for="lc in selectedForAI"
        :key="lc"
        class="gen-chip"
        :style="{ borderColor: categoryColor + '60', color: categoryColor }"
      >
        {{ problemByLc(lc)?.title }}
        <button class="chip-remove" @click="$emit('remove-ai-chip', lc)" aria-label="Remove">✕</button>
      </span>
      <span
        v-for="id in selectedGenForAI"
        :key="id"
        class="gen-chip"
        :style="{ borderColor: categoryColor + '60', color: categoryColor }"
      >
        {{ savedExercises.find(e => e.id === id)?.title }}
        <button class="chip-remove" @click="$emit('remove-gen-chip', id)" aria-label="Remove">✕</button>
      </span>
      <span v-if="!selectedForAI.size && !selectedGenForAI.size" class="gen-hint">
        Optionally check problems as context →
      </span>
    </div>
    <div class="gen-controls">
      <select
        :value="businessField"
        class="business-select"
        :disabled="generationBlocked"
        @change="$emit('update:businessField', $event.target.value)"
      >
        <option value="">No theme</option>
        <option v-for="field in businessFields" :key="field" :value="field">{{ field }}</option>
      </select>
      <button
        class="generate-btn"
        :class="{ 'is-loading': isGenerating, 'is-blocked': generationBlocked && !hasBackgroundJob }"
        :style="!isGenerating && !generationBlocked ? { borderColor: categoryColor + '80', color: categoryColor } : {}"
        :disabled="isGenerating || generationBlocked"
        :title="hasBackgroundJob ? 'A problem is generating in the background' : generationBlocked ? 'Subscribe to generate more exercises' : undefined"
        @click="$emit('generate')"
      >
        <span class="gen-prompt" aria-hidden="true">{{ generationBlocked && !hasBackgroundJob ? '⊘' : '&gt;_' }}</span>
        <span v-if="isGenerating">{{ generationStatus }}<span class="anim-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></span>
        <span v-else-if="hasBackgroundJob"><span class="spinner spinner-bg" aria-hidden="true" />{{ backgroundStatus || 'generating' }}<span class="anim-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></span>
        <span v-else-if="generationBlocked">subscribe to generate more</span>
        <span v-else>generate</span>
      </button>
    </div>
  </div>

  <div v-if="generationError" class="gen-error">
    {{ generationError }}
  </div>
</template>

<script setup>
defineProps({
  selectedForAI:    { type: Set, required: true },
  selectedGenForAI: { type: Set, required: true },
  savedExercises:   { type: Array, default: () => [] },
  categoryColor:    { type: String, default: '#58a6ff' },
  isGenerating:     { type: Boolean, default: false },
  generationBlocked:{ type: Boolean, default: false },
  hasBackgroundJob: { type: Boolean, default: false },
  backgroundStatus: { type: String, default: '' },
  generationStatus: { type: String, default: '' },
  generationError:  { type: String, default: null },
  businessField:    { type: String, default: '' },
  businessFields:   { type: Array, default: () => [] },
  problemByLc:      { type: Function, required: true },
})

defineEmits(['update:businessField', 'remove-ai-chip', 'remove-gen-chip', 'generate'])
</script>

<style scoped>
.generator-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 1rem;
  border-bottom: 1px solid #21262d;
  background: #0d1117;
  flex-shrink: 0;
  flex-wrap: wrap;
  position: relative;
}
.generator-bar.is-generating .gen-controls {
  pointer-events: none;
  opacity: 0.45;
}
.generator-bar.is-generating .gen-chips {
  pointer-events: none;
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

.gen-hint { font-size: 0.75rem; color: #6e7681; font-style: italic; }

.gen-controls { display: flex; align-items: center; gap: 0.6rem; flex-shrink: 0; }

.business-select {
  background: none;
  border: 1px solid #30363d;
  border-radius: 4px;
  color: #6e7681;
  font-size: 0.78rem;
  font-weight: 500;
  font-family: 'Fira Code', 'SF Mono', monospace;
  padding: 0.28rem 0.5rem 0.28rem 0.7rem;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s, color 0.15s;
}
.business-select:hover, .business-select:focus { border-color: #58a6ff; color: #c9d1d9; }
.business-select option { background: #161b22; color: #c9d1d9; font-family: inherit; }

.generate-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.28rem 0.85rem 0.28rem 0.7rem;
  background: none;
  border: 1px solid #30363d;
  border-radius: 4px;
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
.generate-btn:disabled:not(.is-blocked) { opacity: 0.5; cursor: not-allowed; }
.generate-btn.is-loading { color: #6e7681; border-color: #30363d; }
.generate-btn.is-blocked {
  cursor: not-allowed;
  color: #8b949e;
  border-color: #30363d;
  opacity: 0.85;
}

.gen-prompt {
  font-family: 'Fira Code', 'SF Mono', monospace;
  font-size: 0.68rem;
  letter-spacing: -0.04em;
  opacity: 0.75;
}

.spinner-bg {
  display: inline-block; width: 9px; height: 9px;
  border: 1.5px solid #30363d; border-top-color: #58a6ff;
  border-radius: 50%; animation: spin 0.8s linear infinite;
  margin-right: 0.35rem; vertical-align: middle;
}
@keyframes spin { to { transform: rotate(360deg); } }

.gen-error {
  padding: 0.45rem 1rem;
  font-size: 0.78rem;
  color: #f85149;
  background: rgba(248,81,73,0.08);
  border-bottom: 1px solid rgba(248,81,73,0.2);
  flex-shrink: 0;
}
</style>
