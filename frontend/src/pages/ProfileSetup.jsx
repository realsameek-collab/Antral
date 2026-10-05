import { useState } from 'react'
import { saveProfile } from '../../utils/emailAuth.js'
import AntralLogo from '../components/AntralLogo.jsx'

const today = new Date().toISOString().slice(0, 10)

function ProfileSetup({ user, loadingError, onRetry, onComplete }) {
  const [step, setStep] = useState('name')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const handleNameSubmit = (event) => {
    event.preventDefault()
    if (!firstName.trim()) {
      setError('Please enter your first name.')
      return
    }
    setError('')
    setStep('birthday')
  }

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setPending(true)
    try {
      const { profile } = await saveProfile(await user.getIdToken(), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth,
      })
      onComplete(profile)
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setPending(false)
    }
  }

  const inputClass =
    'h-12 w-full rounded-lg border border-white/15 bg-transparent px-4 text-[15px] text-white outline-none transition placeholder:text-neutral-500 focus:border-indigo-300'

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#08080b] px-6 py-12 text-white">
      <div className="w-full max-w-[360px]">
        <header className="mb-14 flex flex-col items-center gap-3">
          <AntralLogo size={48} />
          <span className="text-lg font-semibold tracking-[0.24em] text-white">ANTRAL</span>
        </header>

        {loadingError ? (
          <section className="text-center" aria-labelledby="profile-error-title">
            <h1 id="profile-error-title" className="text-xl font-medium">Couldn’t load your profile</h1>
            <p role="alert" className="mt-3 text-sm leading-relaxed text-neutral-400">{loadingError}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-6 text-sm text-indigo-200 underline-offset-4 hover:underline"
            >
              Try again
            </button>
          </section>
        ) : (
          <section aria-labelledby="profile-title">
            <p className="mb-3 text-center text-xs font-medium tracking-[0.16em] text-neutral-500">
              {step === 'name' ? 'STEP 1 OF 2' : 'STEP 2 OF 2'}
            </p>

            {step === 'name' ? (
              <div key="name-step" className="step-in">
                <h1 id="profile-title" className="text-center text-2xl font-medium tracking-tight">
                  What’s your name?
                </h1>
                <p className="mb-8 mt-2 text-center text-sm text-neutral-400">
                  Enter the name you’d like us to use.
                </p>
                <form onSubmit={handleNameSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="first-name" className="mb-2 block text-sm text-neutral-300">
                      First name
                    </label>
                    <input
                      autoFocus
                      id="first-name"
                      name="given-name"
                      type="text"
                      autoComplete="given-name"
                      required
                      maxLength={80}
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      placeholder="First name"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="last-name" className="mb-2 block text-sm text-neutral-300">
                      Last name <span className="text-neutral-500">(optional)</span>
                    </label>
                    <input
                      id="last-name"
                      name="family-name"
                      type="text"
                      autoComplete="family-name"
                      maxLength={80}
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      placeholder="Last name"
                      className={inputClass}
                    />
                  </div>
                  {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
                  <button
                    type="submit"
                    className="h-12 w-full rounded-lg bg-white text-sm font-medium text-[#08080b] transition hover:bg-neutral-200"
                  >
                    Continue
                  </button>
                </form>
              </div>
            ) : (
              <div key="birthday-step" className="step-in">
                <h1 id="profile-title" className="text-center text-2xl font-medium tracking-tight">
                  Your date of birth
                </h1>
                <p className="mb-8 mt-2 text-center text-sm leading-relaxed text-neutral-400">
                  Sign in at any age. Your birthday is kept private.
                </p>
                <form onSubmit={handleProfileSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="date-of-birth" className="mb-2 block text-sm text-neutral-300">
                      Date of birth
                    </label>
                    <input
                      autoFocus
                      id="date-of-birth"
                      name="bday"
                      type="date"
                      autoComplete="bday"
                      required
                      max={today}
                      value={dateOfBirth}
                      onChange={(event) => setDateOfBirth(event.target.value)}
                      className={`${inputClass} [color-scheme:dark]`}
                    />
                  </div>
                  {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
                  <button
                    type="submit"
                    disabled={pending}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-white text-sm font-medium text-[#08080b] transition hover:bg-neutral-200 disabled:cursor-wait disabled:opacity-60"
                  >
                    {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-900/25 border-t-neutral-900" aria-hidden="true" />}
                    {pending ? 'Saving…' : 'Finish'}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setError('')
                      setStep('name')
                    }}
                    className="w-full py-1 text-sm text-neutral-400 transition hover:text-white disabled:opacity-60"
                  >
                    Back
                  </button>
                </form>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  )
}

export default ProfileSetup
