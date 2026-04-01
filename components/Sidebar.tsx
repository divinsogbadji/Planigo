"use client"
import { useState } from "react"
import { Archive, CalendarDays, CalendarRange, Globe, ListTodo, User, Briefcase, GraduationCap, Plane, Heart, Wallet, Palette, Sparkles, LogOut, ArrowDown, ArrowRight, ArrowUp, Filter } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { logout } from "@/app/(auth)/actions"
import { useTranslation } from "@/lib/i18n"

export type NavItem = "today" | "week" | "all" | "archived"
export type CategoryFilter = "all" | "personal" | "work" | "study" | "travel" | "health" | "finance" | "hobby"
export type PriorityFilter = "all" | "low" | "medium" | "high"

interface SidebarProps {
  activeNav?: NavItem
  activeCategory?: CategoryFilter
  activePriority?: PriorityFilter
  onNavChange?: (nav: NavItem) => void
  onCategoryChange?: (cat: CategoryFilter) => void
  onPriorityChange?: (p: PriorityFilter) => void
}

const navKeys: { key: NavItem; tKey: "nav.today" | "nav.week" | "nav.allTasks" | "nav.archived"; icon: React.ElementType }[] = [
  { key: "today", tKey: "nav.today", icon: CalendarDays },
  { key: "week", tKey: "nav.week", icon: CalendarRange },
  { key: "all", tKey: "nav.allTasks", icon: ListTodo },
  { key: "archived", tKey: "nav.archived", icon: Archive },
]

const prioKeys: { key: PriorityFilter; tKey: "priority.all" | "priority.low" | "priority.medium" | "priority.high"; icon: React.ElementType; color: string }[] = [
  { key: "all", tKey: "priority.all", icon: Filter, color: "text-purple-400" },
  { key: "low", tKey: "priority.low", icon: ArrowDown, color: "text-emerald-400" },
  { key: "medium", tKey: "priority.medium", icon: ArrowRight, color: "text-amber-400" },
  { key: "high", tKey: "priority.high", icon: ArrowUp, color: "text-rose-400" },
]

const catKeys: { key: CategoryFilter; tKey: "cat.all" | "cat.personal" | "cat.work" | "cat.study" | "cat.travel" | "cat.health" | "cat.finance" | "cat.hobby"; icon: React.ElementType; color: string }[] = [
  { key: "all", tKey: "cat.all", icon: Sparkles, color: "text-purple-400" },
  { key: "personal", tKey: "cat.personal", icon: User, color: "text-emerald-400" },
  { key: "work", tKey: "cat.work", icon: Briefcase, color: "text-blue-400" },
  { key: "study", tKey: "cat.study", icon: GraduationCap, color: "text-amber-400" },
  { key: "travel", tKey: "cat.travel", icon: Plane, color: "text-cyan-400" },
  { key: "health", tKey: "cat.health", icon: Heart, color: "text-rose-400" },
  { key: "finance", tKey: "cat.finance", icon: Wallet, color: "text-lime-400" },
  { key: "hobby", tKey: "cat.hobby", icon: Palette, color: "text-fuchsia-400" },
]

export function Sidebar({ activeNav: controlledNav, activeCategory: controlledCategory, activePriority: controlledPriority, onNavChange, onCategoryChange, onPriorityChange }: SidebarProps) {
  const [internalNav, setInternalNav] = useState<NavItem>("all")
  const [internalCategory, setInternalCategory] = useState<CategoryFilter>("all")
  const [internalPriority, setInternalPriority] = useState<PriorityFilter>("all")
  const activeNav = controlledNav ?? internalNav
  const activeCategory = controlledCategory ?? internalCategory
  const activePriority = controlledPriority ?? internalPriority
  const { t, locale, setLocale } = useTranslation()

  function handleNav(nav: NavItem) { setInternalNav(nav); onNavChange?.(nav) }
  function handleCategory(cat: CategoryFilter) { setInternalCategory(cat); onCategoryChange?.(cat) }
  function handlePriority(p: PriorityFilter) { setInternalPriority(p); onPriorityChange?.(p) }

  return (
    <aside className="glass flex w-64 shrink-0 flex-col border-r border-white/5 p-5">
      <div className="mb-8 flex items-center gap-2.5">
        <div className="gradient-primary flex size-9 items-center justify-center rounded-xl shadow-glow-indigo">
          <Sparkles className="size-5 text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">Planigo</h1>
      </div>

      <div className="space-y-1">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{t("nav.navigation")}</p>
        {navKeys.map((item) => {
          const Icon = item.icon
          const isActive = activeNav === item.key
          return (
            <button key={item.key} onClick={() => handleNav(item.key)} className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${isActive ? "glass-card text-white shadow-3d" : "text-muted-foreground hover:bg-white/5 hover:text-white"}`}>
              <Icon className={`size-4 transition-colors ${isActive ? "text-purple-400" : "text-muted-foreground group-hover:text-white"}`} />
              {t(item.tKey)}
            </button>
          )
        })}
      </div>

      <Separator className="my-5 bg-white/5" />

      <div className="space-y-1">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{t("nav.categories")}</p>
        {catKeys.map((item) => {
          const Icon = item.icon
          const isActive = activeCategory === item.key
          return (
            <button key={item.key} onClick={() => handleCategory(item.key)} className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${isActive ? "glass-card text-white shadow-3d" : "text-muted-foreground hover:bg-white/5 hover:text-white"}`}>
              <Icon className={`size-4 ${item.color}`} />
              {t(item.tKey)}
            </button>
          )
        })}
      </div>

      <Separator className="my-5 bg-white/5" />

      <div className="space-y-1">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{t("nav.priorities")}</p>
        {prioKeys.map((item) => {
          const Icon = item.icon
          const isActive = activePriority === item.key
          return (
            <button key={item.key} onClick={() => handlePriority(item.key)} className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${isActive ? "glass-card text-white shadow-3d" : "text-muted-foreground hover:bg-white/5 hover:text-white"}`}>
              <Icon className={`size-4 ${item.color}`} />
              {t(item.tKey)}
            </button>
          )
        })}
      </div>

      <div className="flex-1" />

      <button
        type="button"
        onClick={() => setLocale(locale === "en" ? "fr" : "en")}
        className="mb-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-white/5 hover:text-white"
      >
        <Globe className="size-4" />
        {t("lang.toggle")}
      </button>

      <form action={logout}>
        <button type="submit" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-red-500/10 hover:text-red-400">
          <LogOut className="size-4" />
          {t("nav.signOut")}
        </button>
      </form>
    </aside>
  )
}