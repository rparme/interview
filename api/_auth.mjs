import { createClient } from '@supabase/supabase-js'

function makeSupabase() {
  // SUPABASE_URL (no VITE_ prefix) is preferred for server-side use — it bypasses the
  // Vite proxy and hits GoTrue/PostgREST directly. Falls back to VITE_SUPABASE_URL so
  // production deployments only need one URL variable.
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey)
    throw Object.assign(new Error('SUPABASE_SERVICE_ROLE_KEY is not configured'), { status: 500 })
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

function extractToken(req) {
  const auth = req.headers['authorization'] ?? ''
  if (!auth.startsWith('Bearer '))
    throw Object.assign(new Error('Authentication required'), { status: 401 })
  return auth.slice(7)
}

export async function requireAuth(req) {
  const token = extractToken(req)
  const supabase = makeSupabase()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user)
    throw Object.assign(new Error('Invalid or expired session'), { status: 401 })
  return user
}

export async function requireSubscribed(req, categoryId) {
  const user = await requireAuth(req)
  const supabase = makeSupabase()

  const { data: profile } = await supabase
    .from('profiles').select('is_subscribed').eq('id', user.id).single()

  if (profile?.is_subscribed) return user

  const freeLimit = parseInt(
    process.env.FREE_EXERCISE_LIMIT ?? process.env.VITE_FREE_EXERCISE_LIMIT ?? '1', 10
  )
  if (freeLimit === 0)
    throw Object.assign(new Error('Subscription required'), { status: 403, code: 'subscription_required' })

  if (categoryId) {
    const { count } = await supabase
      .from('generated_exercises')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('category_id', categoryId)

    if (count >= freeLimit)
      throw Object.assign(
        new Error(`Free limit reached (${freeLimit} per category). Subscribe to generate more.`),
        { status: 403, code: 'free_limit_reached' }
      )
  }
  return user
}
