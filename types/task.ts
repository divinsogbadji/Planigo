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
  title_fr: string | null       // French title (bilingual)
  title_en: string | null       // English title (bilingual)
  description_fr: string | null // French description (bilingual)
  description_en: string | null // English description (bilingual)
  category: Category
  status: Status
  start_date: string | null    // ISO-8601 timestamp (optional start)
  due_date: string | null      // ISO-8601 timestamp (end / deadline)
  duration: string | null
  priority: Priority
  is_archived: boolean         // true = archived (hidden from main view)
  created_at: string           // ISO-8601 timestamp
}

/** Payload for creating a new task (server fills id, user_id, created_at; is_archived defaults to false; bilingual fields are populated automatically) */
export type TaskInsert = Omit<Task, "id" | "user_id" | "created_at" | "is_archived" | "title_fr" | "title_en" | "description_fr" | "description_en">

/** Payload for updating a task (all fields optional except id) */
export type TaskUpdate = Partial<TaskInsert> & { id: string }

/** Shape returned by the AI suggest-plan endpoint */
export interface AISuggestedTask {
  title: string
  description: string
  title_fr: string | null
  title_en: string | null
  description_fr: string | null
  description_en: string | null
  duration: string
  priority: Priority
  category: Category
  due_date: string | null
  start_date: string | null
}

/** Client-side task group (collapsible card) */
export interface TaskGroup {
  id: string
  label: string
  label_fr?: string
  label_en?: string
  taskIds: string[]
  isCollapsed: boolean
}

/** Notification types */
export type NotificationType = "reminder" | "auto_archive"

/** Row from the `notifications` table */
export interface Notification {
  id: string
  user_id: string
  task_id: string | null
  type: NotificationType
  title_fr: string
  title_en: string
  message_fr: string
  message_en: string
  is_read: boolean
  created_at: string
}

