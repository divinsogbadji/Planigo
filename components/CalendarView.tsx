"use client"

import { Fragment, useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n"
import type { Task } from "@/types/task"

type CalMode = "week" | "weekHourly" | "month"

interface CalendarViewProps {
  tasks: Task[]
  onReschedule?: (taskId: string, newDate: string) => void
}

export function CalendarView({ tasks, onReschedule }: CalendarViewProps) {
  const { t, locale } = useTranslation()
  const [mode, setMode] = useState<CalMode>("week")
  const [weekOffset, setWeekOffset] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)
  const [dragOverDay, setDragOverDay] = useState<string | null>(null)

  const today = new Date()
  const dtLocale = locale === "fr" ? "fr-FR" : "en-US"
  const tkTitle = (tk: Task) => (locale === "fr" ? tk.title_fr : tk.title_en) || tk.title

  // ── Week helpers ──
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d
  })

  // ── Month helpers ──
  const monthDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const monthYear = monthDate.toLocaleDateString(dtLocale, { month: "long", year: "numeric" })
  const firstDayOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const lastDayOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
  const startDay = (firstDayOfMonth.getDay() + 6) % 7 // Monday = 0
  const totalCells = startDay + lastDayOfMonth.getDate()
  const rows = Math.ceil(totalCells / 7)
  const monthCells = Array.from({ length: rows * 7 }, (_, i) => {
    const dayNum = i - startDay + 1
    if (dayNum < 1 || dayNum > lastDayOfMonth.getDate()) return null
    return new Date(monthDate.getFullYear(), monthDate.getMonth(), dayNum)
  })

  function getTasksForDay(date: Date) {
    return tasks.filter((tk) => {
      if (!tk.due_date) return false
      return new Date(tk.due_date).toDateString() === date.toDateString()
    })
  }

  const isToday = (d: Date) => d.toDateString() === today.toDateString()
  const toISODate = (d: Date) => d.toISOString().split("T")[0]

  const hours = Array.from({ length: 13 }, (_, i) => i + 8) // 8h to 20h

  // ── Drag & Drop ──
  function handleDragStart(e: React.DragEvent, taskId: string) {
    e.dataTransfer.setData("text/plain", taskId)
    e.dataTransfer.effectAllowed = "move"
  }
  function handleDragOver(e: React.DragEvent, key: string) {
    e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverDay(key)
  }
  function handleDragLeave() { setDragOverDay(null) }
  function handleDrop(e: React.DragEvent, day: Date) {
    e.preventDefault(); e.stopPropagation(); setDragOverDay(null)
    const taskId = e.dataTransfer.getData("text/plain")
    if (taskId && onReschedule) onReschedule(taskId, day.toISOString())
  }

  // ── Navigation ──
  function prev() { mode === "month" ? setMonthOffset((o) => o - 1) : setWeekOffset((o) => o - 1) }
  function next() { mode === "month" ? setMonthOffset((o) => o + 1) : setWeekOffset((o) => o + 1) }
  function goToday() { mode === "month" ? setMonthOffset(0) : setWeekOffset(0) }
  const canReset = mode === "month" ? monthOffset !== 0 : weekOffset !== 0

  const weekLabel = `${weekDays[0].toLocaleDateString(dtLocale, { month: "short", day: "numeric" })} – ${weekDays[6].toLocaleDateString(dtLocale, { month: "short", day: "numeric" })}`
  const headerLabel = mode === "month" ? monthYear : weekLabel

  const modeButtons: { key: CalMode; tKey: "cal.weekOverview" | "cal.weekHourly" | "cal.monthView" }[] = [
    { key: "week", tKey: "cal.weekOverview" },
    { key: "weekHourly", tKey: "cal.weekHourly" },
    { key: "month", tKey: "cal.monthView" },
  ]

  const dayNames = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, i + 1) // Mon=1 Jan 2024
    return d.toLocaleDateString(dtLocale, { weekday: "short" })
  })

  return (
    <div className="glass-card rounded-xl p-4 shadow-3d">
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-white">{headerLabel}</h3>
        </div>
        <div className="flex items-center gap-1">
          {/* Mode toggle */}
          <div className="mr-2 flex rounded-lg border border-white/10 p-0.5">
            {modeButtons.map((m) => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${mode === m.key ? "bg-purple-500/20 text-purple-300" : "text-muted-foreground hover:text-white"}`}
              >
                {t(m.tKey)}
              </button>
            ))}
          </div>
          {canReset && (
            <Button variant="ghost" size="icon-xs" onClick={goToday} className="text-xs text-muted-foreground hover:text-white">
              {t("cal.today")}
            </Button>
          )}
          <Button variant="ghost" size="icon-xs" onClick={prev} className="text-muted-foreground hover:text-white"><ChevronLeft /></Button>
          <Button variant="ghost" size="icon-xs" onClick={next} className="text-muted-foreground hover:text-white"><ChevronRight /></Button>
        </div>
      </div>

      {/* ── Week overview (original) ── */}
      {mode === "week" && (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dayKey = toISODate(day)
            const dayTasks = getTasksForDay(day)
            const isDrag = dragOverDay === dayKey
            return (
              <div key={dayKey} onDragOver={(e) => handleDragOver(e, dayKey)} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, day)}
                className={`flex min-h-[90px] flex-col items-center rounded-lg p-2 text-center transition-all duration-200 ${isDrag ? "bg-purple-500/20 ring-2 ring-purple-500/50" : isToday(day) ? "bg-gradient-to-b from-indigo-500/20 to-purple-600/20 ring-1 ring-purple-500/30" : "hover:bg-white/5"}`}>
                <span className="text-[10px] font-medium uppercase text-muted-foreground">{day.toLocaleDateString(dtLocale, { weekday: "short" })}</span>
                <span className={`mt-0.5 text-lg font-bold ${isToday(day) ? "text-purple-300" : "text-white"}`}>{day.getDate()}</span>
                {dayTasks.length > 0 && (
                  <div className="mt-1.5 flex flex-col items-center gap-1 w-full">
                    {dayTasks.slice(0, 3).map((tk) => (
                      <span key={tk.id} draggable onDragStart={(e) => handleDragStart(e, tk.id)} className="w-full cursor-grab truncate rounded bg-purple-500/20 px-1 py-0.5 text-[9px] text-purple-300 hover:bg-purple-500/30 active:cursor-grabbing" title={tkTitle(tk)}>{tkTitle(tk)}</span>
                    ))}
                    {dayTasks.length > 3 && <span className="text-[8px] text-muted-foreground">{t("cal.more", { count: dayTasks.length - 3 })}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Week hourly (8h-20h) ── */}
      {mode === "weekHourly" && (
        <div className="overflow-x-auto">
          <div className="grid min-w-[700px]" style={{ gridTemplateColumns: "50px repeat(7, 1fr)" }}>
            {/* Day headers */}
            <div />
            {weekDays.map((day) => (
              <div key={toISODate(day)} className={`px-1 py-2 text-center ${isToday(day) ? "text-purple-300" : "text-white"}`}>
                <span className="block text-[10px] uppercase text-muted-foreground">{day.toLocaleDateString(dtLocale, { weekday: "short" })}</span>
                <span className="text-sm font-bold">{day.getDate()}</span>
              </div>
            ))}
            {/* Hour rows */}
            {hours.map((hour) => (
              <Fragment key={`row-${hour}`}>
                <div className="flex items-start justify-end pr-2 pt-1 text-[10px] text-muted-foreground">{hour}h</div>
                {weekDays.map((day) => {
                  const dayKey = `${toISODate(day)}-${hour}`
                  const dayTasks = getTasksForDay(day)
                  const isDrag = dragOverDay === dayKey
                  return (
                    <div key={dayKey} onDragOver={(e) => handleDragOver(e, dayKey)} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, day)}
                      className={`min-h-[36px] border-t border-white/5 px-0.5 py-0.5 transition-colors ${isDrag ? "bg-purple-500/15" : "hover:bg-white/[0.03]"}`}>
                      {hour === 8 && dayTasks.map((tk) => (
                        <span key={tk.id} draggable onDragStart={(e) => handleDragStart(e, tk.id)} className="mb-0.5 block cursor-grab truncate rounded bg-purple-500/20 px-1 py-0.5 text-[8px] text-purple-300 hover:bg-purple-500/30 active:cursor-grabbing" title={tkTitle(tk)}>
                          {tkTitle(tk)}
                        </span>
                      ))}
                    </div>
                  )
                })}
              </Fragment>
            ))}
          </div>
        </div>
      )}

      {/* ── Month view ── */}
      {mode === "month" && (
        <div>
          <div className="grid grid-cols-7 gap-px mb-1">
            {dayNames.map((dn) => (
              <div key={dn} className="py-1 text-center text-[10px] font-medium uppercase text-muted-foreground">{dn}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px">
            {monthCells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} className="min-h-[60px]" />
              const dayKey = toISODate(day)
              const dayTasks = getTasksForDay(day)
              const isDrag = dragOverDay === dayKey
              return (
                <div key={dayKey} onDragOver={(e) => handleDragOver(e, dayKey)} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, day)}
                  className={`min-h-[60px] rounded-md p-1 transition-all ${isDrag ? "bg-purple-500/20 ring-1 ring-purple-500/50" : isToday(day) ? "bg-indigo-500/10 ring-1 ring-purple-500/20" : "hover:bg-white/5"}`}>
                  <span className={`text-[10px] font-medium ${isToday(day) ? "text-purple-300" : "text-white"}`}>{day.getDate()}</span>
                  {dayTasks.slice(0, 2).map((tk) => (
                    <span key={tk.id} draggable onDragStart={(e) => handleDragStart(e, tk.id)} className="mt-0.5 block cursor-grab truncate rounded bg-purple-500/20 px-1 py-px text-[8px] text-purple-300 hover:bg-purple-500/30 active:cursor-grabbing" title={tkTitle(tk)}>{tkTitle(tk)}</span>
                  ))}
                  {dayTasks.length > 2 && <span className="text-[7px] text-muted-foreground">{t("cal.more", { count: dayTasks.length - 2 })}</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}