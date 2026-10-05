import { useState } from 'react'
import { useSelector } from 'react-redux'
import { signOut } from 'firebase/auth'
import { auth } from '../../../utils/firebase.js'
import Icon from '../ui/Icon.jsx'
import { Button, Card, ConfirmDialog } from '../ui/primitives.jsx'
import { useToast } from '../ui/toast.js'
import { SettingsSection } from './SettingsSection.jsx'

const SHORTCUTS = [
  { keys: ['Enter'], label: 'Send message' },
  { keys: ['Shift', 'Enter'], label: 'New line' },
  { keys: ['Ctrl', 'Shift', 'O'], label: 'New chat' },
  { keys: ['Esc'], label: 'Close a dialog' },
]

function AccountSettings({ initials, userName }) {
  const user = useSelector((state) => state.auth.user)
  const toast = useToast()
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  const logout = async () => {
    setBusy(true)
    try {
      await signOut(auth)
    } catch {
      setBusy(false)
      setConfirm(false)
      toast({ tone: 'error', message: 'Could not sign out. Please try again.' })
    }
  }

  return (
    <SettingsSection title="Account" description="Your profile and session on this device.">
      <Card className="flex flex-wrap items-center gap-4 px-5 py-5">
        {user?.photoURL ? (
          <img src={user.photoURL} alt="" className="h-14 w-14 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-teal-400 to-indigo-500 text-lg font-semibold text-black">
            {initials}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium text-white">{userName}</p>
          <p className="truncate text-sm text-neutral-400">{user?.email}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setConfirm(true)}>
          <Icon name="logout" size={14} />
          Sign out
        </Button>
      </Card>

      <div>
        <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">Keyboard shortcuts</h3>
        <Card className="divide-y divide-white/[0.06]">
          {SHORTCUTS.map((s) => (
            <div key={s.label} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-neutral-300">{s.label}</span>
              <span className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd key={k} className="rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[11px] text-neutral-300">
                    {k}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </Card>
      </div>

      <ConfirmDialog
        open={confirm}
        busy={busy}
        tone="primary"
        title="Sign out?"
        message="Agent runs keep going in the background. You’ll see them again when you sign back in."
        confirmLabel="Sign out"
        onConfirm={logout}
        onCancel={() => setConfirm(false)}
      />
    </SettingsSection>
  )
}

export default AccountSettings
