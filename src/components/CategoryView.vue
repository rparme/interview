<template>
  <div class="category-view">
    <button class="back-btn" @click="$emit('back')">
      <span aria-hidden="true">←</span> Back to map
    </button>

    <div class="cat-header">
      <div class="cat-dot" :style="{ background: category.color }" aria-hidden="true" />
      <h1 class="cat-title">{{ category.name }}</h1>
    </div>

    <p class="cat-meta">{{ doneCnt }} of {{ totalCnt }} problems completed</p>

    <div class="progress-bar" role="progressbar" :aria-valuenow="pct" aria-valuemin="0" aria-valuemax="100">
      <div class="progress-fill" :style="{ width: pct + '%', background: category.color }" />
    </div>

    <div class="problems-grid">
      <div
        v-for="problem in category.problems"
        :key="problem.lc"
        class="problem-card"
        :class="{ done: problem.done, active: selectedProblem?.lc === problem.lc }"
        :style="cardStyle(problem)"
        tabindex="0"
        role="button"
        :aria-label="problem.title"
        @click="openPanel(problem)"
        @keydown.enter="openPanel(problem)"
        @keydown.space.prevent="openPanel(problem)"
        @mouseenter="onCardEnter($event, problem)"
        @mouseleave="onCardLeave($event, problem)"
      >
        <div class="card-top">
          <span class="lc-num">LC {{ problem.lc }}</span>
          <div class="badges">
            <!-- Done toggle checkbox -->
            <button
              class="done-toggle"
              :class="{ 'is-done': problem.done }"
              :style="problem.done ? { background: category.color, borderColor: category.color } : {}"
              :aria-label="problem.done ? 'Mark as not done' : 'Mark as done'"
              @click.stop="$emit('toggle-done', problem.lc)"
            >
              <span v-if="problem.done" aria-hidden="true">✓</span>
            </button>
            <span class="badge" :class="`badge-${problem.difficulty}`">{{ problem.difficulty }}</span>
          </div>
        </div>
        <div class="problem-title">{{ problem.title }}</div>
      </div>
    </div>

    <ProblemPanel
      :problem="selectedProblem"
      :category-color="category.color"
      @close="selectedProblem = null"
      @toggle-done="$emit('toggle-done', $event)"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ProblemPanel from './ProblemPanel.vue'

const props = defineProps({
  category: { type: Object, required: true },
})

defineEmits(['back', 'toggle-done'])

const selectedProblem = ref(null)

const doneCnt  = computed(() => props.category.problems.filter(p => p.done).length)
const totalCnt = computed(() => props.category.problems.length)
const pct      = computed(() => Math.round((doneCnt.value / totalCnt.value) * 100))

function openPanel(problem) {
  selectedProblem.value = problem
}

function cardStyle(problem) {
  const isActive = selectedProblem.value?.lc === problem.lc
  if (isActive) return { borderColor: props.category.color, background: props.category.color + '10' }
  if (problem.done) return { borderColor: props.category.color + '50' }
  return { borderColor: '#21262d' }
}

function onCardEnter(e, problem) {
  if (selectedProblem.value?.lc === problem.lc) return
  e.currentTarget.style.borderColor = problem.done
    ? props.category.color + '80'
    : props.category.color + '60'
}

function onCardLeave(e, problem) {
  if (selectedProblem.value?.lc === problem.lc) return
  e.currentTarget.style.borderColor = problem.done ? props.category.color + '50' : '#21262d'
}
</script>

<style scoped>
.category-view {
  min-height: 100vh;
  padding: 2rem 2.5rem;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: none;
  border: 1px solid #30363d;
  color: #8b949e;
  padding: 0.45rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-family: inherit;
  margin-bottom: 2.5rem;
  transition: border-color 0.18s, color 0.18s;
}
.back-btn:hover { border-color: #58a6ff; color: #58a6ff; }

.cat-header {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  margin-bottom: 0.5rem;
}

.cat-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; }

.cat-title { font-size: 1.75rem; font-weight: 700; }

.cat-meta {
  color: #8b949e;
  font-size: 0.875rem;
  margin-bottom: 0.6rem;
  padding-left: 1.875rem;
}

.progress-bar {
  width: 220px;
  height: 3px;
  background: #21262d;
  border-radius: 2px;
  margin-bottom: 2.25rem;
  margin-left: 1.875rem;
  overflow: hidden;
}

.progress-fill { height: 100%; border-radius: 2px; transition: width 0.5s ease; }

.problems-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
  gap: 0.75rem;
  max-width: 1100px;
}

.problem-card {
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 10px;
  padding: 1.1rem 1.2rem;
  cursor: pointer;
  transition: border-color 0.18s, transform 0.15s, background 0.18s;
  user-select: none;
}

.problem-card:hover { transform: translateY(-2px); background: #1c2128; }
.problem-card:focus-visible { outline: 2px solid #58a6ff; outline-offset: 2px; }
.problem-card.done { opacity: 0.65; }
.problem-card.active { transform: translateY(-2px); }

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.6rem;
}

.lc-num {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.72rem;
  color: #6e7681;
  background: #21262d;
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
}

.badges { display: flex; gap: 0.35rem; align-items: center; }

/* Done toggle checkbox */
.done-toggle {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  border: 1.5px solid #30363d;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  color: #fff;
  padding: 0;
  transition: border-color 0.15s, background 0.15s;
  flex-shrink: 0;
}
.done-toggle:hover:not(.is-done) { border-color: #58a6ff; }

.badge {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  letter-spacing: 0.02em;
}
.badge-Easy   { background: rgba(63,185,80,0.15);  color: #3fb950; }
.badge-Medium { background: rgba(210,153,34,0.15); color: #d29922; }
.badge-Hard   { background: rgba(248,81,73,0.15);  color: #f85149; }

.problem-title { font-size: 0.9rem; font-weight: 500; line-height: 1.4; }

@media (max-width: 600px) {
  .category-view { padding: 1.25rem 1rem; }
  .cat-title { font-size: 1.35rem; }
  .problems-grid { grid-template-columns: 1fr; }
}
</style>
