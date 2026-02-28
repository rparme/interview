import { ref } from 'vue'
import { useAuth } from './useAuth.js'
import { supabase } from '../lib/supabase.js'

export function useExplanationReview({ getGeneratedProblem, getCategoryName, openAuth, getCurrentExerciseId, getCurrentDrillLc }) {
  const { user } = useAuth()

  const recordingState = ref('idle')  // 'idle' | 'recording' | 'reviewing' | 'done'
  const transcript    = ref('')
  const interimText   = ref('')
  const reviewResult  = ref(null)
  const reviewError   = ref(null)
  const isSpeechSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  let recognition = null

  function startRecording() {
    if (!user.value) { openAuth(); return }
    if (!isSpeechSupported) return

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          transcript.value += result[0].transcript + ' '
        } else {
          interim += result[0].transcript
        }
      }
      interimText.value = interim
    }

    recognition.onerror = (event) => {
      // 'no-speech' and 'aborted' are non-fatal; the onend handler will restart
      if (event.error === 'no-speech' || event.error === 'aborted') return
      console.error('[useExplanationReview] speech error:', event.error)
      interimText.value = ''
      recordingState.value = 'idle'
    }

    recognition.onend = () => {
      // Flush any pending interim text as final before restarting
      if (interimText.value) {
        transcript.value += interimText.value + ' '
        interimText.value = ''
      }
      // Chrome fires onend after silence even with continuous:true — restart to keep going
      if (recordingState.value === 'recording') {
        try { recognition.start() } catch { /* already started */ }
      }
    }

    recognition.start()
    recordingState.value = 'recording'
  }

  function stopRecording() {
    // Set state BEFORE calling stop() so the onend handler doesn't restart
    recordingState.value = 'idle'
    interimText.value = ''
    if (recognition) {
      recognition.stop()
      recognition = null
    }
  }

  async function submitForReview() {
    const text = transcript.value.trim()
    if (!text) return

    recordingState.value = 'reviewing'
    reviewResult.value = null
    reviewError.value = null

    const problem = getGeneratedProblem()
    const category = getCategoryName()

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch('/api/review-explanation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          problem: problem ? {
            title: problem.title,
            description: problem.description,
            examples: problem.examples,
            constraints: problem.constraints,
          } : null,
          category,
          transcript: text,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Request failed (${res.status})`)
      }
      const result = await res.json()
      reviewResult.value = result
      recordingState.value = 'done'

      // Persist transcript + review to user_solutions
      const exerciseId = getCurrentExerciseId?.()
      const drillLc = getCurrentDrillLc?.()
      if (user.value && (exerciseId || drillLc)) {
        const row = {
          user_id: user.value.id,
          explanation_transcript: text,
          explanation_review: result,
          updated_at: new Date().toISOString(),
        }
        if (drillLc) {
          row.lc = drillLc
          supabase.from('user_solutions').upsert(row, { onConflict: 'user_id,lc' })
            .then(({ error }) => { if (error) console.warn('[useExplanationReview] save error:', error.message) })
        } else {
          row.generated_exercise_id = exerciseId
          supabase.from('user_solutions').upsert(row, { onConflict: 'user_id,generated_exercise_id' })
            .then(({ error }) => { if (error) console.warn('[useExplanationReview] save error:', error.message) })
        }
      }
    } catch (err) {
      reviewError.value = err.message || 'Review failed'
      recordingState.value = 'done'
    }
  }

  async function loadExplanation(exerciseId, drillLc) {
    if (!user.value || (!exerciseId && !drillLc)) { resetExplain(); return }
    let query = supabase
      .from('user_solutions')
      .select('explanation_transcript, explanation_review')
      .eq('user_id', user.value.id)
    if (drillLc) {
      query = query.eq('lc', drillLc)
    } else {
      query = query.eq('generated_exercise_id', exerciseId)
    }
    const { data } = await query.maybeSingle()
    if (data?.explanation_transcript) {
      transcript.value    = data.explanation_transcript
      reviewResult.value  = data.explanation_review ?? null
      reviewError.value   = null
      recordingState.value = data.explanation_review ? 'done' : 'idle'
    } else {
      resetExplain()
    }
  }

  function clearTranscript() {
    transcript.value = ''
    interimText.value = ''
  }

  function resetExplain() {
    // Set state BEFORE calling stop() so the onend handler doesn't restart
    recordingState.value = 'idle'
    if (recognition) {
      recognition.stop()
      recognition = null
    }
    transcript.value = ''
    interimText.value = ''
    reviewResult.value = null
    reviewError.value = null
  }

  return {
    recordingState, transcript, interimText, reviewResult, reviewError,
    isSpeechSupported, startRecording, stopRecording, submitForReview, resetExplain, clearTranscript, loadExplanation,
  }
}
