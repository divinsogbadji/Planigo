/*
 * Copyright (c) - All Rights Reserved.
 * 
 * See the LICENSE file for more information.
 */

import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { goal, deadline } = body

    if (!goal) {
      return NextResponse.json({ error: "Missing goal" }, { status: 400 })
    }

    // 🔐 Sanitize input (basic)
    const cleanGoal = goal.trim().slice(0, 500)

    const prompt = `
You are a productivity assistant.

Goal: ${cleanGoal}
Deadline: ${deadline || "not specified"}

Break this goal into actionable tasks.

Rules:
- small steps
- clear titles
- realistic durations
- no personal data
- JSON only

Format:
[
  {
    "title": "",
    "description": "",
    "duration": "",
    "priority": "low | medium | high"
  }
]
`

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error("OPENAI_API_KEY is not set")
      return NextResponse.json({ error: "AI service not configured" }, { status: 503 })
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("OpenAI API error:", response.status, err)
      return NextResponse.json({ error: "AI request failed" }, { status: 502 })
    }

    const data = await response.json()

    let content = data.choices?.[0]?.message?.content
    if (!content) {
      console.error("No content in AI response:", JSON.stringify(data))
      return NextResponse.json({ error: "Empty AI response" }, { status: 502 })
    }

    // 🧠 Clean JSON (important)
    content = content.replace(/```json|```/g, "").trim()

    let tasks = []

    try {
      tasks = JSON.parse(content)
    } catch (err) {
      console.error("JSON parse error:", content)
      return NextResponse.json({ error: "Invalid AI response" }, { status: 500 })
    }

    return NextResponse.json({ tasks })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}


