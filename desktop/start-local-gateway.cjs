const path = require('node:path')

process.env.ANTRAL_LOCAL_DESKTOP = '1'
process.chdir(path.resolve(__dirname, '../backend/gateway'))

import('../backend/gateway/index.js').catch((error) => {
  console.error('Could not start the local gateway:', error)
  process.exitCode = 1
})
