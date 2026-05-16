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

    const appUrl = process.env.NEXT_PUBLIC_SITE_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://planigo-mu.vercel.app")

    await transporter.sendMail({
      from: `"Planigo" <${process.env.SMTP_USER || FROM_EMAIL}>`,
      to: email,
      subject: "🎉 Bienvenue sur Planigo ! / Welcome to Planigo!",
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;background:#0c0c10;color:#e5e7eb;border-radius:16px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#6366f1,#a855f7);padding:32px 24px;text-align:center">
            <h1 style="color:white;margin:0;font-size:28px">🚀 Planigo</h1>
            <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px">Task Management &amp; AI Planning</p>
          </div>
          <div style="padding:28px 24px">
            <h2 style="color:#e5e7eb;margin:0 0 12px;font-size:20px">Bonjour ${displayName} 👋</h2>
            <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 16px">
              <strong style="color:#e5e7eb">FR —</strong> Bienvenue sur <strong style="color:#818cf8">Planigo</strong> ! Ton compte a été créé avec succès.<br><br>
              <strong style="color:#e5e7eb">EN —</strong> Welcome to <strong style="color:#818cf8">Planigo</strong>! Your account has been created successfully.
            </p>

            <div style="margin:20px 0;padding:14px 16px;background:rgba(251,191,36,0.08);border-radius:10px;border:1px solid rgba(251,191,36,0.25)">
              <p style="color:#fbbf24;font-size:13px;font-weight:600;margin:0 0 6px">📬 Étape suivante / Next step</p>
              <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:0">
                Un email de confirmation séparé t'a été envoyé. Clique sur le lien à l'intérieur pour activer ton compte avant de te connecter.<br>
                <em>A separate confirmation email has been sent. Click the link inside to activate your account before signing in.</em>
              </p>
            </div>

            <div style="margin:20px 0;padding:16px;background:rgba(99,102,241,0.1);border-radius:12px;border:1px solid rgba(99,102,241,0.2)">
              <h3 style="color:#818cf8;margin:0 0 8px;font-size:14px">✨ Ce que tu peux faire / What you can do</h3>
              <ul style="color:#9ca3af;font-size:13px;line-height:1.8;padding-left:20px;margin:0">
                <li>📋 Créer et organiser tes tâches par catégories / Create &amp; organize tasks by category</li>
                <li>🤖 Utiliser l'IA pour générer des plans / Use AI to generate task plans</li>
                <li>📅 Visualiser tes tâches sur un calendrier / View tasks on a calendar</li>
                <li>🎯 Gérer les priorités et les échéances / Manage priorities &amp; deadlines</li>
                <li>🗂️ Archiver les tâches terminées / Archive completed tasks</li>
              </ul>
            </div>

            <div style="text-align:center;margin:24px 0 8px">
              <a href="${appUrl}/login" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#a855f7);color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px">
                🚀 Ouvrir Planigo / Open Planigo
              </a>
            </div>

            <div style="margin:24px 0 0;padding:14px 16px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid rgba(255,255,255,0.05)">
              <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:0">
                🛡️ <strong style="color:#e5e7eb">Tu ne trouves pas l'email de confirmation ?</strong> Vérifie tes spams / courriers indésirables. Ajoute <strong style="color:#a5b4fc">noreply.planigoteams@gmail.com</strong> à tes contacts pour ne plus rien manquer.<br><br>
                <em>Can't find the confirmation email? Check your spam / junk folder. Add <strong style="color:#a5b4fc">noreply.planigoteams@gmail.com</strong> to your contacts so you don't miss anything.</em>
              </p>
            </div>

            <p style="color:#6b7280;font-size:11px;text-align:center;margin:20px 0 0;border-top:1px solid rgba(255,255,255,0.05);padding-top:14px">
              © 2025 Planigo · MIT License
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

