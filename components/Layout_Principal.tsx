"use client"

import { useState, useCallback } from "react"
import { Sidebar, type NavItem, type CategoryFilter } from "@/components/Sidebar"
import { Topbar } from "@/components/topbar"
import { CalendarView } from "@/components/CalendarView"
import { TaskList } from "@/components/TaskList"
import { TaskForm } from "@/components/TaskForm"
import { AISuggestDialog } from "@/components/AISuggestDialog"
import { useToast } from "@/components/Toast"
import { createClient } from "@/lib/supabase/client"
import type { Task, TaskInsert, AISuggestedTask } from "@/types/task"

interface DashboardProps {
  initialTasks: Task[]
  userId: string
}

export default function Dashboard({ initialTasks, userId }: DashboardProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [activeNav, setActiveNav] = useState<NavItem>("all")
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all")

  // ── Filter tasks based on sidebar state ──
  const filteredTasks = tasks.filter((t) => {
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
      toast("error", "Failed to create task: " + error.message)
    } else if (rows) {
      setTasks((prev) => [...prev, ...rows])
      toast("success", "Task created successfully")
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
      toast("error", "Failed to update task: " + error.message)
    } else if (rows?.[0]) {
      setTasks((prev) => prev.map((t) => (t.id === id ? rows[0] : t)))
      toast("success", "Task updated successfully")
    }
  }, [supabase, toast])

  const handleDelete = useCallback(async (taskId: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId)
    if (error) {
      toast("error", "Failed to delete task: " + error.message)
    } else {
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      toast("success", "Task deleted")
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
      toast("error", "Failed to reschedule: " + error.message)
    } else if (rows?.[0]) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? rows[0] : t)))
      toast("success", "Task rescheduled")
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
      toast("error", "Failed to add AI tasks: " + error.message)
    } else if (rows) {
      setTasks((prev) => [...prev, ...rows])
      toast("success", `${rows.length} AI task${rows.length !== 1 ? "s" : ""} added`)
    }
  }, [supabase, userId, toast])

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
          <CalendarView tasks={tasks} onReschedule={handleReschedule} />
          <TaskList tasks={filteredTasks} onEditTask={openEdit} onDeleteTask={handleDelete} />
        </main>
      </div>

      <TaskForm open={formOpen} onOpenChange={setFormOpen} task={editingTask} onSubmit={handleCreate} />
      <AISuggestDialog open={aiDialogOpen} onOpenChange={setAiDialogOpen} onConfirm={handleAIConfirm} />
    </div>
  )
}