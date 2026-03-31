"use client"

import { Badge } from "@/components/ui/badge"
import { TaskCard } from "@/components/TaskCard"
import type { Task, Status } from "@/types/task"

const statusConfig: Record<Status, { label: string; color: string; dotColor: string }> = {
  todo: { label: "To Do", color: "text-slate-300", dotColor: "bg-slate-400" },
  in_progress: { label: "In Progress", color: "text-blue-300", dotColor: "bg-blue-400" },
  done: { label: "Done", color: "text-emerald-300", dotColor: "bg-emerald-400" },
}

interface TaskColumnProps {
  status: Status
  tasks: Task[]
  onEditTask?: (task: Task) => void
  onDeleteTask?: (taskId: string) => void
}

export function TaskColumn({ status, tasks, onEditTask, onDeleteTask }: TaskColumnProps) {
  const config = statusConfig[status]

  return (
    <div className="flex flex-col gap-3">
      {/* Column header */}
      <div className="flex items-center gap-2 px-1">
        <span className={`size-2 rounded-full ${config.dotColor}`} />
        <h3 className={`text-sm font-semibold ${config.color}`}>{config.label}</h3>
        <Badge variant="secondary" className="ml-auto bg-white/5 text-[10px] text-muted-foreground">
          {tasks.length}
        </Badge>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2.5">
        {tasks.length === 0 && (
          <div className="glass-card rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-muted-foreground">
            No tasks yet
          </div>
        )}
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onEdit={onEditTask} onDelete={onDeleteTask} />
        ))}
      </div>
    </div>
  )
}

