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
            <a
              v-if="problem.url"
              :href="problem.url"
              target="_blank"
              rel="noopener"
              class="platform-link lc-link"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z"/></svg>
              Open on LeetCode
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="link-arrow"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>

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
  border-radius: 12px;
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
  border-radius: 6px;
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
  border-radius: 8px;
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
  border-radius: 6px;
  overflow: hidden;
}
.hint-block::before {
  content: '[';
  display: block;
  padding: 0.55rem 0.75rem 0;
  font-family: 'Fira Code', 'SF Mono', monospace;
  font-size: 0.72rem;
  color: #3d444d;
  line-height: 1;
  user-select: none;
}
.hint-block::after {
  content: ']';
  display: block;
  padding: 0 0.75rem 0.55rem;
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
