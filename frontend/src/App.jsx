import { useCallback, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../utils/firebase.js'
import { getProfile } from '../utils/emailAuth.js'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import ProfileSetup from './pages/ProfileSetup.jsx'

function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [profile, setProfile] = useState(null)
  const [profileStatus, setProfileStatus] = useState('loading')
  const [profileError, setProfileError] = useState(null)
  const [reloadProfile, setReloadProfile] = useState(0)

  useEffect(() => {
    let requestId = 0
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const currentRequest = ++requestId
      setUser(currentUser)
      setChecking(false)
      setProfile(null)
      setProfileError(null)

      if (!currentUser) {
        setProfileStatus('signed-out')
        return
      }

      setProfileStatus('loading')
      try {
        const { profile: savedProfile } = await getProfile(await currentUser.getIdToken())
        if (requestId === currentRequest) {
          setProfile(savedProfile)
          setProfileStatus(savedProfile ? 'ready' : 'setup')
        }
      } catch (error) {
        if (requestId === currentRequest) {
          setProfileError(error.message)
          setProfileStatus('error')
        }
      }
    })

    return () => {
      requestId += 1
      unsubscribe()
    }
  }, [reloadProfile])

  const retryProfile = useCallback(() => {
    setReloadProfile((value) => value + 1)
  }, [])

  const handleProfileComplete = (savedProfile) => {
    setProfile(savedProfile)
    setProfileStatus('ready')
  }

  if (checking) {
    return <div className="min-h-screen bg-[#08080b]" />
  }

  if (!user) return <Login />

  if (profileStatus === 'loading') {
    return (
      <main className="grid min-h-screen place-items-center bg-[#05050a] text-white" aria-label="Loading your profile">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-indigo-300" />
      </main>
    )
  }

  if (profileStatus === 'error' || profileStatus === 'setup') {
    return (
      <ProfileSetup
        user={user}
        loadingError={profileError}
        onRetry={retryProfile}
        onComplete={handleProfileComplete}
      />
    )
  }

  return <Home user={user} profile={profile} />
}

export default App
