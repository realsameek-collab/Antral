import { createContext, useContext } from 'react'

export const ToastContext = createContext({ toast: () => {} })

// toast({ message, tone?: 'info' | 'success' | 'error', action?: { label, onClick } })
export const useToast = () => useContext(ToastContext).toast
