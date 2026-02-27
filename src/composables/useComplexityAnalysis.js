import { ref } from 'vue'
import { useAuth } from './useAuth.js'
import { supabase } from '../lib/supabase.js'

export function useComplexityAnalysis({ getEditorValue, getGeneratedProblem, openAuth }) {
  const { isSubscribed } = useAuth()

  const isAnalyzing = ref(false)
  const analysisResult = ref(null)
  const analysisError = ref(null)

  async function analyze() {
    if (!isSubscribed.value) { openAuth(); return }

    const code = getEditorValue()
    if (!code?.trim()) return

    isAnalyzing.value = true
    analysisResult.value = null
    analysisError.value = null

    const problem = getGeneratedProblem()
    let problemContext = null
    if (problem) {
      const parts = [problem.title, problem.description, problem.constraints?.join(', ')].filter(Boolean)
      if (parts.length) problemContext = parts.join('\n')
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch('/api/analyze-complexity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ code, problemContext }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Request failed (${res.status})`)
      }
      analysisResult.value = await res.json()
    } catch (err) {
      analysisError.value = err.message || 'Analysis failed'
    } finally {
      isAnalyzing.value = false
    }
  }

  function clearAnalysis() {
    analysisResult.value = null
    analysisError.value = null
  }

  return { isAnalyzing, analysisResult, analysisError, analyze, clearAnalysis }
}
