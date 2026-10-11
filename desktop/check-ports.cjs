// Refuses to start Antral when another copy is already running.
//
// The services listen on IPv4 (desktop) or IPv6 (dev), so a second copy can
// start without an "address in use" error — and the window then silently
// talks to the other copy's services. Check both addresses before starting.
const net = require('node:net')

const PORTS = { 5173: 'web', 7000: 'gateway', 7001: 'auth', 7002: 'project', 7003: 'agent' }
const HOSTS = ['127.0.0.1', '::1']

const inUse = (port, host) =>
  new Promise((resolve) => {
    const socket = net.connect({ port, host })
    socket.setTimeout(800)
    socket.once('connect', () => (socket.destroy(), resolve(true)))
    socket.once('timeout', () => (socket.destroy(), resolve(false)))
    socket.once('error', () => resolve(false))
  })

;(async () => {
  const busy = []
  for (const [port, name] of Object.entries(PORTS)) {
    for (const host of HOSTS) {
      if (await inUse(Number(port), host)) {
        busy.push(`${name} (port ${port} on ${host})`)
        break
      }
    }
  }
  if (busy.length) {
    console.error(
      `\nAntral is already running: ${busy.join(', ')}.\n` +
        'Close the other "npm run dev" / "npm run desktop" terminal (Ctrl+C) first, then start again.\n' +
        'Running two copies makes the app talk to the wrong one (e.g. "Global is only available in the desktop app").\n',
    )
    process.exit(1)
  }
})()
