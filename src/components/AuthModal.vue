<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="open" class="modal-overlay" @click.self="$emit('close')">
        <div class="modal" role="dialog" aria-modal="true" aria-label="Sign in">

          <!-- Header -->
          <div class="modal-header">
            <h2 class="modal-title">Sign in to track progress</h2>
            <button class="close-btn" @click="$emit('close')" aria-label="Close">✕</button>
          </div>

          <!-- OAuth providers -->
          <div class="oauth-section">
            <button class="oauth-btn" @click="handleOAuth('github')" :disabled="busy">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              Continue with GitHub
            </button>

            <button class="oauth-btn" @click="handleOAuth('google')" :disabled="busy">
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <button class="oauth-btn" @click="handleOAuth('facebook')" :disabled="busy">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Continue with Facebook
            </button>
          </div>

          <!-- Divider -->
          <div class="divider-row">
            <span class="divider-line" />
            <span class="divider-text">or</span>
            <span class="divider-line" />
          </div>

          <!-- Tab switcher -->
          <div class="tabs">
            <button
              class="tab-btn"
              :class="{ active: tab === 'login' }"
              @click="tab = 'login'"
            >Log in</button>
            <button
              class="tab-btn"
              :class="{ active: tab === 'signup' }"
              @click="tab = 'signup'"
            >Sign up</button>
          </div>

          <!-- Email/password form -->
          <form class="auth-form" @submit.prevent="handleEmail">
            <div class="field">
              <label class="field-label" for="auth-email">Email</label>
              <input
                id="auth-email"
                v-model="email"
                type="email"
                class="field-input"
                placeholder="you@example.com"
                autocomplete="email"
                required
              />
            </div>

            <div class="field">
              <label class="field-label" for="auth-password">Password</label>
              <input
                id="auth-password"
                v-model="password"
                type="password"
                class="field-input"
                placeholder="••••••••"
                autocomplete="current-password"
                required
              />
            </div>

            <p v-if="errorMsg" class="error-msg" role="alert">{{ errorMsg }}</p>
            <p v-if="successMsg" class="success-msg" role="status">{{ successMsg }}</p>

            <button type="submit" class="submit-btn" :disabled="busy">
              <span v-if="busy" class="spinner" aria-hidden="true" />
              {{ tab === 'login' ? 'Log in' : 'Create account' }}
            </button>
          </form>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import { signInWithProvider, signInWithEmail, signUpWithEmail } from '../composables/useAuth.js'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['close'])

const tab        = ref('login')
const email      = ref('')
const password   = ref('')
const errorMsg   = ref('')
const successMsg = ref('')
const busy       = ref(false)

async function handleOAuth(provider) {
  errorMsg.value   = ''
  busy.value       = true
  try {
    await signInWithProvider(provider)
    // Page will navigate away; no need to close modal
  } catch (err) {
    errorMsg.value = err.message ?? 'OAuth sign-in failed.'
    busy.value     = false
  }
}

async function handleEmail() {
  errorMsg.value   = ''
  successMsg.value = ''
  busy.value       = true
  try {
    if (tab.value === 'login') {
      await signInWithEmail(email.value, password.value)
      emit('close')
    } else {
      const { confirmed } = await signUpWithEmail(email.value, password.value)
      if (confirmed) {
        emit('close')
      } else {
        successMsg.value = 'Check your email to confirm your account.'
      }
    }
  } catch (err) {
    errorMsg.value = err.message ?? 'Authentication failed.'
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

/* OAuth */
.oauth-section {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.oauth-btn {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  padding: 0.65rem 1rem;
  background: #21262d;
  border: 1px solid #30363d;
  border-radius: 8px;
  color: #c9d1d9;
  font-size: 0.875rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.oauth-btn:hover:not(:disabled) { background: #2d333b; border-color: #58a6ff; }
.oauth-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Divider */
.divider-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.divider-line { flex: 1; height: 1px; background: #30363d; }
.divider-text { font-size: 0.75rem; color: #6e7681; }

/* Tabs */
.tabs {
  display: flex;
  gap: 0;
  background: #21262d;
  border-radius: 8px;
  padding: 3px;
}
.tab-btn {
  flex: 1;
  padding: 0.4rem;
  background: none;
  border: none;
  border-radius: 6px;
  color: #8b949e;
  font-size: 0.85rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.tab-btn.active { background: #30363d; color: #e6edf3; }

/* Form */
.auth-form { display: flex; flex-direction: column; gap: 0.85rem; }

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
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
