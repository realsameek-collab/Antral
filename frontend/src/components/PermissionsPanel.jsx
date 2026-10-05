import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import TargetAuthorizationDialog from './TargetAuthorizationDialog.jsx'
import { setDisabledCapabilities, revokeTarget } from '../store/consentSlice.js'

const RISK_DOT = {
  standard: 'bg-emerald-400/70',
  elevated: 'bg-amber-400/80',
  high: 'bg-rose-400/80',
}

// A small toggle switch.
function Switch({ on, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        on ? 'bg-indigo-500' : 'bg-white/15'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
          on ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  )
}

// Always-available control plane: turn any capability off account-wide, and
// manage which targets the agents are authorized to act on.
function PermissionsPanel() {
  const dispatch = useDispatch()
  const { policies, account, authorizations } = useSelector((state) => state.consent)
  const [dialogOpen, setDialogOpen] = useState(false)

  const scopes = policies?.scopes || []
  const disabled = account?.disabledCapabilities || []

  const toggleCapability = (scopeId, turnOn) => {
    const next = turnOn ? disabled.filter((s) => s !== scopeId) : [...new Set([...disabled, scopeId])]
    dispatch(setDisabledCapabilities(next))
  }

  return (
    <section className="w-full max-w-xl space-y-8 text-left">
      {/* Global capability switches */}
      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-white">Capabilities</h2>
          <span className="text-xs text-neutral-500">Turn any off at any time</span>
        </div>
        <p className="mb-4 text-xs text-neutral-500">
          A capability turned off here is blocked everywhere, even where you granted it to a target.
        </p>
        <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
          {scopes.map((s) => {
            const on = !disabled.includes(s.id)
            return (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`h-2 w-2 shrink-0 rounded-full ${RISK_DOT[s.risk]}`} />
                <span className="flex-1">
                  <span className="block text-sm text-white">{s.label}</span>
                  <span className="block text-xs text-neutral-500">{s.description}</span>
                </span>
                <Switch on={on} onChange={(v) => toggleCapability(s.id, v)} label={s.label} />
              </li>
            )
          })}
        </ul>
      </div>

      {/* Authorized targets */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-white">Authorized targets</h2>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="rounded-full border border-indigo-400/40 bg-indigo-500/10 px-3 py-1.5 text-xs text-indigo-200 hover:bg-indigo-500/20"
          >
            + Authorize a target
          </button>
        </div>

        {authorizations.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-neutral-500">
            No targets authorized yet. The agents can't act until you authorize one.
          </p>
        ) : (
          <ul className="space-y-2">
            {authorizations.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
              >
                <span className="flex-1 overflow-hidden">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm text-white">
                      {a.target.label || a.target.identifier}
                    </span>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-400">
                      {a.target.type}
                    </span>
                    {a.status !== 'active' && (
                      <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] text-rose-300">
                        {a.status}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-neutral-500">
                    {a.scopes.length} permission{a.scopes.length === 1 ? '' : 's'} ·{' '}
                    {a.target.identifier}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => dispatch(revokeTarget(a.id))}
                  className="rounded-full px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <TargetAuthorizationDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </section>
  )
}

export default PermissionsPanel
