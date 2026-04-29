import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import nodemailer from "nodemailer"

const FROM_EMAIL = "noreply.planigoteams@gmail.com"

/** Reminder thresholds by priority (in hours before deadline) */
const REMINDER_HOURS: Record<string, number> = {
  high: 48,
  medium: 24,
  low: 12,
}

/**
 * GET /api/notify-deadlines
 * 1. Checks for tasks approaching deadline based on priority thresholds
 *    - High: 48h before | Medium: 24h before | Low: 12h before
 * 2. Auto-archives expired tasks (if user enabled auto_archive)
 * 3. Sends email reminders and auto-archive notifications
 * Only notifies users who have enabled notifications in their profile.
 * Can be called by a cron job (e.g. Vercel Cron, or external service).
 */
export async function GET(req: NextRequest) {
  // Verify cron secret to prevent abuse
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Missing Supabase service config" }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const now = new Date()
  const maxWindow = new Date(now.getTime() + 48 * 60 * 60 * 1000) // 48h max window

  // Base URL used to build deep links inside emails. APP_URL must be set on
  // Vercel; we fall back to localhost for safety in case it is missing.
  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "")

  // ── 1. REMINDER NOTIFICATIONS ──────────────────────────────────────
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, title, title_fr, title_en, due_date, user_id, priority")
    .eq("is_archived", false)
    .is("deleted_at", null)
    .neq("status", "done")
    .not("due_date", "is", null)
    .gte("due_date", now.toISOString())
    .lte("due_date", maxWindow.toISOString())

  if (error) {
    console.error("[Deadlines] Query error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Filter tasks by their priority-specific threshold
  const eligibleTasks = (tasks ?? []).filter((t) => {
    const hoursLeft = (new Date(t.due_date).getTime() - now.getTime()) / (1000 * 60 * 60)
    const threshold = REMINDER_HOURS[t.priority] ?? 24
    return hoursLeft <= threshold
  })

  // Group by user
  const remindersByUser: Record<string, typeof eligibleTasks> = {}
  for (const task of eligibleTasks) {
    if (!remindersByUser[task.user_id]) remindersByUser[task.user_id] = []
    remindersByUser[task.user_id].push(task)
  }

  // ── 2. AUTO-ARCHIVE EXPIRED TASKS ─────────────────────────────────
  const { data: expiredTasks } = await supabase
    .from("tasks")
    .select("id, title, title_fr, title_en, user_id, due_date, priority")
    .eq("is_archived", false)
    .is("deleted_at", null)
    .neq("status", "done")
    .not("due_date", "is", null)
    .lt("due_date", now.toISOString())

  // ── 2b. AUTO-PURGE TRASH (30+ days old OR excess > 100) ──────────
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { count: purgedCount } = await supabase
    .from("tasks")
    .delete({ count: "exact" })
    .not("deleted_at", "is", null)
    .lt("deleted_at", thirtyDaysAgo)

  // Also enforce 100-item limit per user in trash
  const { data: trashTasks } = await supabase
    .from("tasks")
    .select("id, user_id, deleted_at")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: true })

  if (trashTasks && trashTasks.length > 0) {
    const trashByUser: Record<string, typeof trashTasks> = {}
    for (const t of trashTasks) {
      if (!trashByUser[t.user_id]) trashByUser[t.user_id] = []
      trashByUser[t.user_id].push(t)
    }
    for (const [, userTrash] of Object.entries(trashByUser)) {
      if (userTrash.length > 100) {
        const excess = userTrash.slice(0, userTrash.length - 100)
        const ids = excess.map((t) => t.id)
        await supabase.from("tasks").delete().in("id", ids)
      }
    }
  }

  // ── 3. PROCESS PER USER ───────────────────────────────────────────
  // Collect all unique user IDs
  const allUserIds = new Set<string>()
  for (const uid of Object.keys(remindersByUser)) allUserIds.add(uid)
  for (const t of expiredTasks ?? []) allUserIds.add(t.user_id)

  let archiveCount = 0
  let emailCount = 0

  // Setup email transporter (optional — only if SMTP configured)
  const smtpPass = process.env.SMTP_PASS
  const smtpConfigured = smtpPass && smtpPass !== "your-gmail-app-password-here"
  const transporter = smtpConfigured
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: { user: process.env.SMTP_USER || FROM_EMAIL, pass: smtpPass },
      })
    : null

  for (const userId of allUserIds) {
    // Get user preferences from auth metadata
    const { data: userData } = await supabase.auth.admin.getUserById(userId)
    const user = userData?.user
    if (!user) continue

    const prefs = user.user_metadata ?? {}
    const notificationsEnabled = prefs.notifications !== false // default true
    const autoArchiveEnabled = prefs.auto_archive === true     // default false

    // ── Auto-archive expired tasks for this user ──
    if (autoArchiveEnabled && expiredTasks) {
      const userExpired = expiredTasks.filter((t) => t.user_id === userId)
      if (userExpired.length > 0) {
        const ids = userExpired.map((t) => t.id)
        await supabase.from("tasks").update({ is_archived: true }).in("id", ids)
        archiveCount += userExpired.length

        // Send email notification for auto-archived tasks
        if (transporter && user.email) {
          const archiveListHtml = userExpired
            .map((t) => {
              const emoji = t.priority === "high" ? "🔴" : t.priority === "medium" ? "🟡" : "⚪"
              const link = `${appUrl}/?openTask=${t.id}&view=archive`
              return `<li>${emoji} <a href="${link}" style="color:#a78bfa;text-decoration:none;font-weight:600">${t.title}</a></li>`
            })
            .join("")
          const archiveSectionUrl = `${appUrl}/?view=archive`

          try {
            await transporter.sendMail({
              from: `"Planigo" <${process.env.SMTP_USER || FROM_EMAIL}>`,
              to: user.email,
              subject: `📦 ${userExpired.length} tâche(s) archivée(s) automatiquement — Planigo`,
              html: `
                <div style="font-family:'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#0c0c10;color:#e5e7eb;border-radius:16px;overflow:hidden">
                  <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px;text-align:center">
                    <h1 style="color:white;margin:0;font-size:22px">📦 Archivage automatique</h1>
                  </div>
                  <div style="padding:24px">
                    <p style="color:#9ca3af;font-size:14px">Les tâches suivantes ont dépassé leur échéance et ont été archivées automatiquement :</p>
                    <ul style="color:#e5e7eb;font-size:14px;line-height:2;padding-left:20px">${archiveListHtml}</ul>
                    <p style="text-align:center;margin:20px 0 8px">
                      <a href="${archiveSectionUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600">Voir mes archives</a>
                    </p>
                    <p style="color:#6b7280;font-size:11px;text-align:center;margin:20px 0 0">
                      Pour désactiver cette notification, rendez-vous dans votre profil Planigo.
                    </p>
                  </div>
                </div>
              `,
            })
            emailCount++
          } catch (err) {
            console.error(`[Archive] Failed to email ${user.email}:`, (err as Error).message)
          }
        }
      }
    }

    // ── Reminder notifications for upcoming deadlines ──
    if (notificationsEnabled && remindersByUser[userId]) {
      const userTasks = remindersByUser[userId]

      // Check which tasks already have a recent reminder (avoid duplicates)
      const taskIds = userTasks.map((t) => t.id)
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
      const { data: existing } = await supabase
        .from("notifications")
        .select("task_id")
        .eq("user_id", userId)
        .eq("type", "reminder")
        .in("task_id", taskIds)
        .gte("created_at", oneDayAgo)

      const alreadyNotified = new Set((existing ?? []).map((n) => n.task_id))
      const newTasks = userTasks.filter((t) => !alreadyNotified.has(t.id))

      if (newTasks.length > 0) {
        const notifs = newTasks.map((t) => {
          const hoursLeft = Math.round((new Date(t.due_date).getTime() - now.getTime()) / (1000 * 60 * 60))
          const label = hoursLeft <= 1 ? "< 1h" : `${hoursLeft}h`
          return {
            user_id: userId,
            task_id: t.id,
            type: "reminder",
            title_fr: `Rappel : échéance dans ${label}`,
            title_en: `Reminder: due in ${label}`,
            message_fr: `"${t.title_fr || t.title}" arrive à échéance dans ${label}.`,
            message_en: `"${t.title_en || t.title}" is due in ${label}.`,
            is_read: false,
          }
        })
        await supabase.from("notifications").insert(notifs)
      }

      // ── Send email digest ──
      if (transporter && user.email && newTasks.length > 0) {
        const taskListHtml = newTasks
          .map((t) => {
            const date = new Date(t.due_date).toLocaleString("fr-FR", {
              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
            })
            const emoji = t.priority === "high" ? "🔴" : t.priority === "medium" ? "🟡" : "⚪"
            const link = `${appUrl}/?openTask=${t.id}`
            return `<li>${emoji} <a href="${link}" style="color:#fbbf24;text-decoration:none;font-weight:600">${t.title}</a> — ${date}</li>`
          })
          .join("")

        try {
          await transporter.sendMail({
            from: `"Planigo Rappels" <${process.env.SMTP_USER || FROM_EMAIL}>`,
            to: user.email,
            subject: `⏰ ${newTasks.length} tâche(s) arrivent à échéance — Planigo`,
            html: `
              <div style="font-family:'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#0c0c10;color:#e5e7eb;border-radius:16px;overflow:hidden">
                <div style="background:linear-gradient(135deg,#f59e0b,#ef4444);padding:24px;text-align:center">
                  <h1 style="color:white;margin:0;font-size:22px">⏰ Rappel d'échéances</h1>
                </div>
                <div style="padding:24px">
                  <p style="color:#9ca3af;font-size:14px">Les tâches suivantes arrivent à échéance bientôt :</p>
                  <ul style="color:#e5e7eb;font-size:14px;line-height:2;padding-left:20px">${taskListHtml}</ul>
                  <p style="text-align:center;margin:20px 0 8px">
                    <a href="${appUrl}/" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#ef4444);color:white;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600">Ouvrir Planigo</a>
                  </p>
                  <p style="color:#6b7280;font-size:12px;text-align:center;margin:20px 0 0">
                    Planigo — © 2025 @skid | MIT License
                  </p>
                </div>
              </div>
            `,
          })
          emailCount++
        } catch (err) {
          console.error(`[Deadlines] Failed to email ${user.email}:`, (err as Error).message)
        }
      }
    }
  }

  return NextResponse.json({
    tasks_archived: archiveCount,
    emails_sent: emailCount,
    tasks_checked: (tasks ?? []).length,
    trash_purged: purgedCount ?? 0,
  })
}

