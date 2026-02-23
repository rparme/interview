<template>
  <div class="mindmap-view">
    <svg
      class="mindmap-svg"
      viewBox="0 0 1000 700"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      :aria-label="`Interview prep mindmap. ${totalDone} of ${totalProbs} problems solved.`"
    >
      <!-- connector lines drawn first, behind nodes -->
      <line
        v-for="(cat, i) in categories"
        :key="`line-${cat.id}`"
        :x1="CX"
        :y1="CY"
        :x2="nodePos(i).x"
        :y2="nodePos(i).y"
        stroke="#21262d"
        stroke-width="2"
      />

      <!-- center progress ring track -->
      <circle
        :cx="CX"
        :cy="CY"
        :r="RING_R"
        fill="none"
        stroke="#21262d"
        stroke-width="4"
      />

      <!-- center progress ring fill -->
      <circle
        :cx="CX"
        :cy="CY"
        :r="RING_R"
        fill="none"
        stroke="#3fb950"
        stroke-width="4"
        :stroke-dasharray="ringCirc"
        :stroke-dashoffset="ringOffset"
        stroke-linecap="round"
        :transform="`rotate(-90 ${CX} ${CY})`"
      />

      <!-- center circle -->
      <circle
        :cx="CX"
        :cy="CY"
        r="74"
        fill="#161b22"
        stroke="#30363d"
        stroke-width="1.5"
      />

      <!-- center label -->
      <text
        :x="CX"
        :y="CY - 22"
        text-anchor="middle"
        fill="#e6edf3"
        font-size="14"
        font-weight="600"
        :font-family="FONT_FAMILY"
        pointer-events="none"
        user-select="none"
      >
        <tspan :x="CX" :y="CY - 22">FAANG</tspan>
        <tspan :x="CX" :dy="19">Interview</tspan>
        <tspan :x="CX" :dy="19">Patterns</tspan>
      </text>
      <text
        :x="CX"
        :y="CY + 46"
        text-anchor="middle"
        fill="#3fb950"
        font-size="12.5"
        font-weight="500"
        :font-family="FONT_FAMILY"
        pointer-events="none"
        user-select="none"
      >{{ totalDone }} / {{ totalProbs }}</text>

      <!-- category nodes -->
      <g
        v-for="(cat, i) in categories"
        :key="cat.id"
        class="category-node"
        tabindex="0"
        role="button"
        :aria-label="`${cat.name}: ${catDone(cat)} of ${cat.problems.length} done`"
        @click="$emit('select', cat.id)"
        @keydown.enter="$emit('select', cat.id)"
        @keydown.space.prevent="$emit('select', cat.id)"
      >
        <!-- outer glow -->
        <circle
          :cx="nodePos(i).x"
          :cy="nodePos(i).y"
          :r="NODE_R + 10"
          :fill="cat.color"
          opacity="0.07"
        />

        <!-- partial progress arc -->
        <circle
          v-if="catDone(cat) > 0 && catDone(cat) < cat.problems.length"
          :cx="nodePos(i).x"
          :cy="nodePos(i).y"
          :r="NODE_R + 7"
          fill="none"
          :stroke="cat.color"
          stroke-width="2.5"
          :stroke-dasharray="arcCirc(i)"
          :stroke-dashoffset="arcOffset(i)"
          stroke-linecap="round"
          opacity="0.5"
          :transform="`rotate(-90 ${nodePos(i).x} ${nodePos(i).y})`"
          class="node-ring"
        />

        <!-- full ring when category complete -->
        <circle
          v-if="catDone(cat) === cat.problems.length"
          :cx="nodePos(i).x"
          :cy="nodePos(i).y"
          :r="NODE_R + 7"
          fill="none"
          :stroke="cat.color"
          stroke-width="2.5"
          opacity="0.7"
          class="node-ring"
        />

        <!-- main circle -->
        <circle
          :cx="nodePos(i).x"
          :cy="nodePos(i).y"
          :r="NODE_R"
          :fill="cat.color"
          fill-opacity="0.13"
          :stroke="cat.color"
          stroke-width="2"
          class="node-bg"
        />

        <!-- category name (1 or 2 lines) -->
        <text
          :x="nodePos(i).x"
          :y="cat.lines.length > 1 ? nodePos(i).y - 19 : nodePos(i).y - 5"
          text-anchor="middle"
          fill="#e6edf3"
          font-size="12.5"
          font-weight="600"
          :font-family="FONT_FAMILY"
          pointer-events="none"
          user-select="none"
        >
          <tspan
            v-for="(line, li) in cat.lines"
            :key="li"
            :x="nodePos(i).x"
            :dy="li === 0 ? 0 : 17"
          >{{ line }}</tspan>
        </text>

        <!-- progress label -->
        <text
          :x="nodePos(i).x"
          :y="cat.lines.length > 1 ? nodePos(i).y + 26 : nodePos(i).y + 16"
          text-anchor="middle"
          :fill="progressColor(cat)"
          font-size="11.5"
          font-weight="500"
          :font-family="FONT_FAMILY"
          pointer-events="none"
          user-select="none"
        >{{ catDone(cat) }}/{{ cat.problems.length }}</text>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  categories: { type: Array, required: true },
  totalDone:  { type: Number, required: true },
  totalProbs: { type: Number, required: true },
})

defineEmits(['select'])

// Layout constants
const CX = 500
const CY = 350
const ORBIT = 252
const NODE_R = 56
const RING_R = 84
const FONT_FAMILY = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

/**
 * Compute the (x, y) center for node at index i, distributed radially.
 */
function nodePos(i) {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / props.categories.length
  return {
    x: CX + ORBIT * Math.cos(angle),
    y: CY + ORBIT * Math.sin(angle),
  }
}

/** Number of completed problems in a category. */
function catDone(cat) {
  return cat.problems.filter(p => p.done).length
}

/** Color for the progress fraction text on a node. */
function progressColor(cat) {
  const done = catDone(cat)
  if (done === cat.problems.length) return '#3fb950'
  if (done > 0) return cat.color
  return '#6e7681'
}

// Center ring geometry
const ringCirc   = computed(() => 2 * Math.PI * RING_R)
const ringOffset = computed(() => {
  if (!props.totalProbs) return ringCirc.value
  return ringCirc.value - (props.totalDone / props.totalProbs) * ringCirc.value
})

/** Arc circumference for node i's progress ring. */
function arcCirc(i) {
  return 2 * Math.PI * (NODE_R + 7)
}

/** Arc dashoffset for node i's partial progress. */
function arcOffset(i) {
  const cat   = props.categories[i]
  const done  = catDone(cat)
  const total = cat.problems.length
  const circ  = 2 * Math.PI * (NODE_R + 7)
  return circ - (done / total) * circ
}
</script>

<style scoped>
.mindmap-view {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mindmap-svg {
  width: min(92vw, 960px);
  height: auto;
}

.category-node {
  cursor: pointer;
}

.category-node:focus {
  outline: none;
}

.category-node:focus .node-bg {
  fill-opacity: 0.28;
}

.node-bg {
  transition: fill-opacity 0.18s ease;
}

.category-node:hover .node-bg {
  fill-opacity: 0.28;
}

.category-node:hover .node-ring {
  opacity: 0.9;
}
</style>
