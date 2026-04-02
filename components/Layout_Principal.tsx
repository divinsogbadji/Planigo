"use client"

import { useState, useCallback } from "react"
import { Sidebar, type NavItem, type CategoryFilter, type PriorityFilter } from "@/components/Sidebar"
import { Topbar } from "@/components/topbar"
import { CalendarView } from "@/components/CalendarView"
import { TaskList } from "@/components/TaskList"
import { TaskForm } from "@/components/TaskForm"
import { AISuggestDialog } from "@/components/AISuggestDialog"
import { useToast } from "@/components/Toast"
import { useTranslation } from "@/lib/i18n"
import Link from "next/link"
import { Archive, Send, Loader2, MessageSquare, ChevronDown, X, Sparkles, CheckSquare, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import type { Task, TaskInsert, AISuggestedTask, TaskGroup } from "@/types/task"

interface DashboardProps {
  initialTasks: Task[]
  userId: string
}

export default function Dashboard({ initialTasks, userId }: DashboardProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const { t, locale } = useTranslation()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [activeNav, setActiveNav] = useState<NavItem>("all")
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all")
  const [activePriority, setActivePriority] = useState<PriorityFilter>("all")
  const [feedbackMsg, setFeedbackMsg] = useState("")
  const [feedbackEmail, setFeedbackEmail] = useState("")
  const [feedbackSending, setFeedbackSending] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackErrors, setFeedbackErrors] = useState<{ message?: string; email?: string }>({})
  const [groups, setGroups] = useState<TaskGroup[]>([])
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")

  const isArchiveView = activeNav === "archived"

  // ── Filter tasks based on sidebar state ──
  const filteredTasks = tasks.filter((t) => {
    // Archive view: show only archived tasks
    if (isArchiveView) return t.is_archived === true
    // Normal views: hide archived tasks
    if (t.is_archived) return false

    if (activeCategory !== "all" && t.category !== activeCategory) return false
    if (activePriority !== "all" && t.priority !== activePriority) return false
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

    // Set bilingual fields based on current locale
    const insertData: Record<string, unknown> = { ...data, user_id: userId }
    if (locale === "fr") {
      insertData.title_fr = data.title
      insertData.description_fr = data.description || null
    } else {
      insertData.title_en = data.title
      insertData.description_en = data.description || null
    }

    const { data: rows, error } = await supabase
      .from("tasks")
      .insert(insertData)
      .select()
    if (error) {
      toast("error", t("toast.failedCreate") + ": " + error.message)
    } else if (rows) {
      setTasks((prev) => [...prev, ...rows])
      toast("success", t("toast.taskCreated"))

      // Async translation — don't block the UI
      const task = rows[0]
      fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: data.title, description: data.description || "", locale }),
      })
        .then((res) => res.json())
        .then(async (translated) => {
          if (!translated.title) return
          const updateFields: Record<string, string> = {}
          if (locale === "fr") {
            updateFields.title_en = translated.title
            updateFields.description_en = translated.description || ""
          } else {
            updateFields.title_fr = translated.title
            updateFields.description_fr = translated.description || ""
          }
          const { data: updated } = await supabase
            .from("tasks")
            .update(updateFields)
            .eq("id", task.id)
            .select()
          if (updated?.[0]) {
            setTasks((prev) => prev.map((t) => (t.id === task.id ? updated[0] : t)))
          }
        })
        .catch((err) => console.warn("[Translate] Background translation failed:", err))
    }
  }, [supabase, userId, toast, locale])

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

  // ── Drag & drop status change ──
  const handleStatusChange = useCallback(async (taskId: string, newStatus: string) => {
    const { data: rows, error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId)
      .select()
    if (error) {
      toast("error", t("toast.failedUpdate") + ": " + error.message)
    } else if (rows?.[0]) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? rows[0] : t)))
      toast("success", t("toast.taskUpdated"))
    }
  }, [supabase, toast, t])

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
  const SAFE_CATEGORIES = new Set(["personal", "work", "study", "travel", "health", "finance", "hobby"])
  const SAFE_PRIORITIES = new Set(["low", "medium", "high"])

  const handleAIConfirm = useCallback(async (suggested: AISuggestedTask[], goalLabel: string, groupTitleFr?: string, groupTitleEn?: string) => {
    // Verify session is still valid — prevents RLS violations from expired tokens
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast("error", t("toast.failedAI") + ": " + t("toast.sessionExpired"))
      return
    }

    // Build insert objects — sanitise category/priority to avoid CHECK constraint violations
    const inserts = suggested.map((s) => {
      const row: Record<string, unknown> = {
        title: s.title,
        description: s.description,
        title_fr: s.title_fr ?? null,
        title_en: s.title_en ?? null,
        description_fr: s.description_fr ?? null,
        description_en: s.description_en ?? null,
        duration: s.duration,
        priority: SAFE_PRIORITIES.has(s.priority) ? s.priority : "medium",
        category: SAFE_CATEGORIES.has(s.category) ? s.category : "personal",
        status: "todo",
        user_id: user.id,
      }
      if (s.due_date) row.due_date = s.due_date
      if (s.start_date) row.start_date = s.start_date
      return row
    })

    // First attempt
    let { data: rows, error } = await supabase.from("tasks").insert(inserts).select()

    // If start_date column missing → retry without it
    if (error?.message?.includes("start_date")) {
      const safe = inserts.map(({ start_date, ...rest }) => rest)
      ;({ data: rows, error } = await supabase.from("tasks").insert(safe).select())
    }

    // If category constraint fails → retry with "personal"
    if (error?.message?.includes("category_check")) {
      const safe = inserts.map((r) => ({ ...r, category: "personal" }))
      ;({ data: rows, error } = await supabase.from("tasks").insert(safe).select())
    }

    if (error) {
      toast("error", t("toast.failedAI") + ": " + error.message)
    } else if (rows) {
      setTasks((prev) => [...prev, ...rows])
      // Create a group for the AI tasks with bilingual labels
      const groupId = crypto.randomUUID()
      const fallbackLabel = goalLabel.length > 60 ? goalLabel.slice(0, 57) + "…" : goalLabel
      setGroups((prev) => [...prev, {
        id: groupId,
        label: (locale === "fr" ? groupTitleFr : groupTitleEn) || fallbackLabel,
        label_fr: groupTitleFr || fallbackLabel,
        label_en: groupTitleEn || fallbackLabel,
        taskIds: rows.map((r: Task) => r.id),
        isCollapsed: false,
      }])
      toast("success", t("toast.aiTasksAdded"))
    }
  }, [supabase, userId, toast])

  const handleFeedback = useCallback(async () => {
    const errs: { message?: string; email?: string } = {}
    if (!feedbackMsg.trim() || feedbackMsg.trim().length < 3) {
      errs.message = t("footer.feedbackRequired")
    }
    if (feedbackEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(feedbackEmail)) {
      errs.email = t("footer.feedbackInvalidEmail")
    }
    if (Object.keys(errs).length > 0) {
      setFeedbackErrors(errs)
      return
    }
    setFeedbackErrors({})
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

  // ── Group helpers ──
  function toggleGroup(groupId: string) {
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, isCollapsed: !g.isCollapsed } : g))
  }
  function removeGroup(groupId: string) {
    setGroups((prev) => prev.filter((g) => g.id !== groupId))
  }
  function toggleSelectTask(taskId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(taskId) ? next.delete(taskId) : next.add(taskId)
      return next
    })
  }
  function createManualGroup() {
    if (selectedIds.size === 0) return
    const groupId = crypto.randomUUID()
    setGroups((prev) => [...prev, {
      id: groupId,
      label: t("group.createGroup"),
      taskIds: Array.from(selectedIds),
      isCollapsed: false,
    }])
    setSelectedIds(new Set())
    setSelectionMode(false)
  }
  function startRename(groupId: string, currentLabel: string) {
    setRenamingGroupId(groupId)
    setRenameValue(currentLabel)
  }
  function confirmRename() {
    if (!renamingGroupId) return
    const trimmed = renameValue.trim()
    if (trimmed) {
      setGroups((prev) => prev.map((g) => g.id === renamingGroupId ? { ...g, label: trimmed } : g))
    }
    setRenamingGroupId(null)
    setRenameValue("")
  }

  // Group-aware task partitioning
  const groupedTaskIds = new Set(groups.flatMap((g) => g.taskIds))
  const ungroupedTasks = filteredTasks.filter((tk) => !groupedTaskIds.has(tk.id))

  return (
    <div className="flex h-screen overflow-hidden bg-[#0c0c10]">
      <Sidebar
        activeNav={activeNav}
        activeCategory={activeCategory}
        activePriority={activePriority}
        onNavChange={setActiveNav}
        onCategoryChange={setActiveCategory}
        onPriorityChange={setActivePriority}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onNewTask={openNew} onSuggestPlan={() => setAiDialogOpen(true)} tasks={tasks.filter((tk) => !tk.is_archived)} onSelectTask={openEdit} />

        <main className="flex-1 space-y-6 overflow-y-auto p-6">
          {!isArchiveView && <CalendarView tasks={tasks.filter(tk => !tk.is_archived)} onReschedule={handleReschedule} />}
          {isArchiveView && (() => {
            const now = new Date()
            const expiredTasks = filteredTasks.filter((tk) => tk.due_date && new Date(tk.due_date) < now)
            const upcomingTasks = filteredTasks.filter((tk) => tk.due_date && new Date(tk.due_date) >= now)
            const noDateTasks = filteredTasks.filter((tk) => !tk.due_date)
            const renderSection = (title: string, sectionTasks: typeof filteredTasks, color: string) => (
              <div className="glass-card rounded-xl shadow-3d overflow-hidden animate-fade-up">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                  <div className={`size-2 rounded-full ${color}`} />
                  <h3 className="text-sm font-semibold text-white">{title}</h3>
                  <span className="text-[10px] text-muted-foreground">({sectionTasks.length})</span>
                </div>
                {sectionTasks.length > 0 ? (
                  <div className="p-4">
                    <TaskList tasks={sectionTasks} onDeleteTask={handleDelete} onRestoreTask={handleRestore} isArchiveView />
                  </div>
                ) : (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">{t("archive.empty")}</p>
                )}
              </div>
            )
            return (
              <>
                <div className="flex items-center gap-2 px-1">
                  <Archive className="size-5 text-amber-400" />
                  <h2 className="text-lg font-semibold text-white">{t("archive.title")}</h2>
                  <span className="ml-2 text-sm text-muted-foreground">({filteredTasks.length})</span>
                </div>
                {renderSection(t("archive.expired"), expiredTasks, "bg-red-500")}
                {renderSection(t("archive.upcoming"), upcomingTasks, "bg-emerald-500")}
                {renderSection(t("archive.noDate"), noDateTasks, "bg-gray-500")}
              </>
            )
          })()}

          {/* ── Selection mode toggle ── */}
          {!isArchiveView && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setSelectionMode(!selectionMode); setSelectedIds(new Set()) }}
                className={`text-xs ${selectionMode ? "border-purple-500/50 bg-purple-500/10 text-purple-300" : "border-white/10 text-muted-foreground"}`}
              >
                <CheckSquare className="size-3.5 mr-1" />
                {selectionMode ? t("group.cancelSelect") : t("group.selectMode")}
              </Button>
              {selectionMode && selectedIds.size > 0 && (
                <Button size="sm" onClick={createManualGroup} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-xs text-white">
                  {t("group.manualGroup")} ({selectedIds.size})
                </Button>
              )}
            </div>
          )}

          {/* ── Task Groups (collapsible cards) ── */}
          {!isArchiveView && groups.map((group) => {
            // Check against ALL non-archived tasks so the group stays visible even when filters narrow the view
            const allGroupTasks = tasks.filter((tk) => !tk.is_archived && group.taskIds.includes(tk.id))
            if (allGroupTasks.length === 0) return null
            const groupTasks = filteredTasks.filter((tk) => group.taskIds.includes(tk.id))
            return (
              <div key={group.id} className="glass-card rounded-xl shadow-3d overflow-hidden animate-fade-up">
                <div className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5">
                  <button onClick={() => toggleGroup(group.id)} className="flex flex-1 items-center gap-3 text-left">
                    <Sparkles className="size-4 text-purple-400 shrink-0" />
                    {renamingGroupId === group.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={confirmRename}
                        onKeyDown={(e) => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") { setRenamingGroupId(null) } }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-transparent text-sm font-semibold text-white outline-none border-b border-purple-500/50 pb-0.5"
                      />
                    ) : (
                      <span className="flex-1 text-sm font-semibold text-white truncate">{(locale === "fr" ? group.label_fr : group.label_en) || group.label}</span>
                    )}
                    <span className="text-[10px] text-muted-foreground shrink-0">{t("group.tasks", { count: groupTasks.length })}</span>
                    <ChevronDown className={`size-4 text-muted-foreground transition-transform ${group.isCollapsed ? "-rotate-90" : ""}`} />
                  </button>
                  <button
                    onClick={() => startRename(group.id, group.label)}
                    className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-white"
                    title={t("group.rename")}
                  >
                    <Pencil className="size-3" />
                  </button>
                  <button
                    onClick={() => removeGroup(group.id)}
                    className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
                    title={t("group.ungroup")}
                  >
                    <X className="size-3" />
                  </button>
                </div>
                {!group.isCollapsed && (
                  <div className="border-t border-white/5 p-4">
                    <TaskList
                      tasks={groupTasks}
                      onEditTask={selectionMode ? undefined : openEdit}
                      onDeleteTask={handleDelete}
                      onArchiveTask={handleArchive}
                      onStatusChange={selectionMode ? undefined : handleStatusChange}
                      selectable={selectionMode}
                      selectedIds={selectedIds}
                      onToggleSelect={toggleSelectTask}
                    />
                  </div>
                )}
              </div>
            )
          })}

          {/* ── Ungrouped tasks (non-archive only) ── */}
          {!isArchiveView && (
            <TaskList
              tasks={ungroupedTasks}
              onEditTask={selectionMode ? undefined : openEdit}
              onDeleteTask={handleDelete}
              onArchiveTask={handleArchive}
              onStatusChange={selectionMode ? undefined : handleStatusChange}
              selectable={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelectTask}
            />
          )}

          {/* Footer */}
          <footer className="mt-2 border-t border-white/5 py-1.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] text-muted-foreground">{t("footer.copyright")}</p>
              <div className="flex items-center gap-3">
                <Link href="/privacy" className="text-[10px] text-muted-foreground transition-colors hover:text-white">
                  {t("footer.privacyLink")}
                </Link>
                <Link href="/faq" className="text-[10px] text-muted-foreground transition-colors hover:text-white">
                  {t("footer.faqLink")}
                </Link>
                <button
                  type="button"
                  onClick={() => { setFeedbackOpen(!feedbackOpen); setFeedbackErrors({}) }}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground transition-colors hover:text-white"
                >
                  <MessageSquare className="size-3" />
                  {t("footer.feedbackTitle")}
                </button>
              </div>
            </div>
            {feedbackOpen && (
              <div className="mt-2 space-y-1.5 rounded-lg border border-white/10 bg-white/5 p-2.5 sm:max-w-xs sm:ml-auto">
                <div>
                  <Textarea
                    placeholder={t("footer.feedbackPlaceholder")}
                    value={feedbackMsg}
                    onChange={(e) => { setFeedbackMsg(e.target.value); setFeedbackErrors(prev => ({ ...prev, message: undefined })) }}
                    className="min-h-[48px] resize-none border-white/10 bg-white/5 text-xs text-white placeholder:text-white/40"
                    maxLength={2000}
                  />
                  {feedbackErrors.message && <p className="mt-0.5 text-[11px] text-red-400">{feedbackErrors.message}</p>}
                </div>
                <div>
                  <Input
                    placeholder={t("footer.feedbackEmail")}
                    value={feedbackEmail}
                    onChange={(e) => { setFeedbackEmail(e.target.value); setFeedbackErrors(prev => ({ ...prev, email: undefined })) }}
                    className="border-white/10 bg-white/5 text-xs text-white placeholder:text-white/40 h-7"
                  />
                  {feedbackErrors.email && <p className="mt-0.5 text-[11px] text-red-400">{feedbackErrors.email}</p>}
                </div>
                <Button
                  size="sm"
                  onClick={handleFeedback}
                  disabled={feedbackSending}
                  className="h-7 w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-xs text-white hover:from-indigo-600 hover:to-purple-700"
                >
                  {feedbackSending ? (
                    <><Loader2 className="size-3 animate-spin" /> {t("footer.feedbackSending")}</>
                  ) : (
                    <><Send className="size-3" /> {t("footer.feedbackSend")}</>
                  )}
                </Button>
              </div>
            )}
          </footer>
        </main>
      </div>

      <TaskForm open={formOpen} onOpenChange={setFormOpen} task={editingTask} onSubmit={handleCreate} />
      <AISuggestDialog open={aiDialogOpen} onOpenChange={setAiDialogOpen} onConfirm={handleAIConfirm} />
    </div>
  )
}