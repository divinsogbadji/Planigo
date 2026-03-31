// ──────────────────────────────────────
// Shared types for the Planigo task system
// Must stay in sync with the Supabase `tasks` table
// ──────────────────────────────────────

export type Category = "personal" | "work" | "study"

export type Status = "todo" | "in_progress" | "done"

export type Priority = "low" | "medium" | "high"

/** Row returned by Supabase from the `tasks` table */
export interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  category: Category
  status: Status
  due_date: string | null      // ISO-8601 timestamp
  duration: string | null
  priority: Priority
  created_at: string           // ISO-8601 timestamp
}

/** Payload for creating a new task (server fills id, user_id, created_at) */
export type TaskInsert = Omit<Task, "id" | "user_id" | "created_at">

/** Payload for updating a task (all fields optional except id) */
export type TaskUpdate = Partial<TaskInsert> & { id: string }

/** Shape returned by the AI suggest-plan endpoint */
export interface AISuggestedTask {
  title: string
  description: string
  duration: string
  priority: Priority
}

