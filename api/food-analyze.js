// Vercel serverless function: Claude-powered food nutrition estimation.
// Accepts a text description OR an image and returns structured nutrition.
//
// POST /api/food-analyze
//   { mode: 'text', text: '3 scrambled eggs with cheese' }
//   { mode: 'image', image: '<base64>', mediaType: 'image/jpeg' }
//
// -> { food_name, calories, protein, carbs, fat, serving_size, kind: 'portion' }
//
// Requires ANTHROPIC_API_KEY in the environment.

export const config = { maxDuration: 30 }

const MODEL = 'claude-sonnet-4-6'

const SYSTEM = `You are a nutrition estimation assistant for a calorie tracking app.
Estimate the nutrition for the food the user describes or shows in a photo.
Estimate for the TOTAL portion described or visible (not per 100g).
Make reasonable assumptions about typical preparation and portion size.
Always call the log_food tool with your best numeric estimates.`

const TOOL = {
  name: 'log_food',
  description: 'Record the estimated nutrition for the described or pictured food.',
  input_schema: {
    type: 'object',
    properties: {
      food_name: { type: 'string', description: 'Concise name of the food/dish' },
      serving_size: { type: 'string', description: 'Human-readable portion, e.g. "3 eggs" or "1 bowl"' },
      calories: { type: 'number', description: 'Total kcal for the portion' },
      protein: { type: 'number', description: 'Grams of protein' },
      carbs: { type: 'number', description: 'Grams of carbohydrate' },
      fat: { type: 'number', description: 'Grams of fat' },
    },
    required: ['food_name', 'calories', 'protein', 'carbs', 'fat'],
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' })
  }

  const { mode, text, image, mediaType } = req.body || {}

  let userContent
  if (mode === 'image' && image) {
    userContent = [
      { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image } },
      { type: 'text', text: 'Identify this food and estimate its nutrition for the visible portion.' },
    ]
  } else if (mode === 'text' && text?.trim()) {
    userContent = [{ type: 'text', text: `Estimate nutrition for: ${text.trim()}` }]
  } else {
    return res.status(400).json({ error: 'Provide either text or an image' })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 28000)

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 512,
        // Cache the static system prompt to cut cost/latency on repeat calls.
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        tools: [TOOL],
        tool_choice: { type: 'tool', name: 'log_food' },
        messages: [{ role: 'user', content: userContent }],
      }),
    })

    if (!aiRes.ok) {
      const detail = await aiRes.text()
      return res.status(502).json({ error: `Claude error (${aiRes.status})`, detail })
    }

    const data = await aiRes.json()
    const toolUse = (data.content || []).find((b) => b.type === 'tool_use')
    if (!toolUse) {
      return res.status(502).json({ error: 'No estimate returned' })
    }

    const f = toolUse.input
    return res.status(200).json({
      food_name: f.food_name,
      serving_size: f.serving_size || null,
      calories: Math.round(f.calories),
      protein: Math.round((f.protein || 0) * 10) / 10,
      carbs: Math.round((f.carbs || 0) * 10) / 10,
      fat: Math.round((f.fat || 0) * 10) / 10,
      kind: 'portion',
    })
  } catch (err) {
    const aborted = err.name === 'AbortError'
    return res.status(aborted ? 504 : 500).json({ error: aborted ? 'Analysis timed out' : 'Analysis failed' })
  } finally {
    clearTimeout(timeout)
  }
}
