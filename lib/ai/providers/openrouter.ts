/**
 * OpenRouter provider — auto-routes to available free models.
 * Uses "openrouter/free" which automatically picks from all available free models.
 * https://openrouter.ai/docs/guides/routing/routers/free-models-router
 * © 2025 @skid | MIT License
 */

const MAX_RETRIES = 1

export async function generateTasks(prompt: string): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new Error("OPENROUTER_API_KEY not set")

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "Planigo",
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    })

    if (res.status === 429 && attempt < MAX_RETRIES) {
      console.log(`[AI:OpenRouter] 429 — retry in ${(attempt + 1) * 3}s...`)
      await new Promise((r) => setTimeout(r, (attempt + 1) * 3000))
      continue
    }

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 200)}`)
    }

    const data = await res.json()
    const text = data.choices?.[0]?.message?.content
    if (!text) throw new Error("Empty OpenRouter response")
    console.log(`[AI:OpenRouter] Model used: ${data.model ?? "unknown"}`)
    return text
  }

  throw new Error("OpenRouter max retries exceeded")
}

