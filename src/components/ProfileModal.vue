<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="open" class="modal-overlay" @click.self="$emit('close')">
        <div class="modal" role="dialog" aria-modal="true" aria-label="Profile">

          <!-- Header -->
          <div class="modal-header">
            <h2 class="modal-title">Profile</h2>
            <button class="close-btn" @click="$emit('close')" aria-label="Close">✕</button>
          </div>

          <!-- User identity -->
          <div class="user-identity">
            <div class="avatar-circle">
              <img
                v-if="avatarUrl"
                :src="avatarUrl"
                :alt="displayName"
                class="avatar-img"
                referrerpolicy="no-referrer"
              />
              <span v-else class="avatar-initials">{{ initials }}</span>
            </div>
            <div class="user-meta">
              <p class="user-name">{{ displayName }}</p>
              <p class="user-email">{{ user?.email }}</p>
            </div>
          </div>

          <!-- Divider -->
          <div class="section-divider" />

          <!-- Change password form -->
          <form class="password-form" @submit.prevent="handleSubmit">
            <h3 class="section-heading">Change password</h3>

            <div class="field">
              <label class="field-label" for="profile-new-password">New password</label>
              <input
                id="profile-new-password"
                v-model="newPassword"
                type="password"
                class="field-input"
                placeholder="Min 8 characters"
                autocomplete="new-password"
                minlength="8"
                required
              />
            </div>

            <div class="field">
              <label class="field-label" for="profile-confirm-password">Confirm password</label>
              <input
                id="profile-confirm-password"
                v-model="confirmPassword"
                type="password"
                class="field-input"
                placeholder="Repeat new password"
                autocomplete="new-password"
                minlength="8"
                required
              />
            </div>

            <p v-if="errorMsg" class="error-msg" role="alert">{{ errorMsg }}</p>
            <p v-if="successMsg" class="success-msg" role="status">{{ successMsg }}</p>

            <button type="submit" class="submit-btn" :disabled="busy">
              <span v-if="busy" class="spinner" aria-hidden="true" />
              Update password
            </button>
          </form>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuth, updatePassword } from '../composables/useAuth.js'

defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['close'])

const { user } = useAuth()

const avatarUrl   = computed(() => user.value?.user_metadata?.avatar_url ?? null)
const displayName = computed(() => user.value?.user_metadata?.full_name || user.value?.email || '')
const initials    = computed(() => {
  const name = user.value?.user_metadata?.full_name || user.value?.email || '?'
  return name.split(/\s|@/)[0].slice(0, 2).toUpperCase()
})

const newPassword     = ref('')
const confirmPassword = ref('')
const errorMsg        = ref('')
const successMsg      = ref('')
const busy            = ref(false)

async function handleSubmit() {
  errorMsg.value   = ''
  successMsg.value = ''

  if (newPassword.value.length < 8) {
    errorMsg.value = 'Password must be at least 8 characters.'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    errorMsg.value = 'Passwords do not match.'
    return
  }

  busy.value = true
  try {
    await updatePassword(newPassword.value)
    successMsg.value  = 'Password updated successfully.'
    newPassword.value     = ''
    confirmPassword.value = ''
  } catch (err) {
    errorMsg.value = err.message ?? 'Failed to update password.'
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.modal {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 14px;
  padding: 1.75rem;
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

/* Header */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #e6edf3;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: #6e7681;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.2rem 0.45rem;
  border-radius: 6px;
  transition: color 0.15s, background 0.15s;
}
.close-btn:hover { color: #e6edf3; background: #21262d; }

/* User identity */
.user-identity {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.avatar-circle {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid #30363d;
  background: #21262d;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.avatar-initials {
  font-size: 1rem;
  font-weight: 700;
  color: #e6edf3;
}

.user-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.user-name {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #e6edf3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-email {
  margin: 0;
  font-size: 0.78rem;
  color: #8b949e;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Divider */
.section-divider {
  height: 1px;
  background: #21262d;
  margin: 0;
}

/* Section heading */
.section-heading {
  font-size: 0.85rem;
  font-weight: 600;
  color: #8b949e;
  margin: 0 0 0.1rem;
}

/* Form */
.password-form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.field { display: flex; flex-direction: column; gap: 0.35rem; }

.field-label { font-size: 0.8rem; font-weight: 600; color: #8b949e; }

.field-input {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
  color: #e6edf3;
  font-size: 0.875rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}
.field-input:focus { border-color: #58a6ff; }

.error-msg   { font-size: 0.8rem; color: #f85149; margin: 0; }
.success-msg { font-size: 0.8rem; color: #3fb950; margin: 0; }

.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.65rem;
  background: #238636;
  border: 1px solid #2ea043;
  border-radius: 8px;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
}
.submit-btn:hover:not(:disabled) { background: #2ea043; }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
