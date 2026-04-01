/*
 * Copyright (c) - All Rights Reserved.
 * See the LICENSE file for more information.
 *
 * AI Task Planner — Triple provider with automatic fallback
 * Provider 1: Google Gemini (free tier)
 * Provider 2: Groq / Llama 3 (free tier)
 * Provider 3: OpenAI GPT-4o-mini (paid)
 */

import { NextRequest, NextResponse } from "next/server"

const SYSTEM_PROMPT = `You are a productivity assistant. Break goals into actionable tasks.
Rules: small steps, clear titles, realistic durations, no personal data, JSON only.
Format:
[{"title":"","description":"","duration":"","priority":"low | medium | high"}]`

// ─── Provider: Google Gemini (with retry on 429) ──────────────────
async function callGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error("GEMINI_API_KEY not set")

  const maxRetries = 2
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7 },
        }),
      }
    )

    if (res.status === 429 && attempt < maxRetries) {
      console.log(`[AI] Gemini 429 — retrying in ${(attempt + 1) * 2}s...`)
      await new Promise(r => setTimeout(r, (attempt + 1) * 2000))
      continue
    }

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Gemini ${res.status}: ${err}`)
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error("Empty Gemini response")
    return text
  }

  throw new Error("Gemini max retries exceeded")
}

// ─── Provider: Groq (Llama 3, free tier) ─────────────────────────
async function callGroq(prompt: string): Promise<string> {
  const key = process.env.GROQ_API_KEY
  if (!key) throw new Error("GROQ_API_KEY not set")

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq ${res.status}: ${err}`)
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error("Empty Groq response")
  return text
}

// ─── Provider: OpenAI ───────────────────────────────────────────────
async function callOpenAI(prompt: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error("OPENAI_API_KEY not set")

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI ${res.status}: ${err}`)
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error("Empty OpenAI response")
  return text
}

// ─── Fallback orchestrator ──────────────────────────────────────────
async function callAI(prompt: string): Promise<{ content: string; provider: string }> {
  // Try Gemini first (free), then Groq (free), then OpenAI as last resort
  const providers = [
    { name: "Gemini", fn: callGemini },
    { name: "Groq", fn: callGroq },
    { name: "OpenAI", fn: callOpenAI },
  ]

  for (const { name, fn } of providers) {
    try {
      console.log(`[AI] Trying ${name}...`)
      const content = await fn(prompt)
      console.log(`[AI] ✓ ${name} responded`)
      return { content, provider: name }
    } catch (err) {
      console.warn(`[AI] ✗ ${name} failed:`, (err as Error).message)
    }
  }

  throw new Error("All AI providers failed")
}

// ─── Route handler ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { goal, deadline } = await req.json()

    if (!goal) {
      return NextResponse.json({ error: "Missing goal" }, { status: 400 })
    }

    const cleanGoal = goal.trim().slice(0, 500)

    const prompt = `${SYSTEM_PROMPT}\n\nGoal: ${cleanGoal}\nDeadline: ${deadline || "not specified"}`

    const { content, provider } = await callAI(prompt)

    // 🧠 Clean JSON
    const cleaned = content.replace(/```json|```/g, "").trim()

    let tasks = []
    try {
      tasks = JSON.parse(cleaned)
    } catch {
      console.error(`[AI] JSON parse error from ${provider}:`, cleaned)
      return NextResponse.json({ error: "Invalid AI response" }, { status: 500 })
    }

    return NextResponse.json({ tasks, provider })
  } catch (error) {
    console.error("[AI] Server error:", error)
    return NextResponse.json({ error: "AI service unavailable" }, { status: 503 })
  }
}
