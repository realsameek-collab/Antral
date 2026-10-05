import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import AntralLogo from './AntralLogo.jsx'
import PolicyDocument from './PolicyDocument.jsx'
import { loadConsent, acceptAccount } from '../store/consentSlice.js'

function Loading({ label }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#05050a] text-white" aria-label={label}>
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-indigo-300" />
    </main>
  )
}

// Wraps the app: nothing inside renders until the signed-in user has accepted
// the current account-level policies.
function ConsentGate({ children }) {
  const dispatch = useDispatch()
  const { policies, account, status, error, accepting } = useSelector((state) => state.consent)
  const [activeTab, setActiveTab] = useState(0)
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    if (status === 'idle') dispatch(loadConsent())
  }, [status, dispatch])

  if (status === 'idle' || status === 'loading') {
    return <Loading label="Loading policies" />
  }

  if (status === 'error') {
    return (
      <main className="grid min-h-screen place-items-center bg-[#05050a] px-6 text-center text-white">
        <div className="max-w-sm space-y-4">
          <p className="text-sm text-neutral-300">{error}</p>
          <button
            type="button"
            onClick={() => dispatch(loadConsent())}
            className="rounded-full border border-white/15 px-5 py-2 text-sm text-white hover:bg-white/5"
          >
            Try again
          </button>
        </div>
      </main>
    )
  }

  if (account?.accepted) return children

  const documents = policies?.accountDocuments || []
  const doc = documents[activeTab]

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#08080b] px-4 py-10 text-white">
      <div className="flex w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-2xl sm:p-8">
        <header className="mb-5 flex flex-col items-center gap-2 text-center">
          <AntralLogo size={40} />
          <span className="text-sm font-semibold tracking-[0.24em] text-white">ANTRAL</span>
          <h1 className="mt-2 text-xl font-medium tracking-tight">Before you begin</h1>
          <p className="max-w-md text-sm text-neutral-400">
            Antral runs automated security agents that can access your code and systems. Please
            review and accept the following to continue.
          </p>
        </header>

        <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Policies">
          {documents.map((d, i) => (
            <button
              key={d.id}
              type="button"
              role="tab"
              aria-selected={i === activeTab}
              onClick={() => setActiveTab(i)}
              className={`rounded-full px-3 py-1.5 text-xs transition ${
                i === activeTab
                  ? 'bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-400/40'
                  : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
              }`}
            >
              {d.title}
            </button>
          ))}
        </div>

        {doc && (
          <div className="mb-5 h-72 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-5">
            <PolicyDocument document={doc} />
          </div>
        )}

        <label className="mb-4 flex cursor-pointer items-start gap-3 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-indigo-500"
          />
          <span>
            I have read and agree to the Terms of Service, Privacy Policy, and Acceptable Use
            Policy, and I will only use Antral on systems I am authorized to test.
          </span>
        </label>

        {error && <p className="mb-3 text-sm text-rose-300">{error}</p>}

        <button
          type="button"
          disabled={!agreed || accepting}
          onClick={() => dispatch(acceptAccount())}
          className="rounded-full bg-indigo-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {accepting ? 'Recording…' : 'Agree and continue'}
        </button>
      </div>
    </main>
  )
}

export default ConsentGate
