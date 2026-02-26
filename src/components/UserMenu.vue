<template>
  <div class="user-menu">
    <!-- Unauthenticated -->
    <button
      v-if="!user"
      class="signin-btn"
      @click="$emit('open-auth')"
    >
      Sign in
    </button>

    <!-- Authenticated -->
    <div v-else class="avatar-wrap" ref="menuRef">
      <button class="avatar-btn" @click="dropdownOpen = !dropdownOpen" :aria-expanded="dropdownOpen">
        <img
          v-if="avatarUrl"
          :src="avatarUrl"
          :alt="displayName"
          class="avatar-img"
          referrerpolicy="no-referrer"
        />
        <span v-else class="avatar-initials">{{ initials }}</span>
      </button>

      <Transition name="dropdown">
        <div v-if="dropdownOpen" class="dropdown" role="menu">
          <p class="dropdown-email">{{ user.email }}</p>
          <button class="dropdown-profile" @click="handleOpenProfile" role="menuitem">
            Profile
          </button>
          <button class="dropdown-signout" @click="handleSignOut" role="menuitem">
            Sign out
          </button>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuth, signOut } from '../composables/useAuth.js'

const emit = defineEmits(['open-auth', 'open-profile'])

const { user } = useAuth()
const dropdownOpen = ref(false)
const menuRef = ref(null)

const avatarUrl = computed(() => user.value?.user_metadata?.avatar_url ?? null)
const displayName = computed(() => user.value?.user_metadata?.full_name ?? user.value?.email ?? '')
const initials = computed(() => {
  const name = user.value?.user_metadata?.full_name || user.value?.email || '?'
  return name.split(/\s|@/)[0].slice(0, 2).toUpperCase()
})

function handleOpenProfile() {
  dropdownOpen.value = false
  emit('open-profile')
}

async function handleSignOut() {
  dropdownOpen.value = false
  await signOut()
}

// Close dropdown when clicking outside
function onOutsideClick(e) {
  if (menuRef.value && !menuRef.value.contains(e.target)) {
    dropdownOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', onOutsideClick))
onUnmounted(() => document.removeEventListener('click', onOutsideClick))
</script>

<style scoped>
.user-menu {
  position: fixed;
  top: 7px; /* (topbar 50px - avatar 36px) / 2 */
  right: 1rem;
  z-index: 60;
}

.signin-btn {
  padding: 0.45rem 1rem;
  background: #238636;
  border: 1px solid #2ea043;
  border-radius: 4px;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
}
.signin-btn:hover { background: #2ea043; }

.avatar-wrap { position: relative; }

.avatar-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid #30363d;
  background: #21262d;
  cursor: pointer;
  padding: 0;
  overflow: hidden;
  transition: border-color 0.15s;
}
.avatar-btn:hover { border-color: #58a6ff; }

.avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }

.avatar-initials {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 0.75rem;
  font-weight: 700;
  color: #e6edf3;
}

.dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 4px;
  padding: 0.75rem;
  min-width: 200px;
  max-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}

.dropdown-email {
  font-size: 0.78rem;
  color: #8b949e;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

.dropdown-profile,
.dropdown-signout {
  padding: 0.4rem 0.6rem;
  background: none;
  border: none;
  border-radius: 4px;
  color: #c9d1d9;
  font-size: 0.82rem;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background 0.12s, color 0.12s;
}
.dropdown-profile:hover { background: #21262d; color: #58a6ff; }
.dropdown-signout:hover { background: rgba(248,81,73,0.08); color: #f85149; }

.dropdown-enter-active, .dropdown-leave-active { transition: opacity 0.15s, transform 0.15s; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
