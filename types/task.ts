// ──────────────────────────────────────
// Shared types for the Planigo task system
// Must stay in sync with the Supabase `tasks` table
// ──────────────────────────────────────

export type Category = "personal" | "work" | "study" | "travel" | "health" | "finance" | "hobby"

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
  start_date: string | null    // ISO-8601 timestamp (optional start)
  due_date: string | null      // ISO-8601 timestamp (end / deadline)
  duration: string | null
  priority: Priority
  is_archived: boolean         // true = archived (hidden from main view)
  created_at: string           // ISO-8601 timestamp
}

/** Payload for creating a new task (server fills id, user_id, created_at; is_archived defaults to false) */
export type TaskInsert = Omit<Task, "id" | "user_id" | "created_at" | "is_archived">

/** Payload for updating a task (all fields optional except id) */
export type TaskUpdate = Partial<TaskInsert> & { id: string }

/** Shape returned by the AI suggest-plan endpoint */
export interface AISuggestedTask {
  title: string
  description: string
  duration: string
  priority: Priority
}

