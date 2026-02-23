import { ref, computed, watch } from 'vue'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './useAuth.js'

const { user } = useAuth()

// Module-level singletons
const categories = ref([])   // raw DB rows: { id, name, lines, color, problems: [] }
const doneSet    = ref(new Set())

// ── Reference data (public, loaded once) ────────────────────────────────────

async function loadReferenceData() {
  const [{ data: cats }, { data: probs }] = await Promise.all([
    supabase.from('categories').select('*').order('id'),
    supabase.from('problems').select('*').order('lc'),
  ])

  if (!cats || !probs) return

  // Map camelCase for template convenience
  const byCategory = {}
  for (const p of probs) {
    if (!byCategory[p.category_id]) byCategory[p.category_id] = []
    byCategory[p.category_id].push({
      lc:         p.lc,
      title:      p.title,
      difficulty: p.difficulty,
      url:        p.url,
      howTo:      p.how_to,
      whenTo:     p.when_to,
    })
  }

  categories.value = cats.map(c => ({
    id:       c.id,
    name:     c.name,
    lines:    c.lines,
    color:    c.color,
    problems: byCategory[c.id] ?? [],
  }))
}

// Load immediately on module import (shared for all users)
loadReferenceData()

// ── Per-user progress ────────────────────────────────────────────────────────

async function loadProgress(userId) {
  const { data } = await supabase
    .from('user_progress')
    .select('lc')
    .eq('user_id', userId)

  doneSet.value = new Set((data ?? []).map(r => r.lc))
}

// React to login / logout
watch(user, (u) => {
  if (u) {
    loadProgress(u.id)
  } else {
    doneSet.value = new Set()
  }
}, { immediate: true })

// ── Derived ──────────────────────────────────────────────────────────────────

/** categories with each problem enriched with a reactive `done` boolean */
const enrichedCategories = computed(() =>
  categories.value.map(cat => ({
    ...cat,
    problems: cat.problems.map(p => ({ ...p, done: doneSet.value.has(p.lc) })),
  }))
)

const totalProbs = computed(() =>
  categories.value.reduce((s, c) => s + c.problems.length, 0)
)

const totalDone = computed(() =>
  doneSet.value.size
)

// ── Mutations ────────────────────────────────────────────────────────────────

async function toggleDone(lc) {
  if (!user.value) return

  const wasDone = doneSet.value.has(lc)

  // Optimistic update
  const next = new Set(doneSet.value)
  if (wasDone) next.delete(lc)
  else next.add(lc)
  doneSet.value = next

  try {
    if (wasDone) {
      const { error } = await supabase
        .from('user_progress')
        .delete()
        .eq('user_id', user.value.id)
        .eq('lc', lc)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('user_progress')
        .upsert({ user_id: user.value.id, lc }, { ignoreDuplicates: true })
      if (error) throw error
    }
  } catch {
    // Rollback on error
    const rollback = new Set(doneSet.value)
    if (wasDone) rollback.add(lc)
    else rollback.delete(lc)
    doneSet.value = rollback
  }
}

export function useProblems() {
  return { enrichedCategories, totalDone, totalProbs, toggleDone }
}
