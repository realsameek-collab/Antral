import { useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import PolicyDocument from './PolicyDocument.jsx'
import Icon from './ui/Icon.jsx'
import { Button, Modal, RiskBadge, Spinner } from './ui/primitives.jsx'
import { SCOPE_ICON } from './settings/scopeMeta.js'
import { authorizeTarget } from '../store/consentSlice.js'

const TARGET_TYPES = [
  { id: 'local', label: 'Local folder', icon: 'folder', placeholder: 'C:\\path\\to\\project', hint: 'The full path of a folder on this computer.' },
  { id: 'github', label: 'GitHub repo', icon: 'github', placeholder: 'https://github.com/owner/repo', hint: 'A repository you own or may assess.' },
  { id: 'host', label: 'Host / URL', icon: 'globe', placeholder: 'app.example.com', hint: 'A domain or host you are authorized to test.' },
]

const BASES = [
  { id: 'owner', label: 'I own this target' },
  { id: 'written_permission', label: 'I have written permission to test it' },
  { id: 'employer_authorized', label: 'My employer / organization authorizes me' },
]

function AuthorizationForm({ prefill, onClose, onAuthorized }) {
  const dispatch = useDispatch()
  const policies = useSelector((state) => state.consent.policies)
  const disabled = useSelector((state) => state.consent.account?.disabledCapabilities || [])

  const scopes = useMemo(() => policies?.scopes || [], [policies])
  const authDoc = policies?.targetAuthorization
  const authVersion = policies?.versions?.targetAuthorization

  const [targetType, setTargetType] = useState(prefill?.type || 'local')
  const [identifier, setIdentifier] = useState(prefill?.identifier || '')
  const [label, setLabel] = useState(prefill?.label || '')
  const [basis, setBasis] = useState('owner')
  const [confirmed, setConfirmed] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [granted, setGranted] = useState(() =>
    Object.fromEntries(scopes.map((s) => [s.id, prefill?.scopes ? prefill.scopes.includes(s.id) : s.defaultOn])),
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const selectedScopes = scopes.filter((s) => granted[s.id]).map((s) => s.id)
  const typeMeta = TARGET_TYPES.find((t) => t.id === targetType) || TARGET_TYPES[0]
  const missing = !identifier.trim() ? 'Enter the target' : selectedScopes.length === 0 ? 'Choose at least one permission' : !confirmed ? 'Confirm your authorization' : null

  const submit = async (event) => {
    event.preventDefault()
    if (missing || submitting) return
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
    <form onSubmit={submit} className="flex min-h-0 flex-col">
      <div className="space-y-6 px-6 py-5">
        <fieldset>
          <legend className="mb-2 text-xs font-medium text-neutral-400">What should the agents work on?</legend>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Target type">
            {TARGET_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={t.id === targetType}
                onClick={() => setTargetType(t.id)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs transition ${
                  t.id === targetType
                    ? 'border-indigo-400/50 bg-indigo-500/10 text-indigo-100'
                    : 'border-white/10 text-neutral-400 hover:border-white/20 hover:text-neutral-200'
                }`}
              >
                <Icon name={t.icon} size={18} />
                {t.label}
              </button>
            ))}
          </div>
          <label className="mt-3 block">
            <span className="sr-only">Target</span>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={typeMeta.placeholder}
              spellCheck={false}
              autoComplete="off"
              data-autofocus
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 font-mono text-sm outline-none transition placeholder:font-sans placeholder:text-neutral-600 focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/10"
            />
          </label>
          <p className="mt-1.5 px-1 text-[11px] text-neutral-500">{typeMeta.hint}</p>
          <label className="mt-3 block">
            <span className="sr-only">Label</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Friendly name (optional), e.g. “Website backend”"
              maxLength={80}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-neutral-600 focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/10"
            />
          </label>
        </fieldset>

        <fieldset>
          <legend className="mb-2 flex w-full items-baseline justify-between text-xs font-medium text-neutral-400">
            Permissions for this target
            <span className="font-normal text-neutral-600">{selectedScopes.length} selected</span>
          </legend>
          <div className="space-y-1.5">
            {scopes.map((s) => (
              <label
                key={s.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                  granted[s.id] ? 'border-indigo-400/30 bg-indigo-500/[0.06]' : 'border-white/[0.08] hover:border-white/15'
                }`}
              >
                <input
                  type="checkbox"
                  checked={Boolean(granted[s.id])}
                  onChange={(e) => setGranted((g) => ({ ...g, [s.id]: e.target.checked }))}
                  className="mt-1 h-4 w-4 shrink-0 accent-indigo-500"
                />
                <Icon name={SCOPE_ICON[s.id]} size={16} className="mt-0.5 text-neutral-400" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-white">{s.label}</span>
                    {s.risk !== 'standard' && <RiskBadge risk={s.risk} />}
                    {disabled.includes(s.id) && (
                      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-neutral-400">Off account-wide</span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-neutral-500">{s.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-3 rounded-xl border border-indigo-400/20 bg-indigo-500/[0.05] p-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-neutral-400">Basis for authorization</span>
            <select
              value={basis}
              onChange={(e) => setBasis(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0c0c10] px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
            >
              {BASES.map((b) => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-neutral-200">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-indigo-500"
            />
            <span>
              I confirm I am authorized to assess this target and take responsibility for this authorization. Testing
              systems without permission may be illegal.
            </span>
          </label>
          {authDoc && (
            <div>
              <button
                type="button"
                onClick={() => setShowTerms((v) => !v)}
                aria-expanded={showTerms}
                className="inline-flex items-center gap-1 text-xs text-indigo-300 transition hover:text-indigo-200"
              >
                <Icon name={showTerms ? 'chevronDown' : 'chevronRight'} size={14} />
                {showTerms ? 'Hide' : 'Read'} the authorization terms
              </button>
              {showTerms && (
                <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-white/10 bg-black/30 p-4">
                  <PolicyDocument document={authDoc} />
                </div>
              )}
            </div>
          )}
          <p className="text-[11px] text-neutral-500">Authorizations last 90 days. You can change or revoke them at any time.</p>
        </div>

        {error && (
          <p role="alert" className="flex items-center gap-2 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            <Icon name="alert" size={15} />
            {error}
          </p>
        )}
      </div>

      <footer className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-white/[0.07] bg-[#101014] px-6 py-4">
        {missing && <span className="mr-auto text-xs text-neutral-500">{missing}</span>}
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={Boolean(missing) || submitting}>
          {submitting && <Spinner size={12} />}
          {submitting ? 'Authorizing…' : 'Authorize target'}
        </Button>
      </footer>
    </form>
  )
}

// Captures the authorization attestation and the scopes granted for a target.
// The form mounts fresh on every open, so it never shows stale input.
function TargetAuthorizationDialog({ open, onClose, prefill, onAuthorized }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={prefill ? 'Re-authorize target' : 'Authorize a target'}
      description="Confirm you may assess this target and choose what the agents are allowed to do there."
    >
      {open && <AuthorizationForm prefill={prefill} onClose={onClose} onAuthorized={onAuthorized} />}
    </Modal>
  )
}

export default TargetAuthorizationDialog
