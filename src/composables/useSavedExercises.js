import { ref } from 'vue'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './useAuth.js'

function dbRowToExercise(row) {
  return {
    id:          row.id,
    title:       row.title,
    description: row.description,
    examples:    row.examples,
    constraints: row.constraints,
    starterCode: row.starter_code,
    unitTests:   row.unit_tests || '',
    difficulty:  row.difficulty,
    done:        row.is_done ?? false,
  }
}

export function useSavedExercises({ getCategoryId, openAuth, getEditorValue }) {
  const { user, isSubscribed } = useAuth()

  const savedExercises = ref([])
  const currentExerciseId = ref(null)
  const dbSaveError = ref(null)
  let _saveTimer = null

  async function loadSavedExercises() {
    if (!user.value) { savedExercises.value = []; return }
    const { data } = await supabase
      .from('generated_exercises')
      .select('*')
      .eq('user_id', user.value.id)
      .eq('category_id', getCategoryId())
      .order('created_at', { ascending: false })
    savedExercises.value = (data ?? []).map(dbRowToExercise)
  }

  async function persistGeneratedExercise(problem, unitTests, difficulty) {
    if (!user.value) return null
    await supabase.rpc('ensure_profile')
    const { data, error } = await supabase
      .from('generated_exercises')
      .insert({
        user_id:      user.value.id,
        category_id:  getCategoryId(),
        title:        problem.title,
        description:  problem.description,
        examples:     problem.examples,
        constraints:  problem.constraints,
        starter_code: problem.starterCode,
        unit_tests:   unitTests,
        difficulty,
      })
      .select('id')
      .single()
    if (error) {
      console.warn('[persist] error code:', error.code, '— message:', error.message)
      return null
    }
    return data.id
  }

  async function deleteGeneratedExercise(ex, event) {
    event.stopPropagation()
    if (!user.value || !isSubscribed.value) return
    if (!confirm(`Delete "${ex.title}"?\nThis cannot be undone.`)) return
    await supabase
      .from('generated_exercises')
      .delete()
      .eq('id', ex.id)
      .eq('user_id', user.value.id)
    if (currentExerciseId.value === ex.id) {
      currentExerciseId.value = null
    }
    savedExercises.value = savedExercises.value.filter(e => e.id !== ex.id)
  }

  async function toggleGenDone(ex) {
    if (!user.value) { openAuth(); return }
    const newDone = !ex.done
    const idx = savedExercises.value.findIndex(e => e.id === ex.id)
    if (idx !== -1) savedExercises.value[idx] = { ...savedExercises.value[idx], done: newDone }
    const { error } = await supabase
      .from('generated_exercises')
      .update({ is_done: newDone })
      .eq('id', ex.id)
      .eq('user_id', user.value.id)
    if (error) {
      if (idx !== -1) savedExercises.value[idx] = { ...savedExercises.value[idx], done: !newDone }
    }
  }

  function scheduleSave() {
    clearTimeout(_saveTimer)
    _saveTimer = setTimeout(flushSave, 1000)
  }

  async function flushSave() {
    clearTimeout(_saveTimer)
    if (!user.value || !currentExerciseId.value) return
    const code = getEditorValue()
    if (!code) return
    await supabase
      .from('user_solutions')
      .upsert(
        { user_id: user.value.id, generated_exercise_id: currentExerciseId.value, code, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,generated_exercise_id' }
      )
  }

  async function loadSavedCode(exerciseId) {
    if (!user.value) return null
    const { data } = await supabase
      .from('user_solutions')
      .select('code')
      .eq('user_id', user.value.id)
      .eq('generated_exercise_id', exerciseId)
      .maybeSingle()
    return data?.code ?? null
  }

  // Returns { exercise, savedCode } — caller handles UI state
  async function prepareOpenSavedExercise(id) {
    await flushSave()
    currentExerciseId.value = id
    const ex = savedExercises.value.find(e => e.id === id)
    const savedCode = await loadSavedCode(id)
    return { exercise: ex, savedCode }
  }

  function cleanupSave() {
    clearTimeout(_saveTimer)
    flushSave()
  }

  return {
    savedExercises,
    currentExerciseId,
    dbSaveError,
    loadSavedExercises,
    persistGeneratedExercise,
    deleteGeneratedExercise,
    toggleGenDone,
    scheduleSave,
    flushSave,
    prepareOpenSavedExercise,
    cleanupSave,
  }
}
