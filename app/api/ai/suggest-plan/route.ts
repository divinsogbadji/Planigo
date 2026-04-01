/*
 * Copyright (c) - All Rights Reserved.
 * See the LICENSE file for more information.
 *
 * AI Task Planner — Modular multi-provider with automatic fallback
 * Flow: OpenRouter → Gemini → Ollama → Local Fallback
 */

import { NextRequest, NextResponse } from "next/server"
import { generatePlan } from "@/lib/ai/aiService"

// ─── Route handler ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { goal, deadline } = await req.json()

    if (!goal || typeof goal !== "string" || goal.trim().length < 2) {
      return NextResponse.json({ error: "Missing or invalid goal" }, { status: 400 })
    }

    const result = await generatePlan(goal, deadline)

    return NextResponse.json({
      tasks: result.tasks,
      provider: result.provider,
      isFallback: result.isFallback,
    })
  } catch (error) {
    console.error("[AI] Server error:", error)
    return NextResponse.json({ error: "AI service unavailable" }, { status: 503 })
  }
}
