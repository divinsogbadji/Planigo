import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"

const DEST_EMAIL = "noreply.planigoteams@gmail.com"

export async function POST(req: NextRequest) {
  try {
    const { message, email } = await req.json()

    if (!message || typeof message !== "string" || message.trim().length < 3) {
      return NextResponse.json({ error: "Invalid feedback" }, { status: 400 })
    }

    const cleanMsg = message.trim().slice(0, 2000)
    const userEmail = email?.trim() || "Anonyme"

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || DEST_EMAIL,
        pass: process.env.SMTP_PASS,
      },
    })

    await transporter.sendMail({
      from: `"Planigo Feedback" <${process.env.SMTP_USER || DEST_EMAIL}>`,
      to: DEST_EMAIL,
      subject: `[Planigo] Nouveau feedback de ${userEmail}`,
      text: `De: ${userEmail}\n\n${cleanMsg}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px">
          <h3 style="color:#6366f1">📬 Nouveau feedback Planigo</h3>
          <p><strong>De :</strong> ${userEmail}</p>
          <hr style="border:none;border-top:1px solid #e5e7eb"/>
          <p style="white-space:pre-wrap">${cleanMsg}</p>
          <hr style="border:none;border-top:1px solid #e5e7eb"/>
          <p style="font-size:12px;color:#9ca3af">Envoyé depuis Planigo</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Feedback email error:", error)
    return NextResponse.json({ error: "Failed to send feedback" }, { status: 500 })
  }
}

