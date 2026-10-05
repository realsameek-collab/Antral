import { useEffect, useId, useRef } from 'react'
import Icon from './Icon.jsx'

export function Spinner({ size = 16, className = '' }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={`inline-block shrink-0 animate-spin rounded-full border-2 border-white/20 border-t-indigo-300 ${className}`}
    />
  )
}

// Accessible on/off switch. `pending` shows a spinner in the knob while saving.
export function Switch({ on, onChange, label, disabled = false, pending = false, size = 'md' }) {
  const small = size === 'sm'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      aria-busy={pending || undefined}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative shrink-0 rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
        small ? 'h-5 w-9' : 'h-6 w-11'
      } ${on ? 'bg-indigo-500' : 'bg-white/15 hover:bg-white/20'}`}
    >
      <span
        className={`absolute top-0.5 grid place-items-center rounded-full bg-white shadow transition-[left] duration-200 ${
          small ? 'h-4 w-4' : 'h-5 w-5'
        } ${on ? (small ? 'left-[18px]' : 'left-[22px]') : 'left-0.5'}`}
      >
        {pending && <span className="h-2.5 w-2.5 animate-spin rounded-full border border-neutral-300 border-t-indigo-500" />}
      </span>
    </button>
  )
}

const RISK = {
  standard: { text: 'Standard', dot: 'bg-emerald-400', cls: 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/20' },
  elevated: { text: 'Elevated', dot: 'bg-amber-400', cls: 'bg-amber-500/10 text-amber-300 ring-amber-400/25' },
  high: { text: 'High risk', dot: 'bg-rose-400', cls: 'bg-rose-500/10 text-rose-300 ring-rose-400/25' },
}

export function RiskBadge({ risk }) {
  const meta = RISK[risk] || RISK.standard
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${meta.cls}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.text}
    </span>
  )
}

const STATUS = {
  running: { text: 'Running', cls: 'bg-indigo-500/15 text-indigo-200', live: true },
  awaiting_approval: { text: 'Needs approval', cls: 'bg-amber-500/15 text-amber-200', live: true },
  completed: { text: 'Completed', cls: 'bg-emerald-500/12 text-emerald-300' },
  failed: { text: 'Failed', cls: 'bg-rose-500/12 text-rose-300' },
  cancelled: { text: 'Stopped', cls: 'bg-white/[0.06] text-neutral-400' },
  interrupted: { text: 'Interrupted', cls: 'bg-white/[0.06] text-neutral-400' },
}

export function StatusPill({ status }) {
  const meta = STATUS[status] || { text: status, cls: 'bg-white/[0.06] text-neutral-400' }
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}>
      {meta.live && <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
      {meta.text}
    </span>
  )
}

// Modal dialog: closes on Escape and backdrop click, moves focus inside on
// open and restores it on close.
export function Modal({ open, onClose, title, description, children, footer, size = 'md', labelledBy }) {
  const panelRef = useRef(null)
  const titleId = useId()
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return undefined
    const previous = document.activeElement
    const panel = panelRef.current
    const focusable =
      panel?.querySelector('[data-autofocus]') ||
      panel?.querySelector('input, select, textarea, button:not([data-close])')
    ;(focusable || panel)?.focus()
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current?.()
      }
      if (event.key === 'Tab' && panel) {
        const items = [...panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
          (el) => !el.disabled && el.offsetParent !== null,
        )
        if (!items.length) return
        const first = items[0]
        const last = items[items.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [open])

  if (!open) return null
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
    >
      <section
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || (title ? titleId : undefined)}
        className={`modal-panel flex max-h-[min(90dvh,56rem)] w-full ${widths[size]} flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#101014] text-white shadow-2xl shadow-black/60 outline-none`}
      >
        {title && (
          <header className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-6 py-4">
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-semibold tracking-tight">{title}</h2>
              {description && <p className="mt-1 text-xs leading-5 text-neutral-400">{description}</p>}
            </div>
            <button
              type="button"
              data-close
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 grid h-8 w-8 shrink-0 place-items-center rounded-full text-neutral-400 transition hover:bg-white/10 hover:text-white"
            >
              <Icon name="x" size={16} />
            </button>
          </header>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-white/[0.07] px-6 py-4">{footer}</footer>}
      </section>
    </div>
  )
}

// Yes/no confirmation for destructive or security-relevant actions.
export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', tone = 'danger', busy = false, onConfirm, onCancel }) {
  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onCancel}
      size="sm"
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy} data-autofocus>
            {busy && <Spinner size={12} />}
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="px-6 py-5 text-sm leading-6 text-neutral-300">{message}</p>
    </Modal>
  )
}

const BUTTON = {
  primary: 'bg-indigo-500 text-white hover:bg-indigo-400 shadow-sm shadow-indigo-950/40',
  secondary: 'border border-white/10 bg-white/[0.04] text-neutral-100 hover:bg-white/[0.08] hover:border-white/20',
  ghost: 'text-neutral-300 hover:bg-white/[0.06] hover:text-white',
  danger: 'bg-rose-500/90 text-white hover:bg-rose-500',
  dangerGhost: 'text-rose-300 hover:bg-rose-500/10',
  light: 'bg-white text-black hover:bg-neutral-200',
}

export function Button({ variant = 'secondary', size = 'md', className = '', children, ...props }) {
  const sizes = { sm: 'h-8 px-3 text-xs', md: 'h-9 px-4 text-sm', lg: 'h-11 px-5 text-sm' }
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition disabled:cursor-not-allowed disabled:opacity-45 ${sizes[size]} ${BUTTON[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

const CARD_TONES = {
  default: 'border-white/[0.08] bg-white/[0.025]',
  accent: 'border-indigo-400/20 bg-indigo-500/[0.06]',
  good: 'border-emerald-400/20 bg-emerald-500/[0.05]',
  warn: 'border-amber-400/30 bg-amber-500/[0.07]',
  danger: 'border-rose-400/20 bg-white/[0.025]',
}

export function Card({ tone = 'default', className = '', children, ...props }) {
  return (
    <div {...props} className={`rounded-2xl border ${CARD_TONES[tone] || CARD_TONES.default} ${className}`}>
      {children}
    </div>
  )
}

export function EmptyState({ icon = 'info', title, children, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-neutral-400">
        <Icon name={icon} size={22} />
      </span>
      <h3 className="mt-4 text-sm font-medium text-white">{title}</h3>
      {children && <p className="mt-1.5 max-w-sm text-xs leading-5 text-neutral-500">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
