"use client"
import { useState } from "react"
import { CalendarDays, CalendarRange, ListTodo, User, Briefcase, GraduationCap, Sparkles, LogOut } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { logout } from "@/app/(auth)/actions"

export type NavItem = "today" | "week" | "all"
export type CategoryFilter = "all" | "personal" | "work" | "study"

interface SidebarProps {
  activeNav?: NavItem
  activeCategory?: CategoryFilter
  onNavChange?: (nav: NavItem) => void
  onCategoryChange?: (cat: CategoryFilter) => void
}

const navItems: { key: NavItem; label: string; icon: React.ElementType }[] = [
  { key: "today", label: "Today", icon: CalendarDays },
  { key: "week", label: "Week", icon: CalendarRange },
  { key: "all", label: "All Tasks", icon: ListTodo },
]

const categoryItems: { key: CategoryFilter; label: string; icon: React.ElementType; color: string }[] = [
  { key: "all", label: "All", icon: Sparkles, color: "text-purple-400" },
  { key: "personal", label: "Personal", icon: User, color: "text-emerald-400" },
  { key: "work", label: "Work", icon: Briefcase, color: "text-blue-400" },
  { key: "study", label: "Study", icon: GraduationCap, color: "text-amber-400" },
]

export function Sidebar({ activeNav: controlledNav, activeCategory: controlledCategory, onNavChange, onCategoryChange }: SidebarProps) {
  const [internalNav, setInternalNav] = useState<NavItem>("all")
  const [internalCategory, setInternalCategory] = useState<CategoryFilter>("all")
  const activeNav = controlledNav ?? internalNav
  const activeCategory = controlledCategory ?? internalCategory

  function handleNav(nav: NavItem) { setInternalNav(nav); onNavChange?.(nav) }
  function handleCategory(cat: CategoryFilter) { setInternalCategory(cat); onCategoryChange?.(cat) }

  return (
    <aside className="glass flex w-64 shrink-0 flex-col border-r border-white/5 p-5">
      <div className="mb-8 flex items-center gap-2.5">
        <div className="gradient-primary flex size-9 items-center justify-center rounded-xl shadow-glow-indigo">
          <Sparkles className="size-5 text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">Planigo</h1>
      </div>

      <div className="space-y-1">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Navigation</p>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeNav === item.key
          return (
            <button key={item.key} onClick={() => handleNav(item.key)} className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${isActive ? "glass-card text-white shadow-3d" : "text-muted-foreground hover:bg-white/5 hover:text-white"}`}>
              <Icon className={`size-4 transition-colors ${isActive ? "text-purple-400" : "text-muted-foreground group-hover:text-white"}`} />
              {item.label}
            </button>
          )
        })}
      </div>

      <Separator className="my-5 bg-white/5" />

      <div className="space-y-1">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Categories</p>
        {categoryItems.map((item) => {
          const Icon = item.icon
          const isActive = activeCategory === item.key
          return (
            <button key={item.key} onClick={() => handleCategory(item.key)} className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${isActive ? "glass-card text-white shadow-3d" : "text-muted-foreground hover:bg-white/5 hover:text-white"}`}>
              <Icon className={`size-4 ${item.color}`} />
              {item.label}
            </button>
          )
        })}
      </div>

      <div className="flex-1" />

      <form action={logout}>
        <button type="submit" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-red-500/10 hover:text-red-400">
          <LogOut className="size-4" />
          Sign out
        </button>
      </form>
    </aside>
  )
}