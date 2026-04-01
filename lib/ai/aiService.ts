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
const LANG_INSTRUCTIONS: Record<string, string> = {
  fr: "IMPORTANT: Réponds ENTIÈREMENT en français. Tous les titres, descriptions et contenus doivent être en français.",
  en: "IMPORTANT: Respond ENTIRELY in English. All titles, descriptions and content must be in English.",
}

function buildSystemPrompt(locale?: string): string {
  const lang = LANG_INSTRUCTIONS[locale ?? "en"] ?? LANG_INSTRUCTIONS.en
  const today = new Date().toISOString().split("T")[0]
  return `You are an expert project planner.

A user gives you a goal. Create a CONCRETE plan with tasks directly related to that goal.
Today's date is ${today}.

${lang}

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
- Return ONLY valid JSON array, no markdown, no explanation, no wrapping

JSON format:
[
  {
    "title": "short specific task title",
    "description": "what to do concretely",
    "duration": "estimated time",
    "priority": "low | medium | high",
    "category": "work | study | personal | ...",
    "due_date": "YYYY-MM-DD or null",
    "start_date": "YYYY-MM-DD or null"
  }
]`
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
}

export async function generatePlan(rawGoal: string, rawDeadline?: string, locale?: string): Promise<AIResult> {
  const goal = sanitizeGoal(rawGoal)
  const deadline = sanitizeDeadline(rawDeadline)

  if (!goal || goal.length < 2) {
    return { tasks: getFallbackPlan(rawGoal, locale), provider: "fallback", isFallback: true }
  }

  const prompt = `${buildSystemPrompt(locale)}\n\nGoal: ${goal}\nDeadline: ${deadline}`

  // Try each provider in order
  for (const { name, fn } of providers) {
    try {
      console.log(`[AI] Trying ${name}...`)
      const raw = await fn(prompt)
      console.log(`[AI] ✓ ${name} responded`)

      const tasks = validateAIResponse(raw)
      if (tasks) {
        console.log(`[AI] ✓ Validated ${tasks.length} tasks from ${name}`)
        return { tasks, provider: name, isFallback: false }
      }

      console.warn(`[AI] ✗ ${name} returned invalid structure, trying next...`)
    } catch (err) {
      console.warn(`[AI] ✗ ${name} failed:`, (err as Error).message)
    }
  }

  // All providers failed → return static fallback
  console.warn("[AI] All providers failed — using fallback plan")
  return { tasks: getFallbackPlan(goal, locale), provider: "fallback", isFallback: true }
}

