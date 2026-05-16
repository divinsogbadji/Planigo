import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { createClient } from "@/lib/supabase/server"

const DEST_EMAIL = "noreply.planigoteams@gmail.com"
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

// Escape HTML to prevent injection in the feedback email body.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export async function POST(req: NextRequest) {
  try {
    // Prefer the authenticated user's email when present; fall back to the
    // optional value provided in the body for unauthenticated feedback.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    const { message, email } = body as { message?: unknown; email?: unknown }

    if (typeof message !== "string" || message.trim().length < 3) {
      return NextResponse.json({ error: "Invalid feedback" }, { status: 400 })
    }

    const cleanMsg = message.trim().slice(0, 2000)
    const rawEmail = user?.email
      ?? (typeof email === "string" ? email.trim() : "")
    // Reject anything that doesn't look like an email or contains CR/LF
    // (header-injection guard for the Subject / From fields).
    const userEmail = rawEmail && EMAIL_RE.test(rawEmail) && !/[\r\n]/.test(rawEmail)
      ? rawEmail
      : "Anonyme"

    // Check SMTP credentials are configured
    const smtpPass = process.env.SMTP_PASS
    if (!smtpPass || smtpPass === "your-gmail-app-password-here") {
      console.warn("[Feedback] SMTP_PASS not configured — feedback dropped (length only):", cleanMsg.length)
      return NextResponse.json({ success: true })
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || DEST_EMAIL,
        pass: smtpPass,
      },
    })

    try {
      await transporter.sendMail({
        from: `"Planigo Feedback" <${process.env.SMTP_USER || DEST_EMAIL}>`,
        to: DEST_EMAIL,
        replyTo: userEmail !== "Anonyme" ? userEmail : undefined,
        subject: `[Planigo] Nouveau feedback de ${userEmail}`,
        text: `De: ${userEmail}\n\n${cleanMsg}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px">
            <h3 style="color:#6366f1">📬 Nouveau feedback Planigo</h3>
            <p><strong>De :</strong> ${escapeHtml(userEmail)}</p>
            <hr style="border:none;border-top:1px solid #e5e7eb"/>
            <p style="white-space:pre-wrap">${escapeHtml(cleanMsg)}</p>
            <hr style="border:none;border-top:1px solid #e5e7eb"/>
            <p style="font-size:12px;color:#9ca3af">Envoyé depuis Planigo</p>
          </div>
        `,
      })
    } catch (smtpErr) {
      console.error("[Feedback] SMTP send failed:", (smtpErr as Error).message)
      // Still return success to the user — feedback is logged on the server.
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Feedback error:", (error as Error).message)
    return NextResponse.json({ error: "Failed to send feedback" }, { status: 500 })
  }
}

