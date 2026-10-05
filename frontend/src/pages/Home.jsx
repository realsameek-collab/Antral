import AntralLogo from '../components/AntralLogo.jsx'

function Home({ profile }) {
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ')
  const dateOfBirth = new Date(`${profile.dateOfBirth}T00:00:00`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#08080b] px-6 py-12 text-white">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <header className="mb-16 flex flex-col items-center gap-3">
          <AntralLogo size={56} />
          <span className="text-xl font-semibold tracking-[0.24em] text-white">ANTRAL</span>
        </header>

        <section aria-label="Your profile" className="space-y-3">
          <h1 className="text-3xl font-medium tracking-tight">{name}</h1>
          <p className="text-sm text-neutral-400">{dateOfBirth}</p>
        </section>
      </div>
    </main>
  )
}

export default Home
