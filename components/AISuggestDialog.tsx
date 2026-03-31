"use client"

import { useState } from "react"
import { Sparkles, Loader2, Check, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import type { AISuggestedTask } from "@/types/task"

interface AISuggestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (tasks: AISuggestedTask[]) => void
}

export function AISuggestDialog({ open, onOpenChange, onConfirm }: AISuggestDialogProps) {
  const [goal, setGoal] = useState("")
  const [deadline, setDeadline] = useState("")
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<AISuggestedTask[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [goalError, setGoalError] = useState<string | null>(null)
  const [goalTouched, setGoalTouched] = useState(false)

  function validateGoal(value: string): string | null {
    const trimmed = value.trim()
    if (!trimmed) return "Please describe your goal"
    if (trimmed.length < 5) return "Goal must be at least 5 characters"
    if (trimmed.length > 300) return "Goal must be less than 300 characters"
    return null
  }

  async function handleGenerate() {
    setGoalTouched(true)
    const err = validateGoal(goal)
    setGoalError(err)
    if (err) return

    setLoading(true)
    setError(null)
    setSuggestions([])

    try {
      const res = await fetch("/api/ai/suggest-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: goal.trim(), deadline: deadline || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to generate suggestions")
      const tasks: AISuggestedTask[] = data.tasks ?? []
      setSuggestions(tasks)
      setSelected(new Set(tasks.map((_, i) => i)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  function toggleSelect(index: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(index) ? next.delete(index) : next.add(index)
      return next
    })
  }

  function handleConfirm() {
    const chosen = suggestions.filter((_, i) => selected.has(i))
    if (chosen.length > 0) onConfirm(chosen)
    handleClose()
  }

  function handleClose() {
    setGoal("")
    setDeadline("")
    setSuggestions([])
    setSelected(new Set())
    setError(null)
    setGoalError(null)
    setGoalTouched(false)
    onOpenChange(false)
  }

  const priorityColor: Record<string, string> = {
    low: "bg-slate-500/15 text-slate-400 border-slate-500/20",
    medium: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    high: "bg-red-500/15 text-red-400 border-red-500/20",
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass border-white/10 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Sparkles className="size-5 text-purple-400" />
            AI Task Planner
          </DialogTitle>
        </DialogHeader>

        {suggestions.length === 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goal">What do you want to accomplish? <span className="text-red-400">*</span></Label>
              <Input
                id="goal"
                placeholder="e.g. Prepare for final exams in 2 weeks"
                value={goal}
                onChange={(e) => {
                  setGoal(e.target.value)
                  if (goalTouched) setGoalError(validateGoal(e.target.value))
                }}
                onBlur={() => { setGoalTouched(true); setGoalError(validateGoal(goal)) }}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                aria-invalid={!!goalError && goalTouched}
                className={goalError && goalTouched ? "border-red-500/50 focus-visible:border-red-500 focus-visible:ring-red-500/20" : ""}
              />
              {goalError && goalTouched && <p className="text-xs text-red-400">{goalError}</p>}
              <div className="flex justify-end">
                <span className={`text-[10px] ${goal.trim().length > 250 ? "text-amber-400" : "text-muted-foreground"}`}>
                  {goal.trim().length}/300
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline (optional)</Label>
              <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                <X className="size-4 shrink-0" />
                {error}
              </div>
            )}
            <Button onClick={handleGenerate} disabled={loading || !goal.trim()} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700">
              {loading ? <><Loader2 className="size-4 animate-spin" /> Generating...</> : <><Sparkles className="size-4" /> Generate Plan</>}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Select the tasks you want to add ({selected.size}/{suggestions.length} selected)</p>
            <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
              {suggestions.map((task, i) => (
                <button key={i} onClick={() => toggleSelect(i)} className={`glass-card flex w-full items-start gap-3 rounded-lg p-3 text-left transition-all duration-200 ${selected.has(i) ? "ring-1 ring-purple-500/40" : "opacity-50"}`}>
                  <div className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition-colors ${selected.has(i) ? "border-purple-500 bg-purple-500/20" : "border-white/10"}`}>
                    {selected.has(i) && <Check className="size-3 text-purple-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{task.title}</p>
                    {task.description && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
                    <div className="mt-1.5 flex items-center gap-2">
                      <Badge variant="outline" className={priorityColor[task.priority] ?? ""}>{task.priority}</Badge>
                      {task.duration && <span className="text-[10px] text-muted-foreground">{task.duration}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setSuggestions([])} size="sm">
                <X className="size-3" /> Regenerate
              </Button>
              <Button onClick={handleConfirm} disabled={selected.size === 0} size="sm" className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700">
                <Check className="size-3" /> Add {selected.size} Task{selected.size !== 1 ? "s" : ""}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

