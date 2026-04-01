/**
 * Static fallback plan — returned when ALL AI providers fail.
 * © 2025 @skid | MIT License
 */

import type { ValidatedTask } from "./validate"

export function getFallbackPlan(goal: string): ValidatedTask[] {
  return [
    {
      title: "Define the objective clearly",
      description: `Understand the goal: "${goal.slice(0, 80)}${goal.length > 80 ? "..." : ""}"`,
      duration: "30m",
      priority: "high",
    },
    {
      title: "Break into smaller steps",
      description: "Divide the objective into manageable subtasks",
      duration: "1h",
      priority: "medium",
    },
    {
      title: "Gather necessary resources",
      description: "Identify tools, documents, or people needed",
      duration: "30m",
      priority: "medium",
    },
    {
      title: "Execute the first step",
      description: "Start with the most impactful action",
      duration: "2h",
      priority: "high",
    },
    {
      title: "Review and adjust",
      description: "Evaluate progress and refine the plan",
      duration: "30m",
      priority: "low",
    },
  ]
}

