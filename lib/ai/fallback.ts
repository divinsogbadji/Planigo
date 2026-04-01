/**
 * Static fallback plan — returned when ALL AI providers fail.
 * © 2025 @skid | MIT License
 */

import type { ValidatedTask } from "./validate"

const fallbacks: Record<string, (goal: string) => ValidatedTask[]> = {
  en: (goal) => [
    {
      title: "Define the objective clearly",
      description: `Understand the goal: "${goal.slice(0, 80)}${goal.length > 80 ? "..." : ""}"`,
      duration: "30m",
      priority: "high",
      category: "personal",
      due_date: null,
      start_date: null,
    },
    {
      title: "Break into smaller steps",
      description: "Divide the objective into manageable subtasks",
      duration: "1h",
      priority: "medium",
      category: "personal",
      due_date: null,
      start_date: null,
    },
    {
      title: "Gather necessary resources",
      description: "Identify tools, documents, or people needed",
      duration: "30m",
      priority: "medium",
      category: "personal",
      due_date: null,
      start_date: null,
    },
    {
      title: "Execute the first step",
      description: "Start with the most impactful action",
      duration: "2h",
      priority: "high",
      category: "personal",
      due_date: null,
      start_date: null,
    },
    {
      title: "Review and adjust",
      description: "Evaluate progress and refine the plan",
      duration: "30m",
      priority: "low",
      category: "personal",
      due_date: null,
      start_date: null,
    },
  ],
  fr: (goal) => [
    {
      title: "Définir l'objectif clairement",
      description: `Comprendre l'objectif : « ${goal.slice(0, 80)}${goal.length > 80 ? "…" : ""} »`,
      duration: "30m",
      priority: "high",
      category: "personal",
      due_date: null,
      start_date: null,
    },
    {
      title: "Découper en étapes",
      description: "Diviser l'objectif en sous-tâches réalisables",
      duration: "1h",
      priority: "medium",
      category: "personal",
      due_date: null,
      start_date: null,
    },
    {
      title: "Rassembler les ressources nécessaires",
      description: "Identifier les outils, documents ou personnes nécessaires",
      duration: "30m",
      priority: "medium",
      category: "personal",
      due_date: null,
      start_date: null,
    },
    {
      title: "Exécuter la première étape",
      description: "Commencer par l'action la plus impactante",
      duration: "2h",
      priority: "high",
      category: "personal",
      due_date: null,
      start_date: null,
    },
    {
      title: "Réviser et ajuster",
      description: "Évaluer la progression et affiner le plan",
      duration: "30m",
      priority: "low",
      category: "personal",
      due_date: null,
      start_date: null,
    },
  ],
}

export function getFallbackPlan(goal: string, locale?: string): ValidatedTask[] {
  const fn = fallbacks[locale ?? "en"] ?? fallbacks.en
  return fn(goal)
}

