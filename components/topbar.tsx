"use client"

import { Plus, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n"

interface TopbarProps {
  onNewTask?: () => void
  onSuggestPlan?: () => void
}

export function Topbar({ onNewTask, onSuggestPlan }: TopbarProps) {
  const { t } = useTranslation()
  return (
    <header className="glass flex items-center justify-between border-b border-white/5 px-6 py-4">
      <div>
        <h2 className="text-lg font-semibold text-white">{t("topbar.dashboard")}</h2>
        <p className="text-xs text-muted-foreground">{t("topbar.subtitle")}</p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={onNewTask}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transition-all duration-200 hover:from-indigo-600 hover:to-purple-700 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          size="lg"
        >
          <Plus className="size-4" data-icon="inline-start" />
          {t("topbar.newTask")}
        </Button>

        <Button
          onClick={onSuggestPlan}
          variant="outline"
          className="border-purple-500/30 bg-purple-500/10 text-purple-300 shadow-lg transition-all duration-200 hover:border-purple-500/50 hover:bg-purple-500/20 hover:text-purple-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          size="lg"
        >
          <Sparkles className="size-4" data-icon="inline-start" />
          {t("topbar.suggestPlan")}
        </Button>
      </div>
    </header>
  )
}
