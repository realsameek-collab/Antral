import { useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import PolicyDocument from './PolicyDocument.jsx'
import { authorizeTarget } from '../store/consentSlice.js'

const TARGET_TYPES = [
  { id: 'local', label: 'Local folder', placeholder: 'C:\\path\\to\\project' },
  { id: 'github', label: 'GitHub repo', placeholder: 'https://github.com/owner/repo' },
  { id: 'host', label: 'Host / URL', placeholder: 'app.example.com' },
]

const RISK_BADGE = {
  standard: null,
  elevated: { text: 'Elevated', cls: 'bg-amber-500/15 text-amber-300 ring-amber-400/30' },
  high: { text: 'High risk', cls: 'bg-rose-500/15 text-rose-300 ring-rose-400/30' },
}

// Modal shown when the user points the agents at a new target. Captures the
// authorization attestation and the scopes they grant for that target.
function TargetAuthorizationDialog({ open, onClose, prefill, onAuthorized }) {
  const dispatch = useDispatch()
  const policies = useSelector((state) => state.consent.policies)

  const scopes = useMemo(() => policies?.scopes || [], [policies])
  const authDoc = policies?.targetAuthorization
  const authVersion = policies?.versions?.targetAuthorization

  const [targetType, setTargetType] = useState(prefill?.type || 'local')
  const [identifier, setIdentifier] = useState(prefill?.identifier || '')
  const [label, setLabel] = useState(prefill?.label || '')
  const [basis, setBasis] = useState('owner')
  const [confirmed, setConfirmed] = useState(false)
  const [granted, setGranted] = useState(() =>
    Object.fromEntries((policies?.scopes || []).map((s) => [s.id, s.defaultOn])),
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const selectedScopes = useMemo(
    () => scopes.filter((s) => granted[s.id]).map((s) => s.id),
    [scopes, granted],
  )
  const canSubmit = confirmed && identifier.trim() && selectedScopes.length > 0 && !submitting

  if (!open) return null

  const typeMeta = TARGET_TYPES.find((t) => t.id === targetType) || TARGET_TYPES[0]

  const submit = async () => {
    setError(null)
    setSubmitting(true)
    const result = await dispatch(
      authorizeTarget({
        target: { type: targetType, identifier: identifier.trim(), label: label.trim() },
        attestation: { ownershipConfirmed: true, basis },
        scopes: selectedScopes,
        authorizationVersion: authVersion,
      }),
    )
    setSubmitting(false)
    if (authorizeTarget.fulfilled.match(result)) {
      onAuthorized?.(result.payload)
      onClose?.()
    } else {
      setError(result.payload || 'Could not authorize this target.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
      <div className="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b11] text-white shadow-2xl">
        <header className="border-b border-white/10 px-6 py-4">
          <h2 className="text-base font-semibold tracking-tight">Authorize a target</h2>
          <p className="mt-1 text-xs text-neutral-400">
            Confirm you may test this target and choose what the agents are allowed to do.
          </p>
        </header>

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          {authDoc && (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <PolicyDocument document={authDoc} />
            </div>
          )}

          {/* Target */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {TARGET_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTargetType(t.id)}
                  className={`rounded-full px-3 py-1.5 text-xs transition ${
                    t.id === targetType
                      ? 'bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-400/40'
                      : 'text-neutral-400 hover:bg-white/5'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={typeMeta.placeholder}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-neutral-600 focus:border-indigo-400/50"
            />
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label (optional)"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-neutral-600 focus:border-indigo-400/50"
            />
          </div>

          {/* Scopes */}
          <fieldset className="space-y-2">
            <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
              Permissions for this target
            </legend>
            {scopes.map((s) => {
              const badge = RISK_BADGE[s.risk]
              return (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-black/20 p-3 text-sm hover:border-white/20"
                >
                  <input
                    type="checkbox"
                    checked={!!granted[s.id]}
                    onChange={(e) => setGranted((g) => ({ ...g, [s.id]: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 accent-indigo-500"
                  />
                  <span className="flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-white">{s.label}</span>
                      {badge && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ring-1 ${badge.cls}`}>
                          {badge.text}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs text-neutral-400">{s.description}</span>
                  </span>
                </label>
              )
            })}
          </fieldset>

          {/* Attestation */}
          <div className="space-y-3 rounded-xl border border-indigo-400/20 bg-indigo-500/5 p-4">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-500">
                Basis for authorization
              </label>
              <select
                value={basis}
                onChange={(e) => setBasis(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
              >
                <option value="owner">I own this target</option>
                <option value="written_permission">I have written permission to test it</option>
                <option value="employer_authorized">My employer/organization authorizes me</option>
              </select>
            </div>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-neutral-200">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-indigo-500"
              />
              <span>
                I confirm I am authorized to assess this target and take responsibility for this
                authorization. Testing systems without permission may be illegal.
              </span>
            </label>
          </div>

          {error && <p className="text-sm text-rose-300">{error}</p>}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm text-neutral-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className="rounded-full bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? 'Authorizing…' : 'Authorize target'}
          </button>
        </footer>
      </div>
    </div>
  )
}

export default TargetAuthorizationDialog
