"use client"

import { Badge } from "@/components/ui/badge"
import { TaskCard } from "@/components/TaskCard"
import { useTranslation } from "@/lib/i18n"
import type { Task, Status } from "@/types/task"

const statusMeta: Record<Status, { tKey: "status.todo" | "status.inProgress" | "status.done"; color: string; dotColor: string }> = {
  todo: { tKey: "status.todo", color: "text-slate-300", dotColor: "bg-slate-400" },
  in_progress: { tKey: "status.inProgress", color: "text-blue-300", dotColor: "bg-blue-400" },
  done: { tKey: "status.done", color: "text-emerald-300", dotColor: "bg-emerald-400" },
}

interface TaskColumnProps {
  status: Status
  tasks: Task[]
  onEditTask?: (task: Task) => void
  onDeleteTask?: (taskId: string) => void
  onArchiveTask?: (taskId: string) => void
  onRestoreTask?: (taskId: string) => void
  isArchiveView?: boolean
}

export function TaskColumn({ status, tasks, onEditTask, onDeleteTask, onArchiveTask, onRestoreTask, isArchiveView }: TaskColumnProps) {
  const { t } = useTranslation()
  const meta = statusMeta[status]

  return (
    <div className="flex flex-col gap-3">
      {/* Column header */}
      <div className="flex items-center gap-2 px-1">
        <span className={`size-2 rounded-full ${meta.dotColor}`} />
        <h3 className={`text-sm font-semibold ${meta.color}`}>{t(meta.tKey)}</h3>
        <Badge variant="secondary" className="ml-auto bg-white/5 text-[10px] text-muted-foreground">
          {tasks.length}
        </Badge>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2.5">
        {tasks.length === 0 && (
          <div className="glass-card rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-muted-foreground">
            {t("status.noTasks")}
          </div>
        )}
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onEdit={onEditTask} onDelete={onDeleteTask} onArchive={onArchiveTask} onRestore={onRestoreTask} isArchiveView={isArchiveView} />
        ))}
      </div>
    </div>
  )
}

