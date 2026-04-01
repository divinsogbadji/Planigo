import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"

const FROM_EMAIL = "noreply.planigoteams@gmail.com"

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json()

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 })
    }

    const smtpPass = process.env.SMTP_PASS
    if (!smtpPass || smtpPass === "your-gmail-app-password-here") {
      console.warn("[Welcome] SMTP_PASS not configured — skipping welcome email")
      return NextResponse.json({ success: true, skipped: true })
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || FROM_EMAIL,
        pass: smtpPass,
      },
    })

    const displayName = name || email.split("@")[0]

    await transporter.sendMail({
      from: `"Planigo" <${process.env.SMTP_USER || FROM_EMAIL}>`,
      to: email,
      subject: "🎉 Bienvenue sur Planigo! / Welcome to Planigo!",
      html: `
        <div style="font-family:'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#0c0c10;color:#e5e7eb;border-radius:16px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#6366f1,#a855f7);padding:32px 24px;text-align:center">
            <h1 style="color:white;margin:0;font-size:28px">🚀 Planigo</h1>
            <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px">Task Management & AI Planning</p>
          </div>
          <div style="padding:24px">
            <h2 style="color:#e5e7eb;margin:0 0 12px">Bonjour ${displayName} 👋</h2>
            <p style="color:#9ca3af;font-size:14px;line-height:1.6">
              Bienvenue sur <strong style="color:#818cf8">Planigo</strong>! Votre compte a été créé avec succès.
            </p>
            <div style="margin:20px 0;padding:16px;background:rgba(99,102,241,0.1);border-radius:12px;border:1px solid rgba(99,102,241,0.2)">
              <h3 style="color:#818cf8;margin:0 0 8px;font-size:14px">✨ Ce que vous pouvez faire :</h3>
              <ul style="color:#9ca3af;font-size:13px;line-height:1.8;padding-left:20px;margin:0">
                <li>📋 Créer et organiser vos tâches par catégories</li>
                <li>🤖 Utiliser l'IA pour générer des plans de tâches</li>
                <li>📅 Visualiser vos tâches sur un calendrier</li>
                <li>🎯 Gérer les priorités et les échéances</li>
                <li>🗂️ Archiver les tâches terminées</li>
              </ul>
            </div>
            <p style="color:#6b7280;font-size:12px;text-align:center;margin:20px 0 0">
              © 2025 @skid | MIT License
            </p>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Welcome email error:", error)
    return NextResponse.json({ error: "Failed to send welcome email" }, { status: 500 })
  }
}

