# Deploying Antral as a free personal server (Windows)

This runs the whole app on your second laptop, reachable from anywhere over a
free HTTPS URL, and **auto-updates every time you `git push`**. Everything below
is free, no credit card required.

```
Internet ──HTTPS──> Cloudflare Tunnel ──> gateway :7000 (on the laptop)
                                           ├── serves the built frontend
                                           └── /api ─> auth :7001
                                                      project :7002
                                                      agent :7003
   data: MongoDB Atlas (free)   sessions: Upstash Redis (free)   login: Firebase (free)
```

One port is exposed (the gateway). Everything else stays on localhost.

---

## 0. One-time: install the tools on the laptop

1. **Node.js LTS** — https://nodejs.org (includes npm)
2. **Git** — https://git-scm.com
3. **PM2** (keeps services running, restarts on crash/reboot):
   ```powershell
   npm install -g pm2 pm2-windows-startup
   pm2-startup install
   ```
4. **Cloudflared** (the free tunnel) — https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/ (get the Windows `cloudflared.exe`)

Clone the repo into a **fixed folder** — the auto-deploy expects one stable
location. The workflow defaults to `C:\antral`:
```powershell
git clone <your-repo-url> C:\antral
cd C:\antral
```

---

## 1. Free backing services

### MongoDB — Atlas free tier (M0, 512 MB)
You likely already have this (your `.env` has `MONGODB_URL`). If not:
create a free M0 cluster at https://www.mongodb.com/atlas, add a database user,
allow access from anywhere (`0.0.0.0/0`) under Network Access, and copy the
connection string.

### Redis — Upstash free tier (no local install)
1. Create a free database at https://upstash.com (10k commands/day free).
2. Copy the **`rediss://…` connection URL**.
3. Put it in `backend/services/auth/.env` and `backend/services/agent/.env` as
   `REDIS_URL=rediss://…` (both services share the same Redis).

### LLM — already free
Groq and Google Gemini both have free tiers and are already supported. Keep your
existing `LLM_PROVIDER` / API key in `backend/services/agent/.env`.

---

## 2. Env files (secrets stay on the laptop, never in git)

Copy your working `.env` files onto the laptop. The key values:

| File | Keys |
|------|------|
| `backend/gateway/.env` | `PORT=7000`, `AUTH_SERVICE=http://localhost:7001`, `AGENT_SERVICE=http://localhost:7003` |
| `backend/services/auth/.env` | `PORT=7001`, `MONGODB_URL`, `REDIS_URL`, Firebase admin keys, SMTP (optional) |
| `backend/services/project/.env` | `PORT=7002`, `MONGODB_URL` |
| `backend/services/agent/.env` | `PORT=7003`, `MONGODB_URL`, `REDIS_URL`, `LLM_PROVIDER`, LLM key, `CLIENT_ORIGIN` |
| `frontend/.env` | the `VITE_FIREBASE_*` values |

> In production the frontend is served from the **same origin** as `/api`, so
> leave `VITE_API_URL` unset — it defaults to `/api`, which the gateway handles.

`CLIENT_ORIGIN` in the agent `.env` should be your public tunnel URL (step 4),
e.g. `https://antral.example.com`.

---

## 3. First run

```powershell
cd C:\antral
powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1
```

This installs deps, builds the frontend to `frontend/dist`, and starts all four
services under PM2. Then make PM2 restart them on reboot:
```powershell
pm2 save
```

Check it locally: open `http://localhost:7000` in a browser on the laptop. You
should see the app (not the "Hello from gateway" JSON).

Useful PM2 commands: `pm2 ls`, `pm2 logs`, `pm2 restart all`, `pm2 stop all`.

---

## 4. Expose it to the internet — Cloudflare Tunnel (free)

A tunnel gives you an HTTPS URL with no port-forwarding and no exposed IP.

```powershell
cloudflared tunnel login                      # opens browser, pick/add a domain
cloudflared tunnel create antral              # creates the tunnel + credentials
cloudflared tunnel route dns antral antral.<your-domain>   # map a hostname
```

Create `C:\Users\<you>\.cloudflared\config.yml`:
```yaml
tunnel: antral
credentials-file: C:\Users\<you>\.cloudflared\<tunnel-id>.json
ingress:
  - hostname: antral.<your-domain>
    service: http://localhost:7000
  - service: http_status:404
```

Run it as a service so it survives reboots:
```powershell
cloudflared service install
```

Now `https://antral.<your-domain>` reaches your laptop.

> No domain? Cloudflare tunnels can also give a temporary
> `https://<random>.trycloudflare.com` URL via `cloudflared tunnel --url http://localhost:7000`
> — fine for quick testing, but the URL changes each run.

### Firebase: allow the new domain
In the Firebase console → Authentication → Settings → **Authorized domains**,
add `antral.<your-domain>`. Otherwise login popups are blocked. Also set
`CLIENT_ORIGIN` in the agent `.env` to that URL and `pm2 restart antral-agent`.

---

## 5. Auto-deploy on every push (free, via GitHub self-hosted runner)

This makes the laptop rebuild and restart whenever you push to `main`.

1. In GitHub: repo → **Settings → Actions → Runners → New self-hosted runner →
   Windows**. Follow the shown commands on the laptop to download & configure it.
2. When it asks for **labels**, add: `antral` (so the labels are
   `self-hosted, windows, antral` — matching `.github/workflows/deploy.yml`).
3. Install it as a service so it's always listening:
   ```powershell
   cd C:\actions-runner   # wherever you unpacked it
   .\svc.sh install       # or: .\run.cmd to test in foreground first
   ```
4. Confirm `ANTRAL_DIR` in `.github/workflows/deploy.yml` matches your clone
   path (`C:\antral` by default).

Now: **`git push` → GitHub triggers the runner → `deploy.ps1` pulls, builds,
`pm2 reload` → the live site updates.** Watch progress in the repo's **Actions**
tab. You can also trigger a deploy by hand there (workflow_dispatch).

---

## Security notes (important for this app)

- The agent runs shell/file commands. On a server those run **on the laptop**.
  The PM2 config deliberately does **not** enable `ANTRAL_LOCAL_DESKTOP`, so the
  "Global (This PC)" target stays off on the server.
- Keep Firebase login as the gate. Don't share the tunnel URL publicly.
- Only the gateway port is exposed; keep `MONGODB_URL`/`REDIS_URL`/LLM keys out
  of git (they live only in the `.env` files on the laptop).
- Consider adding Cloudflare Access (free for up to 50 users) in front of the
  hostname for an extra login layer if others can reach the URL.

---

## Daily use

- Push code → it deploys automatically.
- `pm2 logs` to watch, `pm2 restart all` to bounce, `pm2 ls` for status.
- Reboot-safe: `pm2 save` (done in deploy) + `pm2-startup` + cloudflared service.
