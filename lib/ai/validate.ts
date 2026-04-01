/**
 * AI response validator — ensures valid JSON with expected structure.
 * © 2025 @skid | MIT License
 */

export interface ValidatedTask {
  title: string
  description: string
  duration: string
  priority: "low" | "medium" | "high"
  category: "personal" | "work" | "study" | "travel" | "health" | "finance" | "hobby"
  due_date: string | null
  start_date: string | null
}

const VALID_PRIORITIES = new Set(["low", "medium", "high"])
const VALID_CATEGORIES = new Set(["personal", "work", "study", "travel", "health", "finance", "hobby"])

/** Try to parse a date string into YYYY-MM-DD format. Returns null if invalid. */
function parseISODate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null
  const d = new Date(value.trim())
  if (isNaN(d.getTime())) return null
  // Return YYYY-MM-DD only — Supabase DATE/TIMESTAMPTZ columns accept this cleanly
  return d.toISOString().split("T")[0]
}

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
      ? (item.priority.toLowerCase() as ValidatedTask["priority"])
      : "medium"
    const category = typeof item.category === "string" && VALID_CATEGORIES.has(item.category.toLowerCase())
      ? (item.category.toLowerCase() as ValidatedTask["category"])
      : "personal"
    const due_date = parseISODate(item.due_date)
    const start_date = parseISODate(item.start_date)

    if (!title) continue // skip entries without a title

    tasks.push({ title, description, duration, priority, category, due_date, start_date })
  }

  return tasks.length > 0 ? tasks : null
}

