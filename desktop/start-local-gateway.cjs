const path = require('node:path')

process.env.ANTRAL_LOCAL_DESKTOP = '1'

// In desktop mode the services bind to 127.0.0.1 only. The gateway's default
// upstreams use "localhost", which on Windows can resolve to ::1 (IPv6) where
// those services are NOT listening — so the gateway would miss the flagged
// agent (or hit a stale dev copy) and PC access would be wrongly rejected.
// Pin the upstreams to 127.0.0.1 so the gateway always reaches them.
process.env.AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:7001'
process.env.AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://127.0.0.1:7003'

process.chdir(path.resolve(__dirname, '../backend/gateway'))

import('../backend/gateway/index.js').catch((error) => {
  console.error('Could not start the local gateway:', error)
  process.exitCode = 1
})
