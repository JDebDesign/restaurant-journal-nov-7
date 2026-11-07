import { createContext, useCallback, useContext, useRef, useState } from 'react'

const Ctx = createContext<(msg: string) => void>(() => {})
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const toast = useCallback((m: string) => {
    setMsg(m)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMsg(''), 2600)
  }, [])
  return (
    <Ctx.Provider value={toast}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4">
        {msg && <div className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-white shadow-lg">{msg}</div>}
      </div>
    </Ctx.Provider>
  )
}
