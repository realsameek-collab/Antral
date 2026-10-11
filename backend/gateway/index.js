import express from "express"
import dotenv from "dotenv"
import proxy from "express-http-proxy"
import path from "node:path"
import { fileURLToPath } from "node:url"
dotenv.config()

const port = process.env.PORT
const serveFrontend = process.env.SERVE_FRONTEND === "1"
const authUpstream = process.env.AUTH_SERVICE_URL || process.env.AUTH_SERVICE
const agentUpstream = process.env.AGENT_SERVICE_URL || process.env.AGENT_SERVICE

const app = express()

// In development the Vite proxy strips the /api prefix before the request
// reaches here, so the gateway sees /auth and /agent. In production (one
// origin, no Vite) the gateway also serves the built frontend, and the browser
// calls /api/* directly — so we additionally accept the /api prefix. Mounting
// at "/api/auth" makes Express strip the whole prefix, leaving the same path
// the "/auth" mount produces, so both forward identically.
const mountProxies = (prefix) => {
  app.use(`${prefix}/auth`, proxy(authUpstream))
  app.use(`${prefix}/agent`, proxy(agentUpstream))
}
mountProxies("")
if (serveFrontend) mountProxies("/api")

if (serveFrontend) {
  const dist = path.resolve(fileURLToPath(new URL("../../frontend/dist", import.meta.url)))
  app.use(express.static(dist))
  // SPA fallback: any GET that wasn't an API call or a real file returns the
  // app shell so client-side routing works on refresh / deep links.
  app.use((req, res, next) => {
    if (req.method !== "GET") return next()
    res.sendFile(path.join(dist, "index.html"))
  })
} else {
  app.get("/", (_req, res) => res.json({ message: "Hello from gateway" }))
}

const listening = () =>
  console.log(`gateway on port ${port}${serveFrontend ? " (serving frontend + /api)" : ""}`)
if (process.env.ANTRAL_LOCAL_DESKTOP === "1") app.listen(port, "127.0.0.1", listening)
else app.listen(port, listening)
