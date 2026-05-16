/**
 * AI Translation endpoint — translates title + description to the other language.
 * Called after manual task creation to populate bilingual fields.
 */

import { NextRequest, NextResponse } from "next/server"
import * as openrouter from "@/lib/ai/providers/openrouter"
import * as gemini from "@/lib/ai/providers/gemini"
import * as ollama from "@/lib/ai/providers/ollama"
import { requireUser } from "@/lib/supabase/requireUser"

export const maxDuration = 60

interface Provider {
  name: string
  fn: (prompt: string) => Promise<string>
}

// Order kept intentional: OpenRouter → Gemini → Ollama (matches /api/ai/suggest-plan).
const providers: Provider[] = [
  { name: "OpenRouter", fn: openrouter.generateTasks },
  { name: "Gemini",     fn: gemini.generateTasks },
  { name: "Ollama",     fn: ollama.generateTasks },
]

function buildTranslatePrompt(title: string, description: string, sourceLang: string): string {
  const targetLang = sourceLang === "fr" ? "English" : "français"
  return `You are a translator. Translate the following task title and description to ${targetLang}.

RULES:
- Return ONLY valid JSON, no markdown, no explanation
- Keep the translation natural and concise
- If description is empty, set translated description to ""

Input:
- Title: "${title}"
- Description: "${description || ""}"

JSON format:
{
  "title": "translated title",
  "description": "translated description"
}`
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    const { title, description, locale } = body as { title?: unknown; description?: unknown; locale?: unknown }

    if (typeof title !== "string" || title.trim().length < 1 || title.length > 500) {
      return NextResponse.json({ error: "Missing or invalid title" }, { status: 400 })
    }
    const safeDescription = typeof description === "string" ? description.slice(0, 2000) : ""
    const safeLocale = locale === "fr" || locale === "en" ? locale : "en"

    const prompt = buildTranslatePrompt(title, safeDescription, safeLocale)

    for (const { name, fn } of providers) {
      try {
        console.log(`[Translate] Trying ${name}...`)
        const raw = await fn(prompt)
        const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim()

        let parsed: { title?: string; description?: string }
        try {
          parsed = JSON.parse(cleaned)
        } catch {
          const match = cleaned.match(/\{[\s\S]*\}/)
          if (!match) continue
          parsed = JSON.parse(match[0])
        }

        if (parsed.title) {
          console.log(`[Translate] ✓ ${name} translated successfully`)
          return NextResponse.json({
            title: parsed.title,
            description: parsed.description || "",
          })
        }
      } catch (err) {
        console.warn(`[Translate] ✗ ${name} failed:`, (err as Error).message)
      }
    }

    // All providers failed — return empty (caller will handle gracefully)
    return NextResponse.json({ title: null, description: null })
  } catch (error) {
    console.error("[Translate] Server error:", (error as Error).message)
    return NextResponse.json({ error: "Translation service unavailable" }, { status: 503 })
  }
}

