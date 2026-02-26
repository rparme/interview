// Shared provider resolution and API call helpers for all /api handlers.
// Files prefixed with _ are not treated as routes by Vercel.

export function resolveProvider() {
  const anthropicKey  = process.env.ANTHROPIC_API_KEY
  const openrouterKey = process.env.OPENROUTER_API_KEY

  if (anthropicKey && openrouterKey) {
    throw new Error('Both ANTHROPIC_API_KEY and OPENROUTER_API_KEY are set. Remove one.')
  }
  if (!anthropicKey && !openrouterKey) {
    throw new Error('No API key configured. Set either ANTHROPIC_API_KEY or OPENROUTER_API_KEY.')
  }

  return anthropicKey
    ? { type: 'anthropic', key: anthropicKey }
    : { type: 'openrouter', key: openrouterKey }
}

export async function callAnthropic(apiKey, { systemPrompt, userPrompt, toolName, toolDescription, inputSchema }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      tools: [{ name: toolName, description: toolDescription, input_schema: inputSchema }],
      tool_choice: { type: 'tool', name: toolName },
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw Object.assign(new Error('Anthropic request failed'), { status: 502, detail: text })
  }

  const data = await response.json()
  const toolUse = data.content?.find(b => b.type === 'tool_use')
  if (!toolUse) throw new Error('Anthropic returned no tool_use block')
  return toolUse.input
}

export async function callOpenRouter(apiKey, { systemPrompt, userPrompt }) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4-6',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw Object.assign(new Error('OpenRouter request failed'), { status: 502, detail: text })
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty response from model')

  try { return JSON.parse(content) }
  catch { throw Object.assign(new Error('Model returned invalid JSON'), { raw: content }) }
}
