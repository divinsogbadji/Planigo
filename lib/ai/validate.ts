/**
 * AI response validator — ensures valid JSON with expected structure.
 * © 2025 @skid | MIT License
 */

export interface ValidatedTask {
  title: string
  description: string
  duration: string
  priority: "low" | "medium" | "high"
}

const VALID_PRIORITIES = new Set(["low", "medium", "high"])

/**
 * Parse raw AI text into a validated task array.
 * Returns null if the response is unusable.
 */
export function validateAIResponse(raw: string): ValidatedTask[] | null {
  // Strip markdown code fences
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim()

  // Try to find JSON array in the response
  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    // Attempt to extract JSON array from surrounding text
    const match = cleaned.match(/\[[\s\S]*\]/)
    if (!match) return null
    try {
      parsed = JSON.parse(match[0])
    } catch {
      return null
    }
  }

  if (!Array.isArray(parsed) || parsed.length === 0) return null

  const tasks: ValidatedTask[] = []

  for (const item of parsed) {
    if (typeof item !== "object" || item === null) continue

    const title = typeof item.title === "string" ? item.title.trim() : ""
    const description = typeof item.description === "string" ? item.description.trim() : ""
    const duration = typeof item.duration === "string" ? item.duration.trim() : "1h"
    const priority = typeof item.priority === "string" && VALID_PRIORITIES.has(item.priority.toLowerCase())
      ? (item.priority.toLowerCase() as "low" | "medium" | "high")
      : "medium"

    if (!title) continue // skip entries without a title

    tasks.push({ title, description, duration, priority })
  }

  return tasks.length > 0 ? tasks : null
}

