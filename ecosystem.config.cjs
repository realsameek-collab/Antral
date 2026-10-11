// PM2 process definitions for running Antral as a always-on personal server.
//
//   pm2 start ecosystem.config.cjs      # start all services
//   pm2 reload ecosystem.config.cjs     # zero-downtime restart (used on deploy)
//   pm2 save                            # remember the process list across reboots
//   pm2 logs                            # tail all logs
//
// Each service reads its own backend/**/.env (via dotenv), so secrets stay in
// those files — not here. The gateway additionally serves the built frontend
// (frontend/dist) and the /api routes, so it is the only port that needs to be
// exposed (through Cloudflare Tunnel).
const path = require("node:path")
const dir = (...p) => path.join(__dirname, ...p)

module.exports = {
  apps: [
    {
      name: "antral-auth",
      cwd: dir("backend", "services", "auth"),
      script: "index.js",
      interpreter: "node",
      autorestart: true,
      max_restarts: 10,
    },
    {
      name: "antral-project",
      cwd: dir("backend", "services", "project"),
      script: "index.js",
      interpreter: "node",
      autorestart: true,
      max_restarts: 10,
    },
    {
      name: "antral-agent",
      cwd: dir("backend", "services", "agent"),
      script: "index.js",
      interpreter: "node",
      autorestart: true,
      max_restarts: 10,
      // Server mode: do NOT set ANTRAL_LOCAL_DESKTOP here. "Global (This PC)"
      // would run commands on the server itself, which you don't want exposed.
    },
    {
      name: "antral-gateway",
      cwd: dir("backend", "gateway"),
      script: "index.js",
      interpreter: "node",
      autorestart: true,
      max_restarts: 10,
      env: {
        // Serve the built frontend + /api from this one port.
        SERVE_FRONTEND: "1",
      },
    },
  ],
}
