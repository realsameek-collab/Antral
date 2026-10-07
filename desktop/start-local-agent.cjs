const path = require('node:path')

process.env.ANTRAL_LOCAL_DESKTOP = '1'
process.chdir(path.resolve(__dirname, '../backend/services/agent'))

import('../backend/services/agent/index.js').catch((error) => {
  console.error('Could not start the local agent service:', error)
  process.exitCode = 1
})
