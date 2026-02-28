<template>
  <Teleport to="body">
    <Transition name="popup">
      <div v-if="problem" class="popup-backdrop" @click.self="$emit('close')">
        <div class="popup-card" role="dialog" aria-modal="true" :aria-label="problem.title">

          <!-- Header -->
          <div class="popup-header">
            <span class="panel-badge" :class="`badge-${problem.difficulty}`">{{ problem.difficulty }}</span>
            <h2 class="popup-title">{{ problem.title }}</h2>
            <button class="popup-close" aria-label="Close" @click="$emit('close')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <!-- Body -->
          <div class="popup-body">
            <section v-if="problem.whenTo?.length" class="popup-section">
              <h3 class="section-label">When to use</h3>
              <div class="hint-block">
                <ul class="hint-list">
                  <li v-for="(item, i) in problem.whenTo" :key="i">{{ item }}</li>
                </ul>
              </div>
            </section>

            <section v-if="problem.howTo?.length" class="popup-section">
              <h3 class="section-label">How to approach</h3>
              <div class="hint-block">
                <ul class="hint-list">
                  <li v-for="(item, i) in problem.howTo" :key="i">{{ item }}</li>
                </ul>
              </div>
            </section>

            <div v-if="!problem.whenTo && !problem.howTo" class="detail-empty">
              No hints available for this exercise.
            </div>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
defineProps({
  problem: { type: Object, default: null },
})

defineEmits(['close'])
</script>

<style scoped>
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
  border-radius: 4px;
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
  border-radius: 4px;
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

.section-label {
  font-size: 0.67rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #6e7681;
}

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

/* Transition */
.popup-enter-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.popup-leave-active { transition: opacity 0.14s ease, transform 0.14s ease; }
.popup-enter-from  { opacity: 0; }
.popup-leave-to    { opacity: 0; }
.popup-enter-from .popup-card { transform: scale(0.96) translateY(6px); }
.popup-leave-to   .popup-card { transform: scale(0.96) translateY(6px); }
</style>
