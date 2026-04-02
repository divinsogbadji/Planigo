/**
 * Static fallback plan — returned when ALL AI providers fail.
 * © 2025 @skid | MIT License
 */

import type { ValidatedTask } from "./validate"

/** Helper to build a bilingual fallback task */
function fb(
  titleFr: string, titleEn: string,
  descFr: string, descEn: string,
  duration: string, priority: ValidatedTask["priority"],
): ValidatedTask {
  return {
    title: titleFr, description: descFr, // overridden by locale in getFallbackPlan
    title_fr: titleFr, title_en: titleEn,
    description_fr: descFr, description_en: descEn,
    duration, priority, category: "personal", due_date: null, start_date: null,
  }
}

const fallbackTasks = (goal: string): ValidatedTask[] => [
  fb("Définir l'objectif clairement", "Define the objective clearly",
    `Comprendre l'objectif : « ${goal.slice(0, 80)}${goal.length > 80 ? "…" : ""} »`,
    `Understand the goal: "${goal.slice(0, 80)}${goal.length > 80 ? "..." : ""}"`,
    "30m", "high"),
  fb("Découper en étapes", "Break into smaller steps",
    "Diviser l'objectif en sous-tâches réalisables",
    "Divide the objective into manageable subtasks",
    "1h", "medium"),
  fb("Rassembler les ressources nécessaires", "Gather necessary resources",
    "Identifier les outils, documents ou personnes nécessaires",
    "Identify tools, documents, or people needed",
    "30m", "medium"),
  fb("Exécuter la première étape", "Execute the first step",
    "Commencer par l'action la plus impactante",
    "Start with the most impactful action",
    "2h", "high"),
  fb("Réviser et ajuster", "Review and adjust",
    "Évaluer la progression et affiner le plan",
    "Evaluate progress and refine the plan",
    "30m", "low"),
]

export function getFallbackPlan(goal: string, locale?: string): ValidatedTask[] {
  const tasks = fallbackTasks(goal)
  // Set the main title/description to match the user's locale
  return tasks.map((t) => ({
    ...t,
    title: locale === "fr" ? (t.title_fr ?? t.title) : (t.title_en ?? t.title),
    description: locale === "fr" ? (t.description_fr ?? t.description) : (t.description_en ?? t.description),
  }))
}

