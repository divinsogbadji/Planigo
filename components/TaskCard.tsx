"use client"

import { Archive, Calendar, Clock, Pencil, RotateCcw, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n"
import type { Task } from "@/types/task"

const categoryStyles: Record<string, string> = {
  personal: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  work: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  study: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  travel: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  health: "bg-rose-500/15 text-rose-400 border-rose-500/20",
  finance: "bg-lime-500/15 text-lime-400 border-lime-500/20",
  hobby: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/20",
}

const priorityDot: Record<string, string> = {
  low: "bg-slate-400",
  medium: "bg-amber-400",
  high: "bg-red-400",
}

interface TaskCardProps {
  task: Task
  onEdit?: (task: Task) => void
  onDelete?: (taskId: string) => void
  onArchive?: (taskId: string) => void
  onRestore?: (taskId: string) => void
  isArchiveView?: boolean
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: (taskId: string) => void
}

export function TaskCard({ task, onEdit, onDelete, onArchive, onRestore, isArchiveView, selectable, selected, onToggleSelect }: TaskCardProps) {
  const { t, locale } = useTranslation()
  const dateFmt = (d: string) => new Date(d).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", { month: "short", day: "numeric" })
  const dueLabel = task.start_date && task.due_date
    ? `${dateFmt(task.start_date)} → ${dateFmt(task.due_date)}`
    : task.due_date
      ? dateFmt(task.due_date)
      : null

  // Bilingual: pick the right title/description for the current locale
  const displayTitle = (locale === "fr" ? task.title_fr : task.title_en) || task.title
  const displayDescription = (locale === "fr" ? task.description_fr : task.description_en) || task.description

  const categoryKey = `cat.${task.category}` as "cat.personal" | "cat.work" | "cat.study" | "cat.travel" | "cat.health" | "cat.finance" | "cat.hobby"
  const priorityKey = `priority.${task.priority}` as "priority.low" | "priority.medium" | "priority.high"

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id)
        e.dataTransfer.effectAllowed = "move"
        ;(e.currentTarget as HTMLElement).style.opacity = "0.5"
      }}
      onDragEnd={(e) => {
        ;(e.currentTarget as HTMLElement).style.opacity = "1"
      }}
      className={`glass-card group animate-fade-up rounded-xl p-4 shadow-3d transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-3d-lg ${selectable ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"} ${selected ? "ring-2 ring-purple-500/60 bg-purple-500/10" : ""}`}
      onClick={selectable ? () => onToggleSelect?.(task.id) : undefined}
    >
      {/* Header: title + actions */}
      <div className="mb-2 flex items-start justify-between gap-2">
        {selectable && (
          <span className={`mt-0.5 mr-1 flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${selected ? "border-purple-500 bg-purple-500" : "border-white/20 bg-white/5"}`}>
            {selected && <span className="text-[10px] text-white">✓</span>}
          </span>
        )}
        <h3 className="text-sm font-semibold text-white leading-snug flex-1">{displayTitle}</h3>
        <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {isArchiveView ? (
            <>
              <Button variant="ghost" size="icon-xs" onClick={() => onEdit?.(task)} className="text-muted-foreground hover:text-white" title={t("task.edit")}>
                <Pencil />
              </Button>
              <Button variant="ghost" size="icon-xs" onClick={() => onRestore?.(task.id)} className="text-muted-foreground hover:text-emerald-400" title={t("task.restore")}>
                <RotateCcw />
              </Button>
              <Button variant="ghost" size="icon-xs" onClick={() => onDelete?.(task.id)} className="text-muted-foreground hover:text-red-400" title={t("task.deletePermanently")}>
                <Trash2 />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="icon-xs" onClick={() => onEdit?.(task)} className="text-muted-foreground hover:text-white" title={t("task.edit")}>
                <Pencil />
              </Button>
              <Button variant="ghost" size="icon-xs" onClick={() => onArchive?.(task.id)} className="text-muted-foreground hover:text-amber-400" title={t("task.archive")}>
                <Archive />
              </Button>
              <Button variant="ghost" size="icon-xs" onClick={() => onDelete?.(task.id)} className="text-muted-foreground hover:text-red-400" title={t("task.delete")}>
                <Trash2 />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      {displayDescription && (
        <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">{displayDescription}</p>
      )}

      {/* Footer: badges + meta */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={categoryStyles[task.category] ?? ""}>
          {t(categoryKey)}
        </Badge>

        <span className="flex items-center gap-1">
          <span className={`size-1.5 rounded-full ${priorityDot[task.priority]}`} />
          <span className="text-[10px] text-muted-foreground">{t(priorityKey)}</span>
        </span>

        {dueLabel && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
            <Calendar className="size-3" />
            {dueLabel}
          </span>
        )}

        {task.duration && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="size-3" />
            {task.duration}
          </span>
        )}
      </div>
    </div>
  )
}