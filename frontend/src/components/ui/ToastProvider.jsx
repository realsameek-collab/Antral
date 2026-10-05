import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { ToastContext } from './toast.js'

const TONES = {
  info: { icon: 'info', cls: 'text-indigo-300' },
  success: { icon: 'check', cls: 'text-emerald-300' },
  error: { icon: 'alert', cls: 'text-rose-300' },
}

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    ({ message, tone = 'info', action, duration = tone === 'error' ? 6000 : 3500 }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      setToasts((list) => [...list.slice(-2), { id, message, tone, action }])
      timers.current.set(id, setTimeout(() => dismiss(id), duration))
      return id
    },
    [dismiss],
  )

  useEffect(() => {
    const map = timers.current
    return () => map.forEach((timer) => clearTimeout(timer))
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-5 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 flex-col gap-2">
        {toasts.map((t) => {
          const tone = TONES[t.tone] || TONES.info
          return (
            <div
              key={t.id}
              role={t.tone === 'error' ? 'alert' : 'status'}
              className="toast-in pointer-events-auto flex items-center gap-3 rounded-xl border border-white/10 bg-[#1b1b20]/95 px-4 py-3 text-sm text-white shadow-2xl shadow-black/50 backdrop-blur"
            >
              <Icon name={tone.icon} size={16} className={tone.cls} />
              <span className="min-w-0 flex-1 leading-5">{t.message}</span>
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action.onClick()
                    dismiss(t.id)
                  }}
                  className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-indigo-300 transition hover:bg-white/[0.06] hover:text-indigo-200"
                >
                  {t.action.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="-mr-1 grid h-6 w-6 shrink-0 place-items-center rounded-md text-neutral-500 transition hover:bg-white/[0.06] hover:text-white"
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastProvider
