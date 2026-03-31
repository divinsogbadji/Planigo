"use client"

import { TaskColumn } from "@/components/TaskColumn"
import type { Task, Status } from "@/types/task"

const columns: Status[] = ["todo", "in_progress", "done"]

interface TaskListProps {
  tasks: Task[]
  onEditTask?: (task: Task) => void
  onDeleteTask?: (taskId: string) => void
  onArchiveTask?: (taskId: string) => void
  onRestoreTask?: (taskId: string) => void
  isArchiveView?: boolean
}

export function TaskList({ tasks, onEditTask, onDeleteTask, onArchiveTask, onRestoreTask, isArchiveView }: TaskListProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {columns.map((status) => (
        <TaskColumn
          key={status}
          status={status}
          tasks={tasks.filter((t) => t.status === status)}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
          onArchiveTask={onArchiveTask}
          onRestoreTask={onRestoreTask}
          isArchiveView={isArchiveView}
        />
      ))}
    </div>
  )
}