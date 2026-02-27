import { z } from 'zod'
import { callAnthropic, callOpenRouter, resolveProvider } from './_provider.mjs'
import { requireAuth } from './_auth.mjs'

const ReviewSchema = z.object({
  overall: z.number().int().min(1).max(10),
  dimensions: z.object({
    intuition: z.number().int().min(1).max(10),
    clarity:   z.number().int().min(1).max(10),
    tradeoffs: z.number().int().min(1).max(10),
  }),
  summary:   z.string(),
  strengths: z.array(z.string()).max(3),
  improve:   z.array(z.string()).max(3),
})

const REVIEW_TOOL_SCHEMA = {
  type: 'object',
  properties: {
    overall: { type: 'integer', minimum: 1, maximum: 10, description: 'Overall score from 1-10' },
    dimensions: {
      type: 'object',
      properties: {
        intuition:  { type: 'integer', minimum: 1, maximum: 10, description: 'Did they identify the right pattern and why it fits?' },
        clarity:    { type: 'integer', minimum: 1, maximum: 10, description: 'Could you follow the explanation?' },
        tradeoffs:  { type: 'integer', minimum: 1, maximum: 10, description: 'Did they mention complexity or alternatives?' },
      },
      required: ['intuition', 'clarity', 'tradeoffs'],
    },
    summary:   { type: 'string', description: '1-2 sentence summary of the explanation quality' },
    strengths: { type: 'array', items: { type: 'string' }, maxItems: 3, description: 'Up to 3 specific strengths' },
    improve:   { type: 'array', items: { type: 'string' }, maxItems: 3, description: 'Up to 3 specific areas to improve' },
  },
  required: ['overall', 'dimensions', 'summary', 'strengths', 'improve'],
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try { await requireAuth(req) }
  catch (err) { return res.status(err.status ?? 401).json({ error: err.message, code: err.code }) }

  let provider
  try { provider = resolveProvider() }
  catch (err) { return res.status(500).json({ error: err.message }) }

  const { problem, category, transcript } = req.body ?? {}
  if (!transcript?.trim()) return res.status(400).json({ error: 'transcript is required' })

  const systemPrompt = 'You are an experienced technical interviewer at a top tech company. You will receive a speech-to-text transcript of a candidate\'s verbal explanation — expect occasional transcription errors, run-on sentences, filler words, and garbled phrases. Use context to infer what the candidate meant rather than penalising transcription noise. Evaluate their approach explanation on: intuition (did they identify the right pattern and why it fits?), clarity (could you follow the explanation despite the raw transcript?), tradeoffs (did they mention complexity or alternatives?). Do NOT penalise for not having a complete solution — reward identifying the core insight and communicating it confidently. Be constructive, specific, and concise.'

  let userPrompt = ''
  if (problem?.title) userPrompt += `Problem: ${problem.title}\n`
  if (problem?.description) userPrompt += `\n${problem.description}\n`
  if (problem?.examples?.length) userPrompt += `\nExamples:\n${problem.examples.join('\n')}\n`
  if (problem?.constraints?.length) userPrompt += `\nConstraints:\n${problem.constraints.join('\n')}\n`
  if (category) userPrompt += `\nCategory hint: ${category}\n`
  userPrompt += `\nCandidate's verbal explanation:\n"${transcript}"`

  console.log(`[review-explanation] provider=${provider.type} transcript_length=${transcript.length}`)

  try {
    const raw = provider.type === 'anthropic'
      ? await callAnthropic(provider.key, { systemPrompt, userPrompt, toolName: 'review_explanation', toolDescription: 'Score a candidate\'s verbal explanation of their approach to a coding problem', inputSchema: REVIEW_TOOL_SCHEMA })
      : await callOpenRouter(provider.key, { systemPrompt, userPrompt: userPrompt + '\n\nRespond with valid JSON only matching the schema: { overall, dimensions: { intuition, clarity, tradeoffs }, summary, strengths, improve }' })

    const result = ReviewSchema.safeParse(raw)
    if (!result.success) {
      console.error('[review-explanation] schema mismatch:', result.error.issues)
      return res.status(502).json({ error: 'Review schema mismatch', detail: result.error.issues })
    }

    console.log('[review-explanation] done: overall=', result.data.overall)
    return res.status(200).json(result.data)
  } catch (err) {
    console.error('[review-explanation] error:', err.message)
    return res.status(err.status ?? 500).json({ error: err.message, detail: err.detail })
  }
}
