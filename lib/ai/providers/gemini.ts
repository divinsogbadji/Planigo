/**
 * Google Gemini provider (free tier — 15 req/min, 1500/day)
 * © 2025 @skid | MIT License
 */

const MAX_RETRIES = 2

export async function generateTasks(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error("GEMINI_API_KEY not set")

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7 },
        }),
      }
    )

    if (res.status === 429 && attempt < MAX_RETRIES) {
      console.log(`[AI:Gemini] 429 — retry in ${(attempt + 1) * 2}s...`)
      await new Promise((r) => setTimeout(r, (attempt + 1) * 2000))
      continue
    }

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Gemini ${res.status}: ${body.slice(0, 200)}`)
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error("Empty Gemini response")
    return text
  }

  throw new Error("Gemini max retries exceeded")
}

