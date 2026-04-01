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
  return `You are a productivity assistant.

Convert the user goal into a list of actionable tasks.

${lang}

Rules:
- break into small steps
- include a short description
- estimate duration
- assign priority (low, medium, high)
- do NOT include personal data
- return ONLY JSON

Format:
[
  {
    "title": "",
    "description": "",
    "duration": "",
    "priority": ""
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

