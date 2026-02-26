import { ref } from 'vue'
import { supabase } from '../lib/supabase.js'

// Module-level singletons — shared across all component instances
const user         = ref(null)
const loading      = ref(true)
const isSubscribed = ref(false)

async function loadProfile(userId) {
  if (!userId) { isSubscribed.value = false; return }
  // ensure_profile() upserts the row and upgrades seed accounts to is_subscribed=true.
  // Must run before the SELECT so the value is correct on the very first login.
  await supabase.rpc('ensure_profile')
  const { data } = await supabase
    .from('profiles')
    .select('is_subscribed')
    .eq('id', userId)
    .single()
  isSubscribed.value = data?.is_subscribed ?? false
}

// Bootstrap from persisted session on first import
supabase.auth.getSession().then(({ data }) => {
  user.value    = data.session?.user ?? null
  loading.value = false
  loadProfile(user.value?.id)
})

// Stay in sync with auth state changes (login, logout, token refresh)
supabase.auth.onAuthStateChange((_event, session) => {
  user.value = session?.user ?? null
  loadProfile(user.value?.id)
})

// ── Actions ─────────────────────────────────────────────────────────────────

export async function signInWithProvider(provider) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin },
  })
  if (error) throw error
}

export async function signInWithEmail(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signUpWithEmail(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  // Return whether the user was auto-confirmed (session present) or needs email verification.
  return { confirmed: !!data.session }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

export function useAuth() {
  return { user, loading, isSubscribed }
}
