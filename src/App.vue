<template>
  <div class="app-root">
    <UserMenu @open-auth="showAuthModal = true" @open-profile="showProfileModal = true" />
    <AuthModal :open="showAuthModal" @close="showAuthModal = false" />
    <ProfileModal :open="showProfileModal" @close="showProfileModal = false" />

    <!-- Main mindmap view -->
    <MindmapView
      v-if="activeView === 'map'"
      :categories="enrichedCategories"
      :total-done="totalDone"
      :total-probs="totalProbs"
      @select="openCategory"
    />

    <!-- Category detail view -->
    <CategoryView
      v-else-if="activeView === 'category' && selectedCategory"
      :category="selectedCategory"
      @back="goBack"
      @toggle-done="onToggleDone"
      @open-auth="showAuthModal = true"
    />

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
.app-root {
  min-height: 100vh;
}


</style>
