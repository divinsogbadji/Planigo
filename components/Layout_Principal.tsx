"use client"

import { useState, useCallback } from "react"
import { Sidebar, type NavItem, type CategoryFilter } from "@/components/Sidebar"
import { Topbar } from "@/components/topbar"
import { CalendarView } from "@/components/CalendarView"
import { TaskList } from "@/components/TaskList"
import { TaskForm } from "@/components/TaskForm"
import { AISuggestDialog } from "@/components/AISuggestDialog"
import { useToast } from "@/components/Toast"
import { useTranslation } from "@/lib/i18n"
import { Archive, Send, Loader2, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import type { Task, TaskInsert, AISuggestedTask } from "@/types/task"

interface DashboardProps {
  initialTasks: Task[]
  userId: string
}

export default function Dashboard({ initialTasks, userId }: DashboardProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const { t } = useTranslation()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [activeNav, setActiveNav] = useState<NavItem>("all")
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all")
  const [feedbackMsg, setFeedbackMsg] = useState("")
  const [feedbackEmail, setFeedbackEmail] = useState("")
  const [feedbackSending, setFeedbackSending] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  const isArchiveView = activeNav === "archived"

  // ── Filter tasks based on sidebar state ──
  const filteredTasks = tasks.filter((t) => {
    // Archive view: show only archived tasks
    if (isArchiveView) return t.is_archived === true
    // Normal views: hide archived tasks
    if (t.is_archived) return false

    if (activeCategory !== "all" && t.category !== activeCategory) return false
    if (activeNav === "today") {
      if (!t.due_date) return false
      return new Date(t.due_date).toDateString() === new Date().toDateString()
    }
    if (activeNav === "week") {
      if (!t.due_date) return false
      const now = new Date()
      const weekEnd = new Date(now)
      weekEnd.setDate(now.getDate() + 7)
      const d = new Date(t.due_date)
      return d >= now && d <= weekEnd
    }
    return true
  })

  // ── CRUD handlers ──
  const handleCreate = useCallback(async (data: TaskInsert | (TaskInsert & { id: string })) => {
    if ("id" in data) return handleUpdate(data)
    const { data: rows, error } = await supabase
      .from("tasks")
      .insert({ ...data, user_id: userId })
      .select()
    if (error) {
      toast("error", t("toast.failedCreate") + ": " + error.message)
    } else if (rows) {
      setTasks((prev) => [...prev, ...rows])
      toast("success", t("toast.taskCreated"))
    }
  }, [supabase, userId, toast])

  const handleUpdate = useCallback(async (data: TaskInsert & { id: string }) => {
    const { id, ...rest } = data
    const { data: rows, error } = await supabase
      .from("tasks")
      .update(rest)
      .eq("id", id)
      .select()
    if (error) {
      toast("error", t("toast.failedUpdate") + ": " + error.message)
    } else if (rows?.[0]) {
      setTasks((prev) => prev.map((t) => (t.id === id ? rows[0] : t)))
      toast("success", t("toast.taskUpdated"))
    }
  }, [supabase, toast])

  const handleDelete = useCallback(async (taskId: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId)
    if (error) {
      toast("error", t("toast.failedDelete") + ": " + error.message)
    } else {
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      toast("success", t("toast.taskDeleted"))
    }
  }, [supabase, toast])

  // ── Archive / Restore ──
  const handleArchive = useCallback(async (taskId: string) => {
    const { error } = await supabase
      .from("tasks")
      .update({ is_archived: true })
      .eq("id", taskId)
    if (error) {
      toast("error", t("toast.failedArchive") + ": " + error.message)
    } else {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, is_archived: true } : t)))
      toast("success", t("toast.taskArchived"))
    }
  }, [supabase, toast])

  const handleRestore = useCallback(async (taskId: string) => {
    const { error } = await supabase
      .from("tasks")
      .update({ is_archived: false })
      .eq("id", taskId)
    if (error) {
      toast("error", t("toast.failedRestore") + ": " + error.message)
    } else {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, is_archived: false } : t)))
      toast("success", t("toast.taskRestored"))
    }
  }, [supabase, toast])

  // ── Calendar reschedule (drag & drop) ──
  const handleReschedule = useCallback(async (taskId: string, newDate: string) => {
    const { data: rows, error } = await supabase
      .from("tasks")
      .update({ due_date: newDate })
      .eq("id", taskId)
      .select()
    if (error) {
      toast("error", t("toast.failedReschedule") + ": " + error.message)
    } else if (rows?.[0]) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? rows[0] : t)))
      toast("success", t("toast.taskRescheduled"))
    }
  }, [supabase, toast])

  // ── AI bulk insert ──
  const handleAIConfirm = useCallback(async (suggested: AISuggestedTask[]) => {
    const inserts = suggested.map((s) => ({
      title: s.title,
      description: s.description,
      duration: s.duration,
      priority: s.priority,
      category: "personal" as const,
      status: "todo" as const,
      due_date: null,
      user_id: userId,
    }))
    const { data: rows, error } = await supabase.from("tasks").insert(inserts).select()
    if (error) {
      toast("error", t("toast.failedAI") + ": " + error.message)
    } else if (rows) {
      setTasks((prev) => [...prev, ...rows])
      toast("success", t("toast.aiTasksAdded"))
    }
  }, [supabase, userId, toast])

  const handleFeedback = useCallback(async () => {
    if (!feedbackMsg.trim()) {
      toast("error", t("footer.feedbackRequired"))
      return
    }
    setFeedbackSending(true)
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: feedbackMsg, email: feedbackEmail || undefined }),
      })
      if (res.ok) {
        toast("success", t("footer.feedbackSuccess"))
        setFeedbackMsg("")
        setFeedbackEmail("")
        setFeedbackOpen(false)
      } else {
        toast("error", t("footer.feedbackError"))
      }
    } catch {
      toast("error", t("footer.feedbackError"))
    } finally {
      setFeedbackSending(false)
    }
  }, [feedbackMsg, feedbackEmail, toast, t])

  function openEdit(task: Task) {
    setEditingTask(task)
    setFormOpen(true)
  }
  function openNew() {
    setEditingTask(null)
    setFormOpen(true)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0c0c10]">
      <Sidebar
        activeNav={activeNav}
        activeCategory={activeCategory}
        onNavChange={setActiveNav}
        onCategoryChange={setActiveCategory}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onNewTask={openNew} onSuggestPlan={() => setAiDialogOpen(true)} />

        <main className="flex-1 space-y-6 overflow-y-auto p-6">
          {!isArchiveView && <CalendarView tasks={tasks.filter(t => !t.is_archived)} onReschedule={handleReschedule} />}
          {isArchiveView && (
            <div className="flex items-center gap-2 px-1">
              <Archive className="size-5 text-amber-400" />
              <h2 className="text-lg font-semibold text-white">{t("archive.title")}</h2>
              <span className="ml-2 text-sm text-muted-foreground">({filteredTasks.length})</span>
            </div>
          )}
          <TaskList
            tasks={filteredTasks}
            onEditTask={isArchiveView ? undefined : openEdit}
            onDeleteTask={handleDelete}
            onArchiveTask={handleArchive}
            onRestoreTask={handleRestore}
            isArchiveView={isArchiveView}
          />

          {/* Footer: Copyright + Feedback */}
          <footer className="mt-8 border-t border-white/5 pt-6 pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <p className="text-xs text-muted-foreground">{t("footer.copyright")}</p>

              <div className="flex flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={() => setFeedbackOpen(!feedbackOpen)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-white"
                >
                  <MessageSquare className="size-3.5" />
                  {t("footer.feedbackTitle")}
                </button>

                {feedbackOpen && (
                  <div className="glass-card w-full space-y-2 rounded-lg border border-white/10 p-3 sm:w-72">
                    <Textarea
                      placeholder={t("footer.feedbackPlaceholder")}
                      value={feedbackMsg}
                      onChange={(e) => setFeedbackMsg(e.target.value)}
                      className="min-h-[60px] resize-none border-white/10 bg-white/5 text-sm text-white placeholder:text-white/40"
                      maxLength={2000}
                    />
                    <Input
                      placeholder={t("footer.feedbackEmail")}
                      value={feedbackEmail}
                      onChange={(e) => setFeedbackEmail(e.target.value)}
                      className="border-white/10 bg-white/5 text-sm text-white placeholder:text-white/40"
                    />
                    <Button
                      size="sm"
                      onClick={handleFeedback}
                      disabled={feedbackSending}
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700"
                    >
                      {feedbackSending ? (
                        <><Loader2 className="size-3 animate-spin" /> {t("footer.feedbackSending")}</>
                      ) : (
                        <><Send className="size-3" /> {t("footer.feedbackSend")}</>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </footer>
        </main>
      </div>

      <TaskForm open={formOpen} onOpenChange={setFormOpen} task={editingTask} onSubmit={handleCreate} />
      <AISuggestDialog open={aiDialogOpen} onOpenChange={setAiDialogOpen} onConfirm={handleAIConfirm} />
    </div>
  )
}