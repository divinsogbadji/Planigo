/**
 * AI response validator — ensures valid JSON with expected structure.
 * © 2025 @skid | MIT License
 */

export interface ValidatedTask {
  title: string
  description: string
  title_fr: string | null
  title_en: string | null
  description_fr: string | null
  description_en: string | null
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

/** Result of validating AI response — includes tasks and optional group titles */
export interface ValidatedAIResult {
  tasks: ValidatedTask[]
  group_title_fr: string | null
  group_title_en: string | null
}

/** Parse a JSON array of tasks from any parsed value */
function extractTasks(arr: unknown[]): ValidatedTask[] {
  const tasks: ValidatedTask[] = []
  for (const raw of arr) {
    if (typeof raw !== "object" || raw === null) continue
    const item = raw as Record<string, unknown>

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

    if (!title) continue

    const title_fr = typeof item.title_fr === "string" ? item.title_fr.trim() : null
    const title_en = typeof item.title_en === "string" ? item.title_en.trim() : null
    const description_fr = typeof item.description_fr === "string" ? item.description_fr.trim() : null
    const description_en = typeof item.description_en === "string" ? item.description_en.trim() : null

    tasks.push({ title, description, title_fr, title_en, description_fr, description_en, duration, priority, category, due_date, start_date })
  }
  return tasks
}

/**
 * Parse raw AI text into a validated result with tasks and group titles.
 * Supports both { group_title_fr, group_title_en, tasks: [...] } and plain [...] formats.
 * Returns null if the response is unusable.
 */
export function validateAIResponse(raw: string): ValidatedAIResult | null {
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    // Try to extract JSON object or array from surrounding text
    const objMatch = cleaned.match(/\{[\s\S]*\}/)
    const arrMatch = cleaned.match(/\[[\s\S]*\]/)
    const toParse = objMatch?.[0] || arrMatch?.[0]
    if (!toParse) return null
    try {
      parsed = JSON.parse(toParse)
    } catch {
      return null
    }
  }

  // New format: { group_title_fr, group_title_en, tasks: [...] }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && Array.isArray((parsed as Record<string, unknown>).tasks)) {
    const obj = parsed as Record<string, unknown>
    const tasks = extractTasks(obj.tasks as unknown[])
    if (tasks.length === 0) return null
    return {
      tasks,
      group_title_fr: typeof obj.group_title_fr === "string" ? obj.group_title_fr.trim() : null,
      group_title_en: typeof obj.group_title_en === "string" ? obj.group_title_en.trim() : null,
    }
  }

  // Legacy format: plain array [...]
  if (Array.isArray(parsed) && parsed.length > 0) {
    const tasks = extractTasks(parsed)
    if (tasks.length === 0) return null
    return { tasks, group_title_fr: null, group_title_en: null }
  }

  return null
}

