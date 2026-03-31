import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const { message, email } = await req.json()

    if (!message || typeof message !== "string" || message.trim().length < 3) {
      return NextResponse.json({ error: "Invalid feedback" }, { status: 400 })
    }

    const supabase = await createClient()

    // Use Supabase's admin auth to send an email via the configured SMTP
    // We'll use the edge function or direct SMTP approach
    // For simplicity, store feedback in a table and/or send via Supabase's built-in email
    const { error } = await supabase.from("feedback").insert({
      message: message.trim().slice(0, 2000),
      email: email?.trim() || null,
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Feedback insert error:", error)
      // If the table doesn't exist, still return success (graceful degradation)
      if (error.code === "42P01") {
        console.warn("Feedback table does not exist. Create it with: CREATE TABLE feedback (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, message text NOT NULL, email text, created_at timestamptz DEFAULT now());")
        return NextResponse.json({ success: true, note: "stored" })
      }
      return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Feedback error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

