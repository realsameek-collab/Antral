import Icon from '../ui/Icon.jsx'
import { Button } from '../ui/primitives.jsx'

export function SettingsSection({ title, description, aside, children }) {
  return (
    <section className="page-enter space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap">
        <div className="min-w-0 max-w-2xl">
          <h2 className="text-lg font-semibold tracking-tight text-white">{title}</h2>
          {description && <p className="mt-1 text-sm leading-6 text-neutral-400">{description}</p>}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </header>
      {children}
    </section>
  )
}

// Shown on settings tabs that need the account policies accepted first.
export function NeedsPolicies({ onNavigate }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-400/25 bg-amber-500/[0.07] px-4 py-3.5">
      <Icon name="alert" size={18} className="text-amber-300" />
      <p className="min-w-0 flex-1 text-sm text-amber-100/90">
        Accept the policies before you can change permissions or start the agents.
      </p>
      <Button size="sm" variant="light" onClick={() => onNavigate('settings', 'privacy')}>
        Review policies
      </Button>
    </div>
  )
}
