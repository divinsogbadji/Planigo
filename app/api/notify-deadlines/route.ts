import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import nodemailer from "nodemailer"

const FROM_EMAIL = "noreply.planigoteams@gmail.com"

/**
 * GET /api/notify-deadlines
 * Checks for tasks with deadlines in the next 24h and sends email reminders.
 * Can be called by a cron job (e.g. Vercel Cron, or external service).
 * Requires SUPABASE_SERVICE_ROLE_KEY for server-side access.
 */
export async function GET(req: NextRequest) {
  // Verify cron secret to prevent abuse
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const smtpPass = process.env.SMTP_PASS
  if (!smtpPass || smtpPass === "your-gmail-app-password-here") {
    return NextResponse.json({ skipped: true, reason: "SMTP not configured" })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Missing Supabase service config" }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  // Find non-archived tasks with due_date in the next 24 hours
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, title, due_date, user_id, priority")
    .eq("is_archived", false)
    .neq("status", "done")
    .gte("due_date", now.toISOString())
    .lte("due_date", in24h.toISOString())

  if (error) {
    console.error("[Deadlines] Query error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ sent: 0, message: "No upcoming deadlines" })
  }

  // Group tasks by user
  const byUser: Record<string, typeof tasks> = {}
  for (const task of tasks) {
    if (!byUser[task.user_id]) byUser[task.user_id] = []
    byUser[task.user_id].push(task)
  }

  // Get user emails from Supabase Auth
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || FROM_EMAIL,
      pass: smtpPass,
    },
  })

  let sentCount = 0

  for (const [userId, userTasks] of Object.entries(byUser)) {
    // Get user email from auth.users
    const { data: userData } = await supabase.auth.admin.getUserById(userId)
    const userEmail = userData?.user?.email
    if (!userEmail) continue

    const taskListHtml = userTasks
      .map((t) => {
        const date = new Date(t.due_date!).toLocaleString("fr-FR", {
          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
        })
        const priorityEmoji = t.priority === "high" ? "🔴" : t.priority === "medium" ? "🟡" : "⚪"
        return `<li>${priorityEmoji} <strong>${t.title}</strong> — ${date}</li>`
      })
      .join("")

    try {
      await transporter.sendMail({
        from: `"Planigo Rappels" <${process.env.SMTP_USER || FROM_EMAIL}>`,
        to: userEmail,
        subject: `⏰ ${userTasks.length} tâche(s) arrivent à échéance — Planigo`,
        html: `
          <div style="font-family:'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#0c0c10;color:#e5e7eb;border-radius:16px;overflow:hidden">
            <div style="background:linear-gradient(135deg,#f59e0b,#ef4444);padding:24px;text-align:center">
              <h1 style="color:white;margin:0;font-size:22px">⏰ Rappel d'échéances</h1>
            </div>
            <div style="padding:24px">
              <p style="color:#9ca3af;font-size:14px">Les tâches suivantes arrivent à échéance dans les prochaines 24h :</p>
              <ul style="color:#e5e7eb;font-size:14px;line-height:2;padding-left:20px">${taskListHtml}</ul>
              <p style="color:#6b7280;font-size:12px;text-align:center;margin:20px 0 0">
                Planigo — © 2025 @skid | MIT License
              </p>
            </div>
          </div>
        `,
      })
      sentCount++
    } catch (err) {
      console.error(`[Deadlines] Failed to email ${userEmail}:`, (err as Error).message)
    }
  }

  return NextResponse.json({ sent: sentCount, tasksFound: tasks.length })
}

