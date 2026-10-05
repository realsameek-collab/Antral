import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import Markdown from './Markdown.jsx'
import {
  answerApproval,
  cancelRun,
  getConversation,
  getRun,
  listConversations,
  listRuns,
  startRun,
} from '../../utils/agentApi.js'

const ACTIVE = ['running', 'awaiting_approval']
const POLL_MS = 1200

const STATUS_BADGE = {
  running: 'bg-indigo-500/15 text-indigo-200',
  awaiting_approval: 'bg-amber-500/15 text-amber-200',
  completed: 'bg-emerald-500/15 text-emerald-200',
  failed: 'bg-rose-500/15 text-rose-200',
  cancelled: 'bg-white/10 text-neutral-300',
  interrupted: 'bg-white/10 text-neutral-300',
}

const STATUS_TEXT = {
  running: 'Working…',
  awaiting_approval: 'Needs your approval',
  completed: 'Done',
  failed: 'Failed',
  cancelled: 'Cancelled',
  interrupted: 'Interrupted',
}

// "edit_file" -> sentence for the Always allow button.
const describeRule = (rule) => {
  if (!rule) return null
  if (rule.startsWith('run_command:')) return `Always allow "${rule.slice(12)}" commands on this target`
  const names = {
    write_file: 'writing files',
    edit_file: 'editing files',
    make_directory: 'creating folders',
    move_path: 'moving files',
  }
  return `Always allow ${names[rule] || rule} on this target`
}

const shortArgs = (args) => {
  if (!args || typeof args !== 'object') return ''
  const s = Object.entries(args)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v.split('\n')[0] : JSON.stringify(v)}`)
    .join(', ')
  return s.length > 140 ? `${s.slice(0, 140)}…` : s
}

const kTokens = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n || 0))

function Step({ step }) {
  switch (step.kind) {
    case 'thought':
      return <p className="text-xs italic text-neutral-400">{step.content}</p>
    case 'tool_call':
      return (
        <p className="font-mono text-xs text-indigo-200">
          → {step.tool}
          <span className="text-neutral-500">({shortArgs(step.args)})</span>
        </p>
      )
    case 'tool_result':
      return (
        <details className="group pl-4">
          <summary className="cursor-pointer list-none text-xs text-neutral-500 hover:text-neutral-300">
            <span className={step.ok ? 'text-emerald-400' : 'text-rose-400'}>{step.ok ? '✓' : '✕'}</span>{' '}
            {step.ok ? 'result' : 'error'}
            {step.durationMs != null && <span className="text-neutral-600"> · {step.durationMs} ms</span>}
            <span className="text-neutral-600 group-open:hidden"> · show</span>
          </summary>
          <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-white/5 bg-black/40 p-2 font-mono text-[11px] text-neutral-300">
            {step.content}
          </pre>
        </details>
      )
    case 'denied':
      return <p className="pl-4 text-xs text-rose-300">✕ {step.content}</p>
    case 'approval_request':
      return <p className="text-xs text-amber-200">⏸ Asked to: {step.content}</p>
    case 'approval':
      return (
        <p className={`pl-4 text-xs ${step.ok ? 'text-emerald-300' : 'text-rose-300'}`}>
          You chose: {step.content.replaceAll('_', ' ')}
        </p>
      )
    case 'context':
      return <p className="text-[11px] text-neutral-500">⧉ {step.content}</p>
    case 'error':
      return <p className="text-xs text-rose-300">{step.content}</p>
    default:
      return null
  }
}

function ApprovalCard({ run, onAnswer, busy }) {
  const a = run.pendingApproval
  const args = a.args || {}
  const preview =
    a.tool === 'edit_file'
      ? `- ${args.oldText ?? ''}\n+ ${args.newText ?? ''}`
      : a.tool === 'write_file'
        ? args.content
        : a.tool === 'run_command'
          ? args.command
          : JSON.stringify(args, null, 2)
  const rule = describeRule(a.rule)

  return (
    <div className="rounded-xl border border-amber-400/30 bg-amber-500/[0.07] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">The agent wants to make a change</p>
      <p className="mt-1 text-sm text-white">{a.summary}</p>
      {preview && (
        <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/40 p-2 font-mono text-[11px] text-neutral-200">
          {preview}
        </pre>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onAnswer('allow_once')}
          className="rounded-full bg-indigo-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
        >
          Allow once
        </button>
        {rule && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onAnswer('allow_always')}
            title={rule}
            className="rounded-full border border-indigo-400/40 bg-indigo-500/10 px-4 py-1.5 text-xs text-indigo-100 hover:bg-indigo-500/20 disabled:opacity-50"
          >
            Always allow
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => onAnswer('decline')}
          className="rounded-full px-4 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
        >
          Decline
        </button>
      </div>
      {rule && <p className="mt-2 text-[11px] text-neutral-500">“Always allow” = {rule.toLowerCase()}.</p>}
    </div>
  )
}

// One request/answer pair in the conversation.
function Turn({ item, live, onAnswer, answering, onCancel }) {
  const [open, setOpen] = useState(false)
  const [steps, setSteps] = useState(null)
  const run = live || item
  const active = ACTIVE.includes(run.status)
  const shownSteps = live ? live.steps : steps

  const toggleSteps = async () => {
    if (!open && !live && !steps) {
      try {
        const { run: full } = await getRun(item._id || item.id)
        setSteps(full.steps)
      } catch {
        setSteps([])
      }
    }
    setOpen((v) => !v)
  }

  return (
    <li className="space-y-3">
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-indigo-500/15 px-4 py-2.5 text-sm text-indigo-50">
        {run.task}
      </div>

      <div className="space-y-3 rounded-2xl rounded-bl-sm border border-white/10 bg-white/[0.02] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${STATUS_BADGE[run.status] || ''}`}>
            {STATUS_TEXT[run.status] || run.status}
          </span>
          {active && <span className="h-3 w-3 animate-spin rounded-full border border-white/20 border-t-indigo-300" />}
          <span className="flex-1" />
          {run.contextLimit > 0 && (
            <span className="text-[10px] text-neutral-500" title="Context window used by the last model call">
              context {kTokens(run.contextTokensUsed)} / {kTokens(run.contextLimit)}
            </span>
          )}
          {active && (
            <button type="button" onClick={onCancel} className="rounded-full px-2 py-0.5 text-[11px] text-rose-300 hover:bg-rose-500/10">
              Stop
            </button>
          )}
          {!live && (
            <button type="button" onClick={toggleSteps} className="text-[11px] text-neutral-500 hover:text-neutral-300">
              {open ? 'Hide steps' : 'Show steps'}
            </button>
          )}
        </div>

        {(live || open) && shownSteps?.length > 0 && (
          <div className="space-y-1.5 border-l border-white/10 pl-3">
            {shownSteps
              .filter((s) => s.kind !== 'final')
              .map((s, i) => (
                <Step key={i} step={s} />
              ))}
          </div>
        )}

        {live?.status === 'awaiting_approval' && live.pendingApproval && (
          <ApprovalCard run={live} onAnswer={onAnswer} busy={answering} />
        )}

        {run.result && <Markdown text={run.result} />}
        {run.error && !run.result && <p className="text-sm text-rose-300">{run.error}</p>}
      </div>
    </li>
  )
}

