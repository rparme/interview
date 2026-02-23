<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="backdrop">
      <div v-if="problem" class="backdrop" @click="$emit('close')" />
    </Transition>

    <!-- Panel -->
    <Transition name="panel">
      <div v-if="problem" class="panel" role="dialog" :aria-label="problem.title">

        <!-- Header -->
        <div class="panel-header" :style="{ borderColor: categoryColor + '40' }">
          <div class="panel-badges">
            <span class="lc-num">LC {{ problem.lc }}</span>
            <span class="badge" :class="`badge-${problem.difficulty}`">{{ problem.difficulty }}</span>
          </div>
          <button class="close-btn" @click="$emit('close')" aria-label="Close panel">✕</button>
        </div>

        <!-- Title -->
        <h2 class="panel-title">{{ problem.title }}</h2>

        <!-- Done toggle button -->
        <button
          class="done-btn"
          :class="{ 'is-done': problem.done }"
          :style="problem.done
            ? { borderColor: categoryColor, background: categoryColor + '20', color: categoryColor }
            : {}"
          @click="$emit('toggle-done', problem.lc)"
        >
          <span aria-hidden="true">{{ problem.done ? '✓' : '○' }}</span>
          {{ problem.done ? 'Mark as not done' : 'Mark as done' }}
        </button>

        <!-- LeetCode link -->
        <a
          :href="problem.url"
          target="_blank"
          rel="noopener noreferrer"
          class="lc-btn"
          :style="{ background: categoryColor + '18', borderColor: categoryColor + '50', color: categoryColor }"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          Open on LeetCode
        </a>

        <div class="divider" />

        <!-- How to solve -->
        <section class="hint-section">
          <h3 class="hint-title">
            <span class="hint-icon" :style="{ color: categoryColor }">⚙</span>
            How to solve
          </h3>
          <ul class="hint-list">
            <li v-for="(hint, i) in problem.howTo" :key="i" class="hint-item">
              <span class="hint-bullet" :style="{ background: categoryColor }"></span>
              {{ hint }}
            </li>
          </ul>
        </section>

        <!-- When to use -->
        <section class="hint-section">
          <h3 class="hint-title">
            <span class="hint-icon" :style="{ color: categoryColor }">◎</span>
            When to use
          </h3>
          <ul class="hint-list">
            <li v-for="(hint, i) in problem.whenTo" :key="i" class="hint-item">
              <span class="hint-bullet" :style="{ background: categoryColor }"></span>
              {{ hint }}
            </li>
          </ul>
        </section>

      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { watch } from 'vue'

const props = defineProps({
  problem:       { type: Object, default: null },
  categoryColor: { type: String, default: '#58a6ff' },
})

defineEmits(['close', 'toggle-done'])

// Close on Escape key
watch(() => props.problem, (val) => {
  if (val) {
    const handler = (e) => { if (e.key === 'Escape') { document.removeEventListener('keydown', handler) } }
    document.addEventListener('keydown', handler)
  }
})
</script>

<style scoped>
/* ── Backdrop ── */
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 40;
  cursor: pointer;
}

.backdrop-enter-active, .backdrop-leave-active { transition: opacity 0.25s ease; }
.backdrop-enter-from, .backdrop-leave-to { opacity: 0; }

/* ── Panel ── */
.panel {
  position: fixed;
  top: 0;
  right: 0;
  height: 100dvh;
  width: min(440px, 100vw);
  background: #161b22;
  border-left: 1px solid #30363d;
  z-index: 50;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.panel-enter-active, .panel-leave-active { transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.panel-enter-from, .panel-leave-to { transform: translateX(100%); }

/* ── Header ── */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid;
}

.panel-badges { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; }

.lc-num {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.72rem;
  color: #6e7681;
  background: #21262d;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
}

.badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  letter-spacing: 0.02em;
}
.badge-Easy   { background: rgba(63,185,80,0.15);  color: #3fb950; }
.badge-Medium { background: rgba(210,153,34,0.15); color: #d29922; }
.badge-Hard   { background: rgba(248,81,73,0.15);  color: #f85149; }

.close-btn {
  background: none;
  border: none;
  color: #6e7681;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  line-height: 1;
  transition: color 0.15s, background 0.15s;
}
.close-btn:hover { color: #e6edf3; background: #21262d; }

/* ── Title ── */
.panel-title {
  font-size: 1.2rem;
  font-weight: 700;
  line-height: 1.35;
  color: #e6edf3;
}

/* ── Done toggle button ── */
.done-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.65rem 1rem;
  background: #21262d;
  border: 1px solid #30363d;
  border-radius: 8px;
  color: #8b949e;
  font-size: 0.875rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}
.done-btn:hover:not(.is-done) { border-color: #58a6ff; color: #c9d1d9; }

/* ── LeetCode button ── */
.lc-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.1rem;
  border-radius: 8px;
  border: 1px solid;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  transition: opacity 0.15s, transform 0.15s;
  align-self: flex-start;
}
.lc-btn:hover { opacity: 0.85; transform: translateY(-1px); }

/* ── Divider ── */
.divider { height: 1px; background: #21262d; }

/* ── Hint sections ── */
.hint-section { display: flex; flex-direction: column; gap: 0.75rem; }

.hint-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #8b949e;
}

.hint-icon { font-size: 1rem; line-height: 1; }

.hint-list { display: flex; flex-direction: column; gap: 0.65rem; list-style: none; }

.hint-item {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  font-size: 0.9rem;
  line-height: 1.55;
  color: #c9d1d9;
}

.hint-bullet {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-top: 0.45rem;
  opacity: 0.8;
}
</style>
