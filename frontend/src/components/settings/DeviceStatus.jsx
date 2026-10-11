import { useCallback, useEffect, useState } from 'react'
import Icon from '../ui/Icon.jsx'
import { Button, Card } from '../ui/primitives.jsx'
import { getDeviceStatus } from '../../../utils/agentApi.js'

// Windows automation + Android ADB status, with the diagnosis when something
// is wrong. Same data the agent's android_diagnose tool reports.
const Dot = ({ ok, warn }) => (
  <span className={`h-2 w-2 shrink-0 rounded-full ${ok ? 'bg-emerald-400' : warn ? 'bg-amber-400' : 'bg-rose-400'}`} />
)

function DeviceStatus() {
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [details, setDetails] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setStatus(await getDeviceStatus())
    } catch (e) {
      setError(e.message || 'Could not check devices.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    let live = true
    getDeviceStatus().then(
      (s) => live && setStatus(s),
      (e) => live && setError(e.message || 'Could not check devices.'),
    )
    return () => {
      live = false
    }
  }, [])

  const android = status?.android
  const devices = android?.devices || []

  return (
    <Card className="px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">Connected devices</h3>
        <Button variant="ghost" size="sm" disabled={loading} onClick={load}>
          <Icon name="refresh" size={14} />
          {loading ? 'Checking…' : 'Recheck'}
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
      {status && (
        <ul className="mt-3 space-y-2.5 text-xs">
          <li className="flex items-center gap-2.5">
            <Dot ok={status.windows.available} />
            <Icon name="computer" size={15} className="text-neutral-400" />
            <span className="text-neutral-200">This PC</span>
            <span className="text-neutral-500">
              {status.windows.available ? 'Windows automation available (Global target)' : 'Not a Windows host'}
            </span>
          </li>
          {!android?.adbVersion ? (
            <li className="flex items-start gap-2.5">
              <span className="mt-1"><Dot /></span>
              <Icon name="device" size={15} className="mt-0.5 text-neutral-400" />
              <span className="text-neutral-400">{android?.fix || android?.problem || 'ADB not available.'}</span>
            </li>
          ) : devices.length === 0 ? (
            <li className="flex items-start gap-2.5">
              <span className="mt-1"><Dot warn /></span>
              <Icon name="device" size={15} className="mt-0.5 text-neutral-400" />
              <span className="text-neutral-400">No Android phone connected. {android.fix}</span>
            </li>
          ) : (
            devices.map((d) => (
              <li key={d.serial} className="flex items-start gap-2.5">
                <span className="mt-1"><Dot ok={d.canControl && d.inputAllowed !== false} warn={d.state === 'device'} /></span>
                <Icon name="device" size={15} className="mt-0.5 text-neutral-400" />
                <div className="min-w-0">
                  <span className="text-neutral-200">{d.model ? `${d.manufacturer} ${d.model}` : d.serial}</span>
                  {d.android && <span className="text-neutral-500"> · Android {d.android}</span>}
                  <p className="text-neutral-500">
                    {d.state === 'device' ? (d.canControl ? 'Ready over USB' : 'Connected, but not over USB — control disabled') : d.meaning}
                    {d.state === 'device' && d.screenOn === false && ' · screen off/locked'}
                  </p>
                  {d.inputProblem && <p className="text-amber-300/90">{d.inputProblem}</p>}
                </div>
              </li>
            ))
          )}
        </ul>
      )}
      {status && (
        <button type="button" className="mt-3 text-[11px] text-neutral-500 hover:text-neutral-300" onClick={() => setDetails((v) => !v)}>
          {details ? 'Hide technical details' : 'Show technical details'}
        </button>
      )}
      {details && (
        <pre className="mt-2 max-h-60 overflow-auto rounded-lg bg-black/30 p-2 text-[11px] text-neutral-400">
          {JSON.stringify(status, null, 2)}
        </pre>
      )}
    </Card>
  )
}

export default DeviceStatus
