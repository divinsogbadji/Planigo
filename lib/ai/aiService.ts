/**
 * AI Service — orchestrates providers, validation, fallback.
 * Flow: sanitize → try providers in order → validate → fallback if needed.
 * © 2025 @skid | MIT License
 */

import { sanitizeGoal, sanitizeDeadline } from "./sanitize"
import { validateAIResponse, type ValidatedTask } from "./validate"
import { getFallbackPlan } from "./fallback"
import * as openrouter from "./providers/openrouter"
import * as gemini from "./providers/gemini"
import * as ollama from "./providers/ollama"

// ─── System prompt builder ──────────────────────────────────────────
function buildSystemPrompt(locale?: string): string {
  const primary = locale === "fr" ? "français" : "English"
  const today = new Date().toISOString().split("T")[0]
  return `You are an expert project planner.

A user gives you a goal. Create a CONCRETE plan with tasks directly related to that goal.
Today's date is ${today}.

IMPORTANT: The user's primary language is ${primary}.
- "title" and "description" must be in ${primary}.
- You MUST also provide translations in BOTH languages using the fields "title_fr", "title_en", "description_fr", "description_en".

STRICT RULES:
- Generate EXACTLY 4 to 6 tasks. Never more than 6, never fewer than 4.
- Each task must be a concrete, actionable step — NOT generic advice like "create a planning" or "make a task list"
- DATES — this is critical:
  * If the user mentions specific dates (e.g. "12 avril", "April 14"), convert them to ISO format (YYYY-MM-DD)
  * Set "due_date" to the date that specific deliverable is due
  * Set "start_date" to a reasonable start date (a few days before due_date, or today if imminent)
  * Map each deliverable to its CORRECT date — do NOT swap or mix dates
  * Order tasks chronologically (earliest due_date first)
  * If no dates are mentioned, set both to null
- CATEGORY: choose the most fitting from: "personal", "work", "study", "travel", "health", "finance", "hobby"
- PRIORITY DISTRIBUTION IS MANDATORY:
  * "high": max 2 tasks — only for final deliverables or blocking deadlines
  * "medium": 2-3 tasks — important steps that support the deliverables
  * "low": 1-2 tasks — nice-to-have, review, or polish steps
  * NEVER mark all tasks as "high"
- Estimate realistic durations (30m, 1h, 2h, 4h, 1d)
- Do NOT include personal data
- Return ONLY valid JSON object (NOT an array), no markdown, no explanation, no wrapping
- The object MUST have "group_title_fr", "group_title_en", and "tasks" keys
- "group_title_fr" / "group_title_en": a SHORT, CONCISE label (max 6 words) that captures the general theme/idea of all tasks — NOT a copy of the user's request. Example: "Préparation voyage Japon", "Website Redesign", "Exam Study Plan"

JSON format:
{
  "group_title_fr": "court titre résumant le thème en français (max 6 mots)",
  "group_title_en": "short theme summary in English (max 6 words)",
  "tasks": [
    {
      "title": "task title in user's language",
      "description": "what to do in user's language",
      "title_fr": "titre en français",
      "title_en": "title in English",
      "description_fr": "description en français",
      "description_en": "description in English",
      "duration": "estimated time",
      "priority": "low | medium | high",
      "category": "work | study | personal | ...",
      "due_date": "YYYY-MM-DD or null",
      "start_date": "YYYY-MM-DD or null"
    }
  ]
}`
}

// ─── Provider registry (order = priority) ───────────────────────────
interface Provider {
  name: string
  fn: (prompt: string) => Promise<string>
}

const providers: Provider[] = [
  { name: "OpenRouter", fn: openrouter.generateTasks },
  { name: "Gemini",     fn: gemini.generateTasks },
  { name: "Ollama",     fn: ollama.generateTasks },
]

// ─── Main entry point ───────────────────────────────────────────────
export interface AIResult {
  tasks: ValidatedTask[]
  provider: string
  isFallback: boolean
  group_title_fr: string | null
  group_title_en: string | null
}

export async function generatePlan(rawGoal: string, rawDeadline?: string, locale?: string): Promise<AIResult> {
  const goal = sanitizeGoal(rawGoal)
  const deadline = sanitizeDeadline(rawDeadline)

  if (!goal || goal.length < 2) {
    return { tasks: getFallbackPlan(rawGoal, locale), provider: "fallback", isFallback: true, group_title_fr: null, group_title_en: null }
  }

  const prompt = `${buildSystemPrompt(locale)}\n\nGoal: ${goal}\nDeadline: ${deadline}`

  // Try each provider in order
  for (const { name, fn } of providers) {
    try {
      console.log(`[AI] Trying ${name}...`)
      const raw = await fn(prompt)
      console.log(`[AI] ✓ ${name} responded`)

      const result = validateAIResponse(raw)
      if (result) {
        console.log(`[AI] ✓ Validated ${result.tasks.length} tasks from ${name}`)
        return { tasks: result.tasks, provider: name, isFallback: false, group_title_fr: result.group_title_fr, group_title_en: result.group_title_en }
      }

      console.warn(`[AI] ✗ ${name} returned invalid structure, trying next...`)
    } catch (err) {
      console.warn(`[AI] ✗ ${name} failed:`, (err as Error).message)
    }
  }

  // All providers failed → return static fallback
  console.warn("[AI] All providers failed — using fallback plan")
  return { tasks: getFallbackPlan(goal, locale), provider: "fallback", isFallback: true, group_title_fr: null, group_title_en: null }
}

