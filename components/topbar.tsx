"use client"

import { useState, useRef, useEffect } from "react"
import { Plus, Sparkles, Search, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n"
import type { Task } from "@/types/task"

interface TopbarProps {
  onNewTask?: () => void
  onSuggestPlan?: () => void
  tasks?: Task[]
  onSelectTask?: (task: Task) => void
  /** Opens the mobile sidebar drawer — only rendered on screens below the lg breakpoint. */
  onOpenMenu?: () => void
}

export function Topbar({ onNewTask, onSuggestPlan, tasks = [], onSelectTask, onOpenMenu }: TopbarProps) {
  const { t, locale } = useTranslation()
  const [query, setQuery] = useState("")
  const [showResults, setShowResults] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const results = query.trim().length >= 2
    ? tasks.filter((tk) => {
        const q = query.toLowerCase()
        return tk.title.toLowerCase().includes(q)
          || tk.description?.toLowerCase().includes(q)
          || tk.title_fr?.toLowerCase().includes(q)
          || tk.title_en?.toLowerCase().includes(q)
          || tk.description_fr?.toLowerCase().includes(q)
          || tk.description_en?.toLowerCase().includes(q)
      }).slice(0, 6)
    : []

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowResults(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const dateFmt = (d: string) => new Date(d).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", { month: "short", day: "numeric" })

  return (
    <header className="glass relative z-50 flex items-center gap-2 border-b border-white/5 px-3 py-3 sm:gap-3 sm:px-6 sm:py-4">
      {/* Hamburger — opens the sidebar drawer on small screens */}
      {onOpenMenu && (
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label={t("menu.open")}
          className="lg:hidden flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Menu className="size-5" />
        </button>
      )}

      {/* Search bar — flex-grow on mobile, capped width on sm+ */}
      <div ref={wrapperRef} className="relative min-w-0 flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowResults(true) }}
          onFocus={() => setShowResults(true)}
          placeholder={t("search.placeholder")}
          className="h-9 w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-white placeholder:text-white/40 outline-none transition-colors focus:border-purple-500/50 focus:bg-white/[0.07]"
        />
        {showResults && query.trim().length >= 2 && (
          <div className="absolute left-0 top-full z-[9999] mt-1 w-full rounded-xl border border-white/10 bg-[#1a1a24] p-1 shadow-xl sm:w-80">
            {results.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">{t("search.noResults")}</p>
            ) : (
              results.map((tk) => (
                <button
                  key={tk.id}
                  onClick={() => { onSelectTask?.(tk); setQuery(""); setShowResults(false) }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white transition-colors hover:bg-white/5"
                >
                  <span className="flex-1 truncate">{(locale === "fr" ? tk.title_fr : tk.title_en) || tk.title}</span>
                  {tk.due_date && <span className="shrink-0 text-[10px] text-muted-foreground">{dateFmt(tk.due_date)}</span>}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <Button
          onClick={onNewTask}
          aria-label={t("topbar.newTask")}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transition-all duration-200 hover:from-indigo-600 hover:to-purple-700 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          size="lg"
        >
          <Plus className="size-4" data-icon="inline-start" />
          <span className="hidden sm:inline">{t("topbar.newTask")}</span>
        </Button>

        <Button
          onClick={onSuggestPlan}
          variant="outline"
          aria-label={t("topbar.suggestPlan")}
          className="border-purple-500/30 bg-purple-500/10 text-purple-300 shadow-lg transition-all duration-200 hover:border-purple-500/50 hover:bg-purple-500/20 hover:text-purple-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          size="lg"
        >
          <Sparkles className="size-4" data-icon="inline-start" />
          <span className="hidden sm:inline">{t("topbar.suggestPlan")}</span>
        </Button>
      </div>
    </header>
  )
}
