import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Icon from '../ui/Icon.jsx'
import { Button, Card, ConfirmDialog, Spinner } from '../ui/primitives.jsx'
import { useToast } from '../ui/toast.js'
import PolicyDocument from '../PolicyDocument.jsx'
import { acceptAccount, withdrawAccount } from '../../store/consentSlice.js'
import { SettingsSection } from './SettingsSection.jsx'

// Account-level policies: read, accept, or withdraw. Accepting is what lets
// the agents run at all; it lives here instead of blocking the whole app.
function PoliciesSettings() {
  const dispatch = useDispatch()
  const toast = useToast()
  const { policies, account, accepting, withdrawing } = useSelector((state) => state.consent)
  const documents = policies?.accountDocuments || []
  const missing = account?.missing || []
  const accepted = Boolean(account?.accepted)
  const updated = !accepted && account?.status === 'active' && missing.length < documents.length
  const [activeId, setActiveId] = useState(null)
  const [agreed, setAgreed] = useState(false)
  const [confirmWithdraw, setConfirmWithdraw] = useState(false)

  const doc = documents.find((d) => d.id === activeId) || documents.find((d) => missing.includes(d.id)) || documents[0]

  const accept = async () => {
    const result = await dispatch(acceptAccount())
    if (acceptAccount.fulfilled.match(result)) {
      setAgreed(false)
      toast({ tone: 'success', message: 'Thanks. The agents are ready when you are.' })
    } else {
      toast({ tone: 'error', message: result.payload || 'Could not record your acceptance.' })
    }
  }

  const withdraw = async () => {
    const result = await dispatch(withdrawAccount())
    setConfirmWithdraw(false)
    if (withdrawAccount.fulfilled.match(result)) {
      toast({ message: 'Consent withdrawn. The agents are stopped until you accept again.' })
    } else {
      toast({ tone: 'error', message: result.payload || 'Could not withdraw consent.' })
    }
  }

  return (
    <SettingsSection
      title="Privacy & policies"
      description="The terms the agents operate under. Nothing runs on your code or systems until you accept them."
    >
      <Card tone={accepted ? 'good' : 'warn'} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
        <Icon name={accepted ? 'shieldCheck' : 'alert'} size={20} className={accepted ? 'text-emerald-300' : 'text-amber-300'} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">
            {accepted ? 'You’ve accepted the current policies' : updated ? 'The policies were updated' : 'Action needed'}
          </p>
          <p className="text-xs text-neutral-400">
            {accepted
              ? 'The agents may work on the targets you authorize.'
              : updated
                ? 'Please review the changes and accept them to keep using the agents.'
                : 'Read and accept the policies below to start using the agents.'}
          </p>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex gap-1 overflow-x-auto border-b border-white/[0.07] px-2 pt-2" role="tablist" aria-label="Policies">
          {documents.map((d) => {
            const selected = d.id === doc?.id
            return (
              <button
                key={d.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveId(d.id)}
                className={`relative flex shrink-0 items-center gap-2 rounded-t-lg px-3 py-2.5 text-xs transition ${
                  selected ? 'text-white' : 'text-neutral-500 hover:text-neutral-200'
                }`}
              >
                {d.title}
                {missing.includes(d.id) && account?.status === 'active' && (
                  <span className="rounded-full bg-amber-500/20 px-1.5 text-[10px] text-amber-200">Updated</span>
                )}
                {selected && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-indigo-400" />}
              </button>
            )
          })}
        </div>
        {doc ? (
          <div role="tabpanel" className="max-h-[22rem] overflow-y-auto px-5 py-5">
            <PolicyDocument document={doc} />
            <p className="mt-6 text-[11px] text-neutral-600">
              Version {doc.version}
              {doc.effectiveDate && ` · effective ${doc.effectiveDate}`}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-5 py-6 text-sm text-neutral-500">
            <Spinner size={14} /> Loading policies…
          </div>
        )}
      </Card>

      {!accepted ? (
        <Card className="space-y-4 px-5 py-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-neutral-300">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-indigo-500"
            />
            <span>
              I have read and agree to the Terms of Service, Privacy Policy and Acceptable Use Policy, and I will only use
              Antral on systems I own or am authorized to test.
            </span>
          </label>
          <div className="flex justify-end">
            <Button variant="primary" onClick={accept} disabled={!agreed || accepting || !documents.length}>
              {accepting && <Spinner size={12} />}
              {accepting ? 'Recording…' : 'Agree and continue'}
            </Button>
          </div>
        </Card>
      ) : (
        <Card tone="danger" className="flex flex-wrap items-center gap-3 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white">Withdraw consent</p>
            <p className="mt-0.5 text-xs leading-5 text-neutral-500">
              Stops all agent activity on your account. Your targets and history are kept, and you can accept again later.
            </p>
          </div>
          <Button variant="dangerGhost" size="sm" onClick={() => setConfirmWithdraw(true)}>
            Withdraw
          </Button>
        </Card>
      )}

      <ConfirmDialog
        open={confirmWithdraw}
        busy={withdrawing}
        title="Withdraw consent?"
        message="The agents will stop working on all of your targets, including any run in progress, until you accept the policies again."
        confirmLabel="Withdraw consent"
        onConfirm={withdraw}
        onCancel={() => setConfirmWithdraw(false)}
      />
    </SettingsSection>
  )
}

export default PoliciesSettings
