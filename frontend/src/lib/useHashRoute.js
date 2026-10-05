import { useCallback, useEffect, useState } from 'react'

// Tiny hash router: "#/settings/permissions" -> ['settings', 'permissions'].
// Keeps the current view across reloads and makes the back button work,
// without pulling in a routing library.
const parse = () =>
  window.location.hash
    .replace(/^#\/?/, '')
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent)

export function useHashRoute(fallback = 'dashboard') {
  const [parts, setParts] = useState(parse)

  useEffect(() => {
    const onChange = () => setParts(parse())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const navigate = useCallback((...next) => {
    const hash = `#/${next.filter(Boolean).map(encodeURIComponent).join('/')}`
    if (window.location.hash !== hash) window.location.hash = hash
  }, [])

  return { view: parts[0] || fallback, sub: parts[1] || null, navigate }
}
