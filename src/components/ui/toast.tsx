'use client'

/**
 * Toast notification system — lightweight, no external deps.
 */

import { createContext, useCallback, useContext, useState } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

type ToastType = 'success' | 'error' | 'info'
type Toast = { id: number; type: ToastType; message: string }

const ToastContext = createContext<{ toast: (type: ToastType, msg: string) => void } | null>(null)

export function useToast() {
  return useContext(ToastContext)!
}

let nextId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((type: ToastType, message: string) => {
    const id = ++nextId
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id))

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm"
        aria-live="polite" aria-atomic="false" role="status">
        {toasts.map((t) => (
          <div key={t.id}
            className={clsx(
              'flex items-start gap-2 rounded-xl px-4 py-3 text-[13px] font-medium shadow-lg animate-in slide-in-from-right',
              t.type === 'success' && 'bg-[#7A9E7E] text-white',
              t.type === 'error' && 'bg-error text-white',
              t.type === 'info' && 'bg-card border border-border text-foreground-strong',
            )}>
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="shrink-0 opacity-70 hover:opacity-100">
              <X size={13} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}