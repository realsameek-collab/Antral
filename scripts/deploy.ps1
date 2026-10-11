# Antral deploy script (Windows personal server).
# Pulls the latest code, installs dependencies, rebuilds the frontend, and
# restarts the services with zero downtime. Run it by hand, or let the GitHub
# self-hosted runner call it on every push (see .github/workflows/deploy.yml).
#
#   powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "==> Pulling latest code" -ForegroundColor Cyan
git pull --ff-only

# Install dependencies only where package-lock changed would be ideal, but a
# plain install each time is simple and safe. npm ci needs a lockfile; fall back
# to npm install if one is missing.
function Install-Deps($dir) {
  Write-Host "==> Installing deps: $dir" -ForegroundColor Cyan
  Push-Location (Join-Path $root $dir)
  try {
    if (Test-Path "package-lock.json") { npm ci } else { npm install }
  } finally { Pop-Location }
}

Install-Deps "backend/gateway"
Install-Deps "backend/services/auth"
Install-Deps "backend/services/project"
Install-Deps "backend/services/agent"
Install-Deps "frontend"

Write-Host "==> Building frontend" -ForegroundColor Cyan
Push-Location (Join-Path $root "frontend")
try { npm run build } finally { Pop-Location }

Write-Host "==> Reloading services (PM2)" -ForegroundColor Cyan
# reload = zero-downtime; starts them if not already running.
pm2 reload ecosystem.config.cjs --update-env
if ($LASTEXITCODE -ne 0) {
  Write-Host "reload failed (first run?) — starting fresh" -ForegroundColor Yellow
  pm2 start ecosystem.config.cjs
}
pm2 save

Write-Host "==> Deploy complete" -ForegroundColor Green
