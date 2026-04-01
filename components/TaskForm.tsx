"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle2 } from "lucide-react"
import { useTranslation } from "@/lib/i18n"
import type { Task, TaskInsert, Category, Status, Priority } from "@/types/task"

interface TaskFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task | null
  onSubmit: (data: TaskInsert | (TaskInsert & { id: string })) => void
}

interface FieldErrors {
  title?: string
  description?: string
  duration?: string
}

type DateMode = "end_only" | "interval" | "with_duration"

const defaultValues: TaskInsert = {
  title: "",
  description: "",
  category: "personal",
  status: "todo",
  start_date: null,
  due_date: null,
  duration: null,
  priority: "medium",
}

const durationRegex = /^[0-9]+[mhd]?$/i

export function TaskForm({ open, onOpenChange, task, onSubmit }: TaskFormProps) {
  const isEditing = !!task
  const { t } = useTranslation()
  const [form, setForm] = useState<TaskInsert>(defaultValues)
  const [dateMode, setDateMode] = useState<DateMode>("end_only")
  const [errors, setErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title ?? "",
        description: task.description ?? "",
        category: task.category ?? "personal",
        status: task.status ?? "todo",
        start_date: task.start_date,
        due_date: task.due_date,
        duration: task.duration,
        priority: task.priority ?? "medium",
      })
      // Detect date mode from existing data
      if (task.start_date && task.due_date && task.duration) {
        setDateMode("with_duration")
      } else if (task.start_date && task.due_date) {
        setDateMode("interval")
      } else {
        setDateMode("end_only")
      }
    } else {
      setForm(defaultValues)
      setDateMode("end_only")
    }
    setErrors({})
    setTouched(new Set())
    setSuccessMsg(null)
  }, [task, open])

  function validate(data: TaskInsert): FieldErrors {
    const errs: FieldErrors = {}
    if (!data.title.trim()) {
      errs.title = t("form.titleRequired")
    } else if (data.title.trim().length < 2) {
      errs.title = t("form.titleMin")
    } else if (data.title.trim().length > 100) {
      errs.title = t("form.titleMax")
    }

    if (data.description && data.description.length > 500) {
      errs.description = t("form.descriptionMax")
    }

    if (data.duration && !durationRegex.test(data.duration)) {
      errs.duration = t("form.durationFormat")
    }

    return errs
  }

  function handleBlur(field: string) {
    setTouched((prev) => new Set(prev).add(field))
    setErrors(validate(form))
  }

  function handleChange(field: keyof TaskInsert, value: string | null) {
    const updated = { ...form, [field]: value }
    setForm(updated)
    // Clear error for this field on change if it was touched
    if (touched.has(field)) {
      setErrors(validate(updated))
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate(form)
    setErrors(errs)
    setTouched(new Set(["title", "description", "duration"]))

    if (Object.keys(errs).length > 0) return

    if (isEditing && task) {
      onSubmit({ ...form, id: task.id })
    } else {
      onSubmit(form)
    }

    setSuccessMsg(isEditing ? t("form.taskUpdated") : t("form.taskCreated"))
    setTimeout(() => {
      setSuccessMsg(null)
      onOpenChange(false)
    }, 1200)
  }

  const fieldClass = (field: string) =>
    errors[field as keyof FieldErrors] && touched.has(field)
      ? "border-red-500/50 focus-visible:border-red-500 focus-visible:ring-red-500/20"
      : ""

  // Title valid indicator
  const titleValid = touched.has("title") && !errors.title && form.title.trim().length >= 2

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-white/10 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">{isEditing ? t("form.editTask") : t("form.newTask")}</DialogTitle>
        </DialogHeader>

        {successMsg ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/15">
              <CheckCircle2 className="size-6 text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-emerald-400">{successMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t("form.title")} <span className="text-red-400">*</span></Label>
              <div className="relative">
                <Input
                  id="title"
                  placeholder={t("form.titlePlaceholder")}
                  value={form.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  onBlur={() => handleBlur("title")}
                  aria-invalid={!!errors.title && touched.has("title")}
                  className={fieldClass("title")}
                />
                {titleValid && (
                  <CheckCircle2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-emerald-400" />
                )}
              </div>
              {errors.title && touched.has("title") && <p className="text-xs text-red-400">{errors.title}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t("form.description")}</Label>
              <Textarea
                id="description"
                placeholder={t("form.descriptionPlaceholder")}
                value={form.description ?? ""}
                onChange={(e) => handleChange("description", e.target.value)}
                onBlur={() => handleBlur("description")}
                className={fieldClass("description")}
              />
              <div className="flex justify-between">
                {errors.description && touched.has("description") ? (
                  <p className="text-xs text-red-400">{errors.description}</p>
                ) : <span />}
                <span className={`text-[10px] ${(form.description?.length ?? 0) > 450 ? "text-amber-400" : "text-muted-foreground"}`}>
                  {form.description?.length ?? 0}/500
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("form.category")}</Label>
                <Select value={form.category} onValueChange={(v) => handleChange("category", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">{t("cat.personal")}</SelectItem>
                    <SelectItem value="work">{t("cat.work")}</SelectItem>
                    <SelectItem value="study">{t("cat.study")}</SelectItem>
                    <SelectItem value="travel">{t("cat.travel")}</SelectItem>
                    <SelectItem value="health">{t("cat.health")}</SelectItem>
                    <SelectItem value="finance">{t("cat.finance")}</SelectItem>
                    <SelectItem value="hobby">{t("cat.hobby")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("form.priority")}</Label>
                <Select value={form.priority} onValueChange={(v) => handleChange("priority", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t("priority.low")}</SelectItem>
                    <SelectItem value="medium">{t("priority.medium")}</SelectItem>
                    <SelectItem value="high">{t("priority.high")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isEditing && (
              <div className="space-y-2">
                <Label>{t("form.status")}</Label>
                <Select value={form.status} onValueChange={(v) => handleChange("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">{t("status.todo")}</SelectItem>
                    <SelectItem value="in_progress">{t("status.inProgress")}</SelectItem>
                    <SelectItem value="done">{t("status.done")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date mode selector */}
            <div className="space-y-2">
              <Label>{t("form.dateMode")}</Label>
              <Select value={dateMode} onValueChange={(v) => {
                const mode = v as DateMode
                setDateMode(mode)
                if (mode === "end_only") {
                  setForm((f) => ({ ...f, start_date: null, duration: null }))
                } else if (mode === "interval") {
                  setForm((f) => ({ ...f, duration: null }))
                }
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="end_only">{t("form.dateEndOnly")}</SelectItem>
                  <SelectItem value="interval">{t("form.dateInterval")}</SelectItem>
                  <SelectItem value="with_duration">{t("form.dateWithDuration")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Start date — shown for interval & with_duration */}
              {(dateMode === "interval" || dateMode === "with_duration") && (
                <div className="space-y-2">
                  <Label htmlFor="start_date">{t("form.startDate")}</Label>
                  <Input id="start_date" type="datetime-local" value={form.start_date ?? ""} onChange={(e) => handleChange("start_date", e.target.value || null)} />
                </div>
              )}

              {/* End / due date — always shown */}
              <div className="space-y-2">
                <Label htmlFor="due_date">{dateMode === "end_only" ? t("form.dueDate") : t("form.endDate")}</Label>
                <Input id="due_date" type="datetime-local" value={form.due_date ?? ""} onChange={(e) => handleChange("due_date", e.target.value || null)} />
              </div>

              {/* Duration — only for with_duration mode */}
              {dateMode === "with_duration" && (
                <div className="space-y-2">
                  <Label htmlFor="duration">{t("form.duration")}</Label>
                  <Input
                    id="duration"
                    placeholder={t("form.durationPlaceholder")}
                    value={form.duration ?? ""}
                    onChange={(e) => handleChange("duration", e.target.value || null)}
                    onBlur={() => handleBlur("duration")}
                    className={fieldClass("duration")}
                  />
                  {errors.duration && touched.has("duration") && <p className="text-xs text-red-400">{errors.duration}</p>}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("form.cancel")}</Button>
              <Button type="submit" className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700">
                {isEditing ? t("form.saveChanges") : t("form.createTask")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

