import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Icon from '../ui/Icon.jsx'
import { Button, Card, ConfirmDialog, EmptyState, RiskBadge, Spinner, Switch } from '../ui/primitives.jsx'
import { useToast } from '../ui/toast.js'
import TargetAuthorizationDialog from '../TargetAuthorizationDialog.jsx'
import { revokeTarget, updateTargetScopes } from '../../store/consentSlice.js'
import { getAlwaysAllow, removeAlwaysAllow } from '../../../utils/agentApi.js'
import { daysUntil, fullDate, TARGET_TYPE_META, targetName } from '../../lib/format.js'
import { SCOPE_ICON } from './scopeMeta.js'
import { NeedsPolicies, SettingsSection } from './SettingsSection.jsx'

const BASIS = {
  owner: 'You own it',
  written_permission: 'Written permission',
  employer_authorized: 'Employer authorized',
}

const describeRule = (rule) => {
  if (rule.startsWith('run_command:')) return { title: `Commands starting with “${rule.slice(12)}”`, icon: 'terminal' }
  const names = {
    write_file: 'Writing files',
    edit_file: 'Editing files',
    make_directory: 'Creating folders',
    move_path: 'Moving files',
  }
  return { title: names[rule] || rule, icon: 'doc' }
}

function AlwaysAllowRules({ authorizationId }) {
  const toast = useToast()
  const [rules, setRules] = useState(null)
  const [removing, setRemoving] = useState(null)

  useEffect(() => {
    let cancelled = false
    getAlwaysAllow(authorizationId)
      .then(({ rules: list }) => !cancelled && setRules(list))
      .catch(() => !cancelled && setRules([]))
    return () => {
      cancelled = true
    }
  }, [authorizationId])

  const remove = async (rule) => {
    setRemoving(rule || 'all')
    try {
      const { rules: list } = await removeAlwaysAllow(authorizationId, rule)
      setRules(list)
    } catch {
      toast({ tone: 'error', message: 'Could not remove that rule. Please try again.' })
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-medium text-neutral-400">Always allowed without asking</h4>
        {rules?.length > 1 && (
          <button
            type="button"
            onClick={() => remove(null)}
            disabled={removing !== null}
            className="text-[11px] text-rose-300/80 transition hover:text-rose-300 disabled:opacity-50"
          >
            Remove all
          </button>
        )}
      </div>
      {rules === null ? (
        <div className="flex items-center gap-2 px-1 py-2 text-xs text-neutral-500">
          <Spinner size={12} /> Loading…
        </div>
      ) : rules.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/10 px-3 py-2.5 text-xs text-neutral-500">
          None. Every change on this target asks you first. Rules are added when you choose “Always allow”.
        </p>
      ) : (
        <ul className="space-y-1">
          {rules.map((rule) => {
            const meta = describeRule(rule)
            return (
              <li key={rule} className="flex items-center gap-2.5 rounded-lg bg-white/[0.03] px-3 py-2 text-xs">
                <Icon name={meta.icon} size={14} className="text-neutral-500" />
                <span className="min-w-0 flex-1 truncate text-neutral-200" title={meta.title}>{meta.title}</span>
                <button
                  type="button"
                  onClick={() => remove(rule)}
                  disabled={removing !== null}
                  aria-label={`Stop always allowing: ${meta.title}`}
                  className="grid h-6 w-6 place-items-center rounded-md text-neutral-500 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                >
                  {removing === rule ? <Spinner size={10} /> : <Icon name="x" size={13} />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function TargetCard({ authorization, scopes, disabled, accepted, onRevoke, onReauthorize }) {
  const dispatch = useDispatch()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(null)
  const meta = TARGET_TYPE_META[authorization.target.type] || TARGET_TYPE_META.project
  const active = authorization.status === 'active'
  const days = daysUntil(authorization.expiresAt)
  const expiringSoon = active && days !== null && days <= 14

  const toggleScope = async (scopeId, on) => {
    const next = on
      ? [...new Set([...authorization.scopes, scopeId])]
      : authorization.scopes.filter((s) => s !== scopeId)
    setSaving(scopeId)
    const result = await dispatch(updateTargetScopes({ id: authorization.id, scopes: next }))
    setSaving(null)
    if (updateTargetScopes.rejected.match(result)) {
      toast({ tone: 'error', message: result.payload?.message || 'Could not update this target.' })
    }
  }

  return (
    <Card className={`overflow-hidden transition ${open ? 'ring-1 ring-white/10' : ''}`}>
      <div className="flex items-center gap-3 px-4 py-3.5">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 ${active ? 'bg-white/[0.05] text-neutral-200' : 'text-neutral-600'}`}>
          <Icon name={meta.icon} size={18} />
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="min-w-0 flex-1 text-left"
        >
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium text-white">{targetName(authorization)}</span>
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-neutral-400">{meta.label}</span>
            {!active && (
              <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-medium capitalize text-rose-300">{authorization.status}</span>
            )}
            {expiringSoon && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                Expires in {days} day{days === 1 ? '' : 's'}
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate font-mono text-[11px] text-neutral-500" title={authorization.target.identifier}>
                {authorization.target.type === 'computer' ? 'All accessible local drives' : authorization.target.identifier}
          </span>
        </button>
        <span className="hidden text-xs text-neutral-500 sm:block">
          {authorization.scopes.length} permission{authorization.scopes.length === 1 ? '' : 's'}
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Hide details' : 'Show details'}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-neutral-400 transition hover:bg-white/[0.06] hover:text-white"
        >
          <Icon name="chevronDown" size={16} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="expand-in space-y-5 border-t border-white/[0.06] bg-black/20 px-4 py-4">
          <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
            <div>
              <dt className="text-neutral-500">Basis</dt>
              <dd className="mt-0.5 text-neutral-200">{BASIS[authorization.basis] || '—'}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Authorized</dt>
              <dd className="mt-0.5 text-neutral-200">{fullDate(authorization.createdAt) || '—'}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">{active ? 'Expires' : 'Expired'}</dt>
              <dd className={`mt-0.5 ${expiringSoon || !active ? 'text-amber-200' : 'text-neutral-200'}`}>{fullDate(authorization.expiresAt) || '—'}</dd>
            </div>
          </dl>

          {active ? (
            <>
              <div>
                <h4 className="mb-2 text-xs font-medium text-neutral-400">Permissions on this target</h4>
                <ul className="divide-y divide-white/[0.05] overflow-hidden rounded-xl border border-white/[0.07]">
                  {scopes.map((scope) => {
                    const granted = authorization.scopes.includes(scope.id)
                    const blocked = disabled.includes(scope.id)
                    return (
                      <li key={scope.id} className="flex items-center gap-3 px-3 py-2.5">
                        <Icon name={SCOPE_ICON[scope.id]} size={15} className={granted && !blocked ? 'text-neutral-300' : 'text-neutral-600'} />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2 text-sm text-neutral-200">
                            {scope.label}
                            {scope.risk !== 'standard' && <RiskBadge risk={scope.risk} />}
                          </span>
                          {granted && blocked && (
                            <span className="mt-0.5 block text-[11px] text-amber-300/80">Granted, but switched off in Permissions</span>
                          )}
                        </span>
                        <Switch
                          size="sm"
                          on={granted}
                          label={`${scope.label} on ${targetName(authorization)}`}
                          disabled={!accepted || (saving !== null && saving !== scope.id)}
                          pending={saving === scope.id}
                          onChange={(on) => toggleScope(scope.id, on)}
                        />
                      </li>
                    )
                  })}
                </ul>
              </div>
              <AlwaysAllowRules authorizationId={authorization.id} />
            </>
          ) : (
            <p className="text-xs text-neutral-400">This authorization is no longer valid. Re-authorize it to let the agents work on it again.</p>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-white/[0.06] pt-4">
            {(!active || expiringSoon) && (
              <Button size="sm" variant="secondary" onClick={() => onReauthorize(authorization)} disabled={!accepted}>
                <Icon name="refresh" size={14} />
                Re-authorize
              </Button>
            )}
            <Button size="sm" variant="dangerGhost" onClick={() => onRevoke(authorization)}>
              <Icon name="trash" size={14} />
              Revoke access
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

function TargetsSettings({ onNavigate }) {
  const dispatch = useDispatch()
  const toast = useToast()
  const { policies, account, authorizations } = useSelector((state) => state.consent)
  const [dialog, setDialog] = useState(null) // null | { prefill? }
  const [revoking, setRevoking] = useState(null)
  const [busy, setBusy] = useState(false)
  const accepted = Boolean(account?.accepted)
  const scopes = policies?.scopes || []
  const disabled = account?.disabledCapabilities || []
  const globalAvailable = Boolean(policies?.features?.computerTarget)
  const globalAuthorized = authorizations.some(
    (authorization) => authorization.target.type === 'computer' && authorization.status === 'active',
  )

  const confirmRevoke = async () => {
    setBusy(true)
    const result = await dispatch(revokeTarget(revoking.id))
    setBusy(false)
    if (revokeTarget.fulfilled.match(result)) {
      toast({ tone: 'success', message: `Access to ${targetName(revoking)} was revoked.` })
      setRevoking(null)
    } else {
      toast({ tone: 'error', message: result.payload || 'Could not revoke access.' })
    }
  }

  return (
    <SettingsSection
      title="Targets"
      description="Folders, repositories, hosts and Global access the agents may work on. Each target has its own permissions and lasts 90 days."
      aside={
        <div className="flex flex-wrap gap-2">
          {globalAvailable && !globalAuthorized && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDialog({ prefill: { type: 'computer' } })}
              disabled={!accepted}
            >
              <Icon name="computer" size={14} />
              Authorize Global
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={() => setDialog({})} disabled={!accepted}>
            <Icon name="plus" size={14} />
            Authorize a target
          </Button>
        </div>
      }
    >
      {!accepted && <NeedsPolicies onNavigate={onNavigate} />}

      {authorizations.length === 0 ? (
        <Card>
          <EmptyState
            icon="target"
            title="No targets yet"
            action={accepted && <Button variant="primary" size="sm" onClick={() => setDialog({})}>Authorize your first target</Button>}
          >
            The agents can’t act on anything until you authorize a folder, repository, host or Global access you own or may assess.
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-2">
          {authorizations.map((authorization) => (
            <TargetCard
              key={authorization.id}
              authorization={authorization}
              scopes={scopes}
              disabled={disabled}
              accepted={accepted}
              onRevoke={setRevoking}
              onReauthorize={(a) => setDialog({ prefill: { ...a.target, scopes: a.scopes } })}
            />
          ))}
        </div>
      )}

      <TargetAuthorizationDialog
        open={Boolean(dialog)}
        prefill={dialog?.prefill}
        onClose={() => setDialog(null)}
        onAuthorized={(a) => toast({ tone: 'success', message: `${targetName(a)} is authorized.` })}
      />

      <ConfirmDialog
        open={Boolean(revoking)}
        busy={busy}
        title="Revoke access?"
        message={`The agents will immediately lose access to ${targetName(revoking)}, including any run that is in progress. You can authorize it again later.`}
        confirmLabel="Revoke access"
        onConfirm={confirmRevoke}
        onCancel={() => setRevoking(null)}
      />
    </SettingsSection>
  )
}

export default TargetsSettings
