import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Icon from '../ui/Icon.jsx'
import { Button, Card, ConfirmDialog, RiskBadge, Switch } from '../ui/primitives.jsx'
import { useToast } from '../ui/toast.js'
import { setDisabledCapabilities } from '../../store/consentSlice.js'
import { RISK_GROUP, RISK_ORDER, SCOPE_ICON } from './scopeMeta.js'
import { SettingsSection, NeedsPolicies } from './SettingsSection.jsx'

// Account-wide kill-switches. A capability turned off here is blocked for
// every target, even where it was granted.
function PermissionsSettings({ onNavigate }) {
  const dispatch = useDispatch()
  const toast = useToast()
  const { policies, account, authorizations } = useSelector((state) => state.consent)
  const [pending, setPending] = useState(null) // scope id being saved
  const [confirm, setConfirm] = useState(null) // { kind: 'enable', scope } | { kind: 'all-off' }
  const [busy, setBusy] = useState(false)

  const scopes = policies?.scopes || []
  const disabled = account?.disabledCapabilities || []
  const accepted = Boolean(account?.accepted)
  const activeTargets = authorizations.filter((a) => a.status === 'active')
  const onCount = scopes.filter((s) => !disabled.includes(s.id)).length

  const save = async (next, scopeId) => {
    setPending(scopeId)
    const result = await dispatch(setDisabledCapabilities(next))
    setPending(null)
    if (setDisabledCapabilities.rejected.match(result)) {
      toast({ tone: 'error', message: result.payload?.message || 'Could not update that permission.' })
      return false
    }
    return true
  }

  const toggle = (scope, turnOn) => {
    if (turnOn && scope.risk === 'high') {
      setConfirm({ kind: 'enable', scope })
      return
    }
    const next = turnOn ? disabled.filter((s) => s !== scope.id) : [...new Set([...disabled, scope.id])]
    save(next, scope.id)
  }

  const confirmAction = async () => {
    setBusy(true)
    if (confirm.kind === 'enable') {
      await save(disabled.filter((s) => s !== confirm.scope.id), confirm.scope.id)
    } else {
      const ok = await save(scopes.map((s) => s.id), 'all')
      if (ok) toast({ tone: 'success', message: 'All agent capabilities are paused.' })
    }
    setBusy(false)
    setConfirm(null)
  }

  return (
    <SettingsSection
      title="Permissions"
      description="Decide what the agents are allowed to do. Switching something off here blocks it everywhere, even on targets where you granted it."
      aside={
        accepted && (
          <Button
            variant="dangerGhost"
            size="sm"
            disabled={onCount === 0 || pending !== null}
            onClick={() => setConfirm({ kind: 'all-off' })}
          >
            <Icon name="lock" size={14} />
            Pause everything
          </Button>
        )
      }
    >
      {!accepted && <NeedsPolicies onNavigate={onNavigate} />}

      <Card tone="accent" className="flex items-start gap-3 px-4 py-3.5">
        <Icon name="chat" size={16} className="mt-0.5 text-indigo-300" />
        <p className="text-xs leading-5 text-neutral-300">
          You can also ask in chat, for example <span className="text-white">“turn off PowerShell”</span> or{' '}
          <span className="text-white">“let the agent edit files here”</span>. Turning something off happens right away;
          turning something on always asks you to confirm first.
        </p>
      </Card>

      <div className="flex items-center justify-between px-1 text-xs text-neutral-500">
        <span>
          <span className="font-medium text-neutral-200">{onCount}</span> of {scopes.length} capabilities on
        </span>
        <span>{activeTargets.length} authorized target{activeTargets.length === 1 ? '' : 's'}</span>
      </div>

      {RISK_ORDER.map((risk) => {
        const group = scopes.filter((s) => s.risk === risk)
        if (!group.length) return null
        return (
          <div key={risk}>
            <div className="mb-2 flex items-baseline gap-2 px-1">
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">{RISK_GROUP[risk].title}</h3>
              <span className="text-xs text-neutral-600">{RISK_GROUP[risk].hint}</span>
            </div>
            <Card className="divide-y divide-white/[0.06] overflow-hidden">
              {group.map((scope) => {
                const on = !disabled.includes(scope.id)
                const grantedOn = activeTargets.filter((a) => a.scopes.includes(scope.id)).length
                return (
                  <div key={scope.id} className={`flex items-start gap-3.5 px-4 py-4 transition ${on ? '' : 'bg-black/20'}`}>
                    <span
                      className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition ${
                        on ? 'border-white/10 bg-white/[0.05] text-neutral-200' : 'border-white/5 bg-transparent text-neutral-600'
                      }`}
                    >
                      <Icon name={SCOPE_ICON[scope.id]} size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-sm font-medium ${on ? 'text-white' : 'text-neutral-400'}`}>{scope.label}</span>
                        {risk !== 'standard' && <RiskBadge risk={risk} />}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-neutral-500">{scope.description}</p>
                      <p className="mt-1.5 text-[11px] text-neutral-600">
                        {grantedOn === 0
                          ? 'Not granted on any target yet'
                          : `Granted on ${grantedOn} target${grantedOn === 1 ? '' : 's'}`}
                        {!on && grantedOn > 0 && <span className="text-amber-300/80"> · blocked by this switch</span>}
                      </p>
                    </div>
                    <Switch
                      on={on}
                      label={`${scope.label}: ${on ? 'on' : 'off'}`}
                      disabled={!accepted || (pending !== null && pending !== scope.id)}
                      pending={pending === scope.id}
                      onChange={(value) => toggle(scope, value)}
                    />
                  </div>
                )
              })}
            </Card>
          </div>
        )
      })}

      <ConfirmDialog
        open={Boolean(confirm)}
        busy={busy}
        tone={confirm?.kind === 'enable' ? 'primary' : 'danger'}
        title={confirm?.kind === 'enable' ? `Turn on “${confirm.scope.label}”?` : 'Pause all agent capabilities?'}
        message={
          confirm?.kind === 'enable'
            ? 'This is a high-risk capability: commands run on your machine with your account’s privileges. Any command that isn’t read-only still asks for your approval first.'
            : 'Every capability will be switched off for all targets. Running agents lose access at their next step. You can turn capabilities back on here at any time.'
        }
        confirmLabel={confirm?.kind === 'enable' ? 'Turn on' : 'Pause everything'}
        onConfirm={confirmAction}
        onCancel={() => setConfirm(null)}
      />
    </SettingsSection>
  )
}

export default PermissionsSettings
