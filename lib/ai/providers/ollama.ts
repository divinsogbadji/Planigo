/**
 * Ollama provider — local AI, optional safe fallback.
 * Requires Ollama running at OLLAMA_URL (default: http://localhost:11434)
 * © 2025 @skid | MIT License
 */

const DEFAULT_URL = "http://localhost:11434"
const TIMEOUT_MS = 30_000

export async function generateTasks(prompt: string): Promise<string> {
  const baseUrl = process.env.OLLAMA_URL || DEFAULT_URL

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2",
        prompt,
        stream: false,
        options: { temperature: 0.7 },
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Ollama ${res.status}: ${body.slice(0, 200)}`)
    }

    const data = await res.json()
    const text = data.response
    if (!text) throw new Error("Empty Ollama response")
    return text
  } finally {
    clearTimeout(timeout)
  }
}

