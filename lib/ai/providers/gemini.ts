/**
 * Google Gemini provider (free tier)
 * Tries gemini-2.0-flash first, then gemini-2.0-flash-lite as fallback.
 * © 2025 @skid | MIT License
 */

const MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite"]
const MAX_RETRIES = 1

export async function generateTasks(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error("GEMINI_API_KEY not set")

  for (const model of MODELS) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
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
          console.log(`[AI:Gemini] ${model} 429 — retry in ${(attempt + 1) * 2}s...`)
          await new Promise((r) => setTimeout(r, (attempt + 1) * 2000))
          continue
        }

        if (!res.ok) {
          const body = await res.text()
          throw new Error(`Gemini ${model} ${res.status}: ${body.slice(0, 200)}`)
        }

        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (!text) throw new Error(`Empty Gemini ${model} response`)
        console.log(`[AI:Gemini] Model used: ${model}`)
        return text
      } catch (err) {
        if (attempt === MAX_RETRIES) throw err
      }
    }
  }

  throw new Error("Gemini all models failed")
}

