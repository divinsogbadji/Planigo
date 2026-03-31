"use client"

import { useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n"
import type { Task } from "@/types/task"

interface CalendarViewProps {
  tasks: Task[]
  onReschedule?: (taskId: string, newDate: string) => void
}

export function CalendarView({ tasks, onReschedule }: CalendarViewProps) {
  const { t, locale } = useTranslation()
  const [weekOffset, setWeekOffset] = useState(0)
  const [dragOverDay, setDragOverDay] = useState<string | null>(null)

  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7)

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

  function getTasksForDay(date: Date) {
    return tasks.filter((t) => {
      if (!t.due_date) return false
      const td = new Date(t.due_date)
      return td.toDateString() === date.toDateString()
    })
  }

  const isToday = (d: Date) => d.toDateString() === today.toDateString()
  const toISODate = (d: Date) => d.toISOString().split("T")[0]

  // ── Drag & Drop handlers ──
  function handleDragStart(e: React.DragEvent, taskId: string) {
    e.dataTransfer.setData("text/plain", taskId)
    e.dataTransfer.effectAllowed = "move"
  }

  function handleDragOver(e: React.DragEvent, dayKey: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverDay(dayKey)
  }

  function handleDragLeave() {
    setDragOverDay(null)
  }

  function handleDrop(e: React.DragEvent, day: Date) {
    e.preventDefault()
    setDragOverDay(null)
    const taskId = e.dataTransfer.getData("text/plain")
    if (taskId && onReschedule) {
      onReschedule(taskId, day.toISOString())
    }
  }

  const dtLocale = locale === "fr" ? "fr-FR" : "en-US"
  const weekLabel = `${weekDays[0].toLocaleDateString(dtLocale, { month: "short", day: "numeric" })} – ${weekDays[6].toLocaleDateString(dtLocale, { month: "short", day: "numeric" })}`

  return (
    <div className="glass-card rounded-xl p-4 shadow-3d">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-white">{weekLabel}</h3>
        </div>
        <div className="flex items-center gap-1">
          {weekOffset !== 0 && (
            <Button variant="ghost" size="icon-xs" onClick={() => setWeekOffset(0)} className="text-xs text-muted-foreground hover:text-white">
              {t("cal.today")}
            </Button>
          )}
          <Button variant="ghost" size="icon-xs" onClick={() => setWeekOffset((o) => o - 1)} className="text-muted-foreground hover:text-white">
            <ChevronLeft />
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={() => setWeekOffset((o) => o + 1)} className="text-muted-foreground hover:text-white">
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dayKey = toISODate(day)
          const dayTasks = getTasksForDay(day)
          const isDragTarget = dragOverDay === dayKey
          return (
            <div
              key={dayKey}
              onDragOver={(e) => handleDragOver(e, dayKey)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day)}
              className={`flex min-h-[90px] flex-col items-center rounded-lg p-2 text-center transition-all duration-200 ${
                isDragTarget
                  ? "bg-purple-500/20 ring-2 ring-purple-500/50"
                  : isToday(day)
                    ? "bg-gradient-to-b from-indigo-500/20 to-purple-600/20 ring-1 ring-purple-500/30"
                    : "hover:bg-white/5"
              }`}
            >
              <span className="text-[10px] font-medium uppercase text-muted-foreground">
                {day.toLocaleDateString(dtLocale, { weekday: "short" })}
              </span>
              <span className={`mt-0.5 text-lg font-bold ${isToday(day) ? "text-purple-300" : "text-white"}`}>
                {day.getDate()}
              </span>
              {dayTasks.length > 0 && (
                <div className="mt-1.5 flex flex-col items-center gap-1 w-full">
                  {dayTasks.slice(0, 3).map((t) => (
                    <span
                      key={t.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, t.id)}
                      className="w-full cursor-grab truncate rounded bg-purple-500/20 px-1 py-0.5 text-[9px] text-purple-300 transition-colors hover:bg-purple-500/30 active:cursor-grabbing"
                      title={t.title}
                    >
                      {t.title}
                    </span>
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="text-[8px] text-muted-foreground">{t("cal.more", { count: dayTasks.length - 3 })}</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}