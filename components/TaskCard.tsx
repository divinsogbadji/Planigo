"use client"

import { Calendar, Clock, Pencil, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Task } from "@/types/task"

const categoryStyles: Record<string, string> = {
  personal: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  work: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  study: "bg-amber-500/15 text-amber-400 border-amber-500/20",
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
}

export function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  const dueLabel = task.due_date
    ? new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null

  return (
    <div className="glass-card group animate-fade-up cursor-pointer rounded-xl p-4 shadow-3d transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-3d-lg">
      {/* Header: title + actions */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-white leading-snug">{task.title}</h3>
        <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="icon-xs" onClick={() => onEdit?.(task)} className="text-muted-foreground hover:text-white">
            <Pencil />
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={() => onDelete?.(task.id)} className="text-muted-foreground hover:text-red-400">
            <Trash2 />
          </Button>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
      )}

      {/* Footer: badges + meta */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={categoryStyles[task.category] ?? ""}>
          {task.category}
        </Badge>

        <span className="flex items-center gap-1">
          <span className={`size-1.5 rounded-full ${priorityDot[task.priority]}`} />
          <span className="text-[10px] text-muted-foreground capitalize">{task.priority}</span>
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