// Chat-style console for the agent team: pick an authorized target, give a
// task, watch the agent work in the background, and answer approval requests.
function AgentConsole() {
  const authorizations = useSelector((state) => state.consent.authorizations)
  const targets = useMemo(() => authorizations.filter((a) => a.status === 'active'), [authorizations])

  const [targetId, setTargetId] = useState('')
  const [conversationId, setConversationId] = useState(null)
  const [thread, setThread] = useState([]) // runs in this conversation (summary fields)
  const [liveRun, setLiveRun] = useState(null) // full run being watched
  const [conversations, setConversations] = useState([])
  const [task, setTask] = useState('')
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)
  const [answering, setAnswering] = useState(false)
  const bottomRef = useRef(null)

  // Default to the first target until the user picks one.
  const selected = targets.find((a) => a.id === targetId) || targets[0] || null

  const refreshConversations = useCallback(() => {
    listConversations()
      .then(({ conversations: list }) => setConversations(list))
      .catch(() => {})
  }, [])

  const openConversation = useCallback(
    async (id) => {
      setError(null)
      try {
        const { conversation, runs } = await getConversation(id)
        setConversationId(conversation.id)
        setThread(runs)
        const match = targets.find(
          (a) => a.target.type === conversation.target.type && a.target.identifier === conversation.target.identifier,
        )
        if (match) setTargetId(match.id)
        const active = runs.find((r) => ACTIVE.includes(r.status))
        setLiveRun(active ? (await getRun(active._id)).run : null)
      } catch (e) {
        setError(e.message)
      }
    },
    [targets],
  )

  // On load: list chats, and reattach to a run still working in the background.
  useEffect(() => {
    refreshConversations()
    listRuns()
      .then(({ runs }) => {
        const active = runs.find((r) => ACTIVE.includes(r.status))
        if (active?.conversationId) openConversation(active.conversationId)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Poll the live run until it finishes.
  const liveId = liveRun?._id
  const liveActive = liveRun && ACTIVE.includes(liveRun.status)
  useEffect(() => {
    if (!liveId || !liveActive) return undefined
    const timer = setInterval(async () => {
      try {
        const { run } = await getRun(liveId)
        setLiveRun(run)
        if (!ACTIVE.includes(run.status)) {
          setThread((t) => t.map((r) => (r._id === run._id ? run : r)))
          refreshConversations()
        }
      } catch {
        // keep polling; transient errors are fine
      }
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [liveId, liveActive, refreshConversations])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [thread.length, liveRun?.steps?.length, liveRun?.status])

  const send = async (e) => {
    e.preventDefault()
    const text = task.trim()
    if (!text || !selected || sending) return
    setSending(true)
    setError(null)
    try {
      const { run } = await startRun({
        target: { type: selected.target.type, identifier: selected.target.identifier },
        task: text,
        conversationId: conversationId || undefined,
      })
      setConversationId(run.conversationId)
      const { run: full } = await getRun(run.id)
      setThread((t) => [...t, full])
      setLiveRun(full)
      setTask('')
      refreshConversations()
    } catch (err) {
      const missing = err.payload?.missingScopes || err.payload?.disabledScopes
      setError(missing ? `${err.message} (${missing.join(', ')})` : err.message)
    } finally {
      setSending(false)
    }
  }

  const onAnswer = async (decision) => {
    if (!liveRun?.pendingApproval) return
    setAnswering(true)
    try {
      await answerApproval(liveRun._id, liveRun.pendingApproval.id, decision)
      setLiveRun((r) => ({ ...r, status: 'running', pendingApproval: null }))
    } catch (err) {
      setError(err.message)
    } finally {
      setAnswering(false)
    }
  }

  const onCancel = async () => {
    if (!liveRun) return
    try {
      await cancelRun(liveRun._id)
    } catch (err) {
      setError(err.message)
    }
  }

  const newChat = () => {
    setConversationId(null)
    setThread([])
    setLiveRun(null)
    setError(null)
  }

  const busy = Boolean(liveActive) || sending

  return (
    <section className="w-full max-w-3xl text-left" aria-label="Agent console">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-sm font-semibold tracking-wide text-white">Agent</h2>
        {conversations.length > 0 && (
          <select
            value={conversationId || ''}
            onChange={(e) => (e.target.value ? openConversation(e.target.value) : newChat())}
            className="max-w-[16rem] rounded-full border border-white/10 bg-[#101015] px-3 py-1.5 text-xs text-neutral-300"
            aria-label="Recent chats"
          >
            <option value="">Recent chats…</option>
            {conversations.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title.slice(0, 60)}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={newChat}
          className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/5"
        >
          New chat
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.015] p-4">
        {targets.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-500">
            Authorize a target below (a local folder or a GitHub repo) to start working with the agents.
          </p>
        ) : (
          <>
            <label className="mb-4 flex items-center gap-2 text-xs text-neutral-400">
              Target
              <select
                value={selected?.id || ''}
                onChange={(e) => {
                  setTargetId(e.target.value)
                  newChat()
                }}
                disabled={Boolean(conversationId)}
                title={conversationId ? 'A chat stays on one target. Start a new chat to switch.' : ''}
                className="flex-1 truncate rounded-lg border border-white/10 bg-[#101015] px-2 py-1.5 text-xs text-white disabled:opacity-70"
              >
                {targets.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.target.type}] {a.target.label || a.target.identifier}
                  </option>
                ))}
              </select>
            </label>

            {thread.length > 0 && (
              <ul className="mb-4 max-h-[60vh] space-y-5 overflow-y-auto pr-1">
                {thread.map((item) => (
                  <Turn
                    key={item._id}
                    item={item}
                    live={liveRun && liveRun._id === item._id ? liveRun : null}
                    onAnswer={onAnswer}
                    answering={answering}
                    onCancel={onCancel}
                  />
                ))}
                <li ref={bottomRef} />
              </ul>
            )}

            <form onSubmit={send} className="flex items-end gap-2">
              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) send(e)
                }}
                rows={2}
                maxLength={4000}
                placeholder={
                  conversationId
                    ? 'Follow up…'
                    : 'e.g. "Scan this project for hard-coded secrets and vulnerable dependencies"'
                }
                className="flex-1 resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:border-indigo-400/50 focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy || !task.trim()}
                className="rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-40"
              >
                {sending ? '…' : 'Send'}
              </button>
            </form>
            {busy && !sending && (
              <p className="mt-2 text-[11px] text-neutral-500">
                The agent is working in the background. You can leave this page and come back.
              </p>
            )}
          </>
        )}

        {error && <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</p>}
      </div>
    </section>
  )
}

export default AgentConsole
