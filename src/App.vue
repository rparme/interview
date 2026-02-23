<template>
  <div class="app-root">
    <UserMenu @open-auth="showAuthModal = true" @open-profile="showProfileModal = true" />
    <AuthModal :open="showAuthModal" @close="showAuthModal = false" />
    <ProfileModal :open="showProfileModal" @close="showProfileModal = false" />

    <Transition name="fade" mode="out-in">
      <!-- Main mindmap view -->
      <MindmapView
        v-if="activeView === 'map'"
        key="map"
        :categories="enrichedCategories"
        :total-done="totalDone"
        :total-probs="totalProbs"
        @select="openCategory"
      />

      <!-- Category detail view -->
      <CategoryView
        v-else-if="activeView === 'category' && selectedCategory"
        key="category"
        :category="selectedCategory"
        @back="goBack"
        @toggle-done="onToggleDone"
      />
    </Transition>

    <GlobalChip :done="totalDone" :total="totalProbs" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import MindmapView from './components/MindmapView.vue'
import CategoryView from './components/CategoryView.vue'
import GlobalChip from './components/GlobalChip.vue'
import UserMenu from './components/UserMenu.vue'
import AuthModal from './components/AuthModal.vue'
import ProfileModal from './components/ProfileModal.vue'
import { useAuth } from './composables/useAuth.js'
import { useProblems } from './composables/useProblems.js'

const { user } = useAuth()
const { enrichedCategories, totalDone, totalProbs, toggleDone } = useProblems()

const activeView       = ref('map')
const activeCategoryId = ref(null)
const showAuthModal    = ref(false)
const showProfileModal = ref(false)

const selectedCategory = computed(() =>
  enrichedCategories.value.find(c => c.id === activeCategoryId.value) ?? null
)

function openCategory(id) {
  activeCategoryId.value = id
  activeView.value = 'category'
}

function goBack() {
  activeView.value = 'map'
  activeCategoryId.value = null
}

function onToggleDone(lc) {
  if (!user.value) {
    showAuthModal.value = true
  } else {
    toggleDone(lc)
  }
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
