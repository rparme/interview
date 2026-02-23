<template>
  <div class="app-root">
    <Transition name="fade" mode="out-in">
      <!-- Main mindmap view -->
      <MindmapView
        v-if="activeView === 'map'"
        key="map"
        @select="openCategory"
      />

      <!-- Category detail view -->
      <CategoryView
        v-else-if="activeView === 'category' && selectedCategory"
        key="category"
        :category="selectedCategory"
        @back="goBack"
      />
    </Transition>

    <GlobalChip :done="TOTAL_DONE" :total="TOTAL_PROBS" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import MindmapView from './components/MindmapView.vue'
import CategoryView from './components/CategoryView.vue'
import GlobalChip from './components/GlobalChip.vue'
import { CATEGORIES, TOTAL_DONE, TOTAL_PROBS } from './data.js'

/** Which top-level view is shown: 'map' | 'category' */
const activeView = ref('map')

/** ID of the category currently being viewed, or null. */
const activeCategoryId = ref(null)

const selectedCategory = computed(() =>
  CATEGORIES.find(c => c.id === activeCategoryId.value) ?? null
)

function openCategory(id) {
  activeCategoryId.value = id
  activeView.value = 'category'
}

function goBack() {
  activeView.value = 'map'
  activeCategoryId.value = null
}
</script>

<style>
/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.app-root {
  min-height: 100vh;
}
</style>
