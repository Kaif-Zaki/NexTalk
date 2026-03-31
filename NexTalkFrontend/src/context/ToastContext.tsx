/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

type ToastContextValue = {
  message: string | null
  notify: (text: string) => void
  clear: () => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)

  const notify = useCallback((text: string) => {
    setMessage(text)
    window.setTimeout(() => setMessage(null), 1800)
  }, [])

  const clear = useCallback(() => {
    setMessage(null)
  }, [])

  const value = useMemo(() => ({ message, notify, clear }), [message, notify, clear])

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
