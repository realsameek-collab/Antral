import { useCallback, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../utils/firebase.js'
import { endSession } from '../utils/emailAuth.js'
import { clearProfile, loadProfile } from './store/profileSlice.js'
import { setAuthUser } from './store/authSlice.js'
import { clearConsent } from './store/consentSlice.js'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import ProfileSetup from './pages/ProfileSetup.jsx'
import ConsentGate from './components/ConsentGate.jsx'

function App() {
  const dispatch = useDispatch()
  const authStatus = useSelector((state) => state.auth.status)
  const profile = useSelector((state) => state.profile.profile)
  const profileStatus = useSelector((state) => state.profile.status)
  const profileError = useSelector((state) => state.profile.error)
  const firebaseUser = useRef(null)
  const sessionStarted = useRef(false)

  useEffect(() => {
    let requestId = 0
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      const currentRequest = ++requestId
      firebaseUser.current = currentUser
      dispatch(setAuthUser(currentUser ? {
        uid: currentUser.uid,
        email: currentUser.email,
        photoURL: currentUser.photoURL,
      } : null))

      if (!currentUser) {
        dispatch(clearProfile())
        dispatch(clearConsent())
        if (sessionStarted.current) {
          sessionStarted.current = false
          endSession().catch((error) => console.error('Failed to end login session:', error))
        }
        return
      }

      dispatch(loadProfile(currentUser)).then(() => {
        if (requestId === currentRequest) sessionStarted.current = true
      })
    })

    return () => {
      requestId += 1
      unsubscribe()
    }
  }, [dispatch])

  const retryProfile = useCallback(() => {
    if (firebaseUser.current) dispatch(loadProfile(firebaseUser.current))
  }, [dispatch])

  if (authStatus === 'checking') {
    return <div className="min-h-screen bg-[#08080b]" />
  }

  if (authStatus === 'unauthenticated') return <Login />

  if (profileStatus === 'idle' || profileStatus === 'loading' || profileStatus === 'saving') {
    return (
      <main className="grid min-h-screen place-items-center bg-[#05050a] text-white" aria-label="Loading your profile">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-indigo-300" />
      </main>
    )
  }

  if (profileStatus === 'error' || profileStatus === 'setup') {
    return <ProfileSetup loadingError={profileError} onRetry={retryProfile} />
  }

  return (
    <ConsentGate>
      <Home profile={profile} />
    </ConsentGate>
  )
}

export default App
