#Requires -Version 5.1
<#
.SYNOPSIS
    Starts Nightcap's dev stack in dedicated, clearly-named PowerShell windows:
    Postgres (Docker logs), the Next.js app, and optionally Prisma Studio / ngrok.

.PARAMETER Seed
    Also seed the database before starting (safe to run once on empty data).

.PARAMETER WithStudio
    Also open a window running Prisma Studio (DB browser) at http://localhost:5555.

.PARAMETER WithDbLogs
    Deprecated — Postgres logs already open by default. Kept so older commands still work.

.PARAMETER WithNgrok
    Also open an ngrok tunnel window (https://nightcap.ngrok.app -> localhost:3500).
    Works alongside localhost — no .env changes required.

.EXAMPLE
    .\scripts\start-servers.ps1 -Seed

.EXAMPLE
    .\scripts\start-servers.ps1 -WithStudio

.EXAMPLE
    .\scripts\start-servers.ps1 -WithNgrok
#>
param(
    [switch]$Seed,
    [switch]$WithStudio,
    [switch]$WithDbLogs,
    [switch]$WithNgrok
)

# Deliberately NOT $ErrorActionPreference = "Stop": Docker/pnpm/Prisma
# routinely write normal status text to stderr, and with that preference set,
# Windows PowerShell 5.1 treats any stderr line from a native command as a
# fatal error and aborts the whole script even though the command succeeded.
# Native calls go through Invoke-Native, which prints stderr as plain text
# and returns the command's real exit code.
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Assert-Command($name, $hint) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Error "$name is not on PATH. $hint"
        exit 1
    }
}

function Invoke-Native {
    # Prints native-command output as plain text instead of PowerShell's red
    # "NativeCommandError" formatting for stderr, which Docker/pnpm/Prisma
    # use for routine status text even on success. Returns the real exit code.
    param([Parameter(Mandatory)][ScriptBlock]$Command)
    $output = & $Command 2>&1
    $exitCode = $LASTEXITCODE
    foreach ($line in $output) {
        if ($line -is [System.Management.Automation.ErrorRecord]) {
            Write-Host $line.ToString()
        } else {
            Write-Host $line
        }
    }
    return $exitCode
}

function Start-NamedWindow($title, $command) {
    # Sets the window title from inside the new process itself, so the
    # window is identifiable at a glance and by title for scripts/stop-servers.ps1.
    $titledCommand = "`$Host.UI.RawUI.WindowTitle = '$title'; $command"
    Start-Process powershell -ArgumentList @("-NoExit", "-NoProfile", "-Command", $titledCommand) `
        -WorkingDirectory $repoRoot | Out-Null
}

Write-Host "== Nightcap: starting dev servers ==" -ForegroundColor Cyan

Assert-Command "docker" "Install Docker Desktop: https://www.docker.com/products/docker-desktop/"
Assert-Command "pnpm" "Install pnpm: https://pnpm.io/installation (or: npm install -g pnpm)"

if (-not (Test-Path ".env")) {
    Write-Host "No .env found - copying .env.example. Edit it (especially secrets) before real use." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
}

Write-Host "-- Installing dependencies (pnpm install) --" -ForegroundColor Cyan
if ((Invoke-Native { pnpm install }) -ne 0) { exit 1 }

Write-Host "-- Starting Postgres container (host port 4500) --" -ForegroundColor Cyan
if ((Invoke-Native { docker compose up -d db }) -ne 0) { exit 1 }

Write-Host "-- Waiting for Postgres to become healthy --" -ForegroundColor Cyan
$maxAttempts = 30
$attempt = 0
while ($true) {
    $attempt++
    $containerId = docker compose ps -q db
    $healthy = docker inspect --format "{{.State.Health.Status}}" $containerId 2>$null
    if ($healthy -eq "healthy") { break }
    if ($attempt -ge $maxAttempts) {
        Write-Error "Postgres did not become healthy in time. Check: docker compose logs db"
        exit 1
    }
    Start-Sleep -Seconds 2
}
Write-Host "   Postgres is up (background container on port 4500)." -ForegroundColor Green

Write-Host "-- Applying database migrations --" -ForegroundColor Cyan
if ((Invoke-Native { pnpm exec prisma migrate deploy }) -ne 0) { exit 1 }

if ($Seed) {
    Write-Host "-- Seeding demo data --" -ForegroundColor Cyan
    if ((Invoke-Native { pnpm db:seed }) -ne 0) { exit 1 }
}

Write-Host "-- Opening dedicated server windows --" -ForegroundColor Cyan

Start-NamedWindow "Nightcap - Postgres (Docker logs, port 4500)" "docker compose logs -f db"
Start-Sleep -Seconds 1

Start-NamedWindow "Nightcap - Next.js App (http://localhost:3500)" "pnpm dev"
Start-Sleep -Seconds 1

if ($WithStudio) {
    Start-NamedWindow "Nightcap - Prisma Studio (http://localhost:5555)" "pnpm db:studio"
    Start-Sleep -Seconds 1
}

# -WithDbLogs kept for compatibility; Postgres logs already open by default.
if ($WithDbLogs) {
    Write-Host "   (Postgres logs window already opened above)" -ForegroundColor DarkGray
}

if ($WithNgrok) {
    & "$PSScriptRoot\start-ngrok.ps1"
}

Write-Host ""
Write-Host "Launched:" -ForegroundColor Green
Write-Host "  - Nightcap - Postgres (Docker logs, port 4500)"
Write-Host "  - Nightcap - Next.js App (http://localhost:3500)"
if ($WithStudio) { Write-Host "  - Nightcap - Prisma Studio (http://localhost:5555)" }
if ($WithNgrok) { Write-Host "  - Nightcap - ngrok (https://nightcap.ngrok.app)" }
Write-Host ""
Write-Host "Closing the Postgres log window does NOT stop the container (it's just tailing logs)." -ForegroundColor DarkGray
Write-Host "Stop everything with: .\scripts\stop-servers.ps1" -ForegroundColor DarkGray
