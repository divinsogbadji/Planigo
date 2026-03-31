"use client"

import { useEffect, useState, useCallback, createContext, useContext } from "react"
import { CheckCircle2, XCircle, AlertTriangle, X } from "lucide-react"

type ToastType = "success" | "error" | "warning"

interface ToastItem {
  id: number
  type: ToastType
  message: string
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let nextId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((type: ToastType, message: string) => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, type, message }])
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2">
        {toasts.map((t) => (
          <ToastNotification key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

const icons: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
}

const styles: Record<ToastType, string> = {
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  error: "border-red-500/30 bg-red-500/10 text-red-400",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-400",
}

function ToastNotification({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const Icon = icons[item.type]

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(item.id), 4000)
    return () => clearTimeout(timer)
  }, [item.id, onDismiss])

  return (
    <div className={`pointer-events-auto flex animate-fade-up items-center gap-2.5 rounded-lg border px-4 py-3 shadow-3d backdrop-blur-lg ${styles[item.type]}`}>
      <Icon className="size-4 shrink-0" />
      <p className="text-sm font-medium">{item.message}</p>
      <button onClick={() => onDismiss(item.id)} className="ml-2 shrink-0 opacity-60 hover:opacity-100 transition-opacity">
        <X className="size-3.5" />
      </button>
    </div>
  )
}

