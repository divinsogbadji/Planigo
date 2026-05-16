/*
 * Copyright (c) - All Rights Reserved.
 * See the LICENSE file for more information.
 *
 * AI Task Planner — Modular multi-provider with automatic fallback
 * Flow: OpenRouter → Gemini → Ollama → Local Fallback
 */

import { NextRequest, NextResponse } from "next/server"
import { generatePlan } from "@/lib/ai/aiService"
import { requireUser } from "@/lib/supabase/requireUser"

// Allow up to 60s for the chained provider attempts (Vercel Pro/Enterprise; ignored on Hobby).
export const maxDuration = 60

// ─── Route handler ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    const { goal, deadline, locale } = body as { goal?: unknown; deadline?: unknown; locale?: unknown }

    if (typeof goal !== "string" || goal.trim().length < 2 || goal.length > 1000) {
      return NextResponse.json({ error: "Missing or invalid goal" }, { status: 400 })
    }
    const safeDeadline = typeof deadline === "string" ? deadline : undefined
    const safeLocale = locale === "fr" || locale === "en" ? locale : "en"

    const result = await generatePlan(goal, safeDeadline, safeLocale)

    return NextResponse.json({
      tasks: result.tasks,
      provider: result.provider,
      isFallback: result.isFallback,
      group_title_fr: result.group_title_fr,
      group_title_en: result.group_title_en,
    })
  } catch (error) {
    console.error("[AI] Server error:", (error as Error).message)
    return NextResponse.json({ error: "AI service unavailable" }, { status: 503 })
  }
}
