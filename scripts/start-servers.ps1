#Requires -Version 5.1
<#
.SYNOPSIS
    Starts every piece of Nightcap's dev stack, each in its own dedicated,
    clearly-named PowerShell window: Postgres (Docker logs), the Next.js app,
    and optionally Prisma Studio.

.PARAMETER Seed
    Also seed the database before starting (safe to run once on empty data).

.PARAMETER WithStudio
    Also open a window running Prisma Studio (DB browser) at http://localhost:5555.

.EXAMPLE
    .\scripts\start-servers.ps1 -Seed

.EXAMPLE
    .\scripts\start-servers.ps1 -WithStudio
#>
param(
    [switch]$Seed,
    [switch]$WithStudio
)

# Deliberately NOT $ErrorActionPreference = "Stop": Docker/git/pnpm routinely
# write normal status text to stderr, and with that preference set, Windows
# PowerShell 5.1 treats any stderr line from a native command as a fatal
# error and aborts the whole script even though the command succeeded. Every
# native call below is followed by an explicit $LASTEXITCODE check instead,
# which reflects the command's *actual* success/failure.
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Assert-Command($name, $hint) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Error "$name is not on PATH. $hint"
        exit 1
    }
}

function Invoke-Native {
    # Runs a native command and prints its output as plain text instead of
    # letting PowerShell render stderr lines in red "NativeCommandError"
    # blocks - Docker/pnpm/Prisma all write routine status text to stderr,
    # which looks alarming even on success. Returns the real exit code.
    param([Parameter(Mandatory)][ScriptBlock]$Command)
    & $Command 2>&1 | ForEach-Object { Write-Host $_ }
    return $LASTEXITCODE
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
if ((Invoke-Native { pnpm install }) -ne 0) { exit $LASTEXITCODE }

Write-Host "-- Starting Postgres container (host port 4500) --" -ForegroundColor Cyan
if ((Invoke-Native { docker compose up -d db }) -ne 0) { exit $LASTEXITCODE }

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
Write-Host "   Postgres is up." -ForegroundColor Green

Write-Host "-- Applying database migrations --" -ForegroundColor Cyan
if ((Invoke-Native { pnpm exec prisma migrate deploy }) -ne 0) { exit $LASTEXITCODE }

if ($Seed) {
    Write-Host "-- Seeding demo data --" -ForegroundColor Cyan
    if ((Invoke-Native { pnpm db:seed }) -ne 0) { exit $LASTEXITCODE }
}

Write-Host "-- Opening dedicated server windows --" -ForegroundColor Cyan

Start-NamedWindow "Nightcap - Postgres (Docker logs, port 4500)" "docker compose logs -f db"
Start-Sleep -Seconds 1

Start-NamedWindow "Nightcap - Next.js App (http://localhost:3500)" "pnpm dev"
Start-Sleep -Seconds 1

if ($WithStudio) {
    Start-NamedWindow "Nightcap - Prisma Studio (http://localhost:5555)" "pnpm db:studio"
}

Write-Host ""
Write-Host "Launched:" -ForegroundColor Green
Write-Host "  - Nightcap - Postgres (Docker logs, port 4500)"
Write-Host "  - Nightcap - Next.js App (http://localhost:3500)"
if ($WithStudio) { Write-Host "  - Nightcap - Prisma Studio (http://localhost:5555)" }
Write-Host ""
Write-Host "Closing the Postgres log window does NOT stop the container (it's just tailing logs)." -ForegroundColor DarkGray
Write-Host "Run .\scripts\stop-servers.ps1 to close every window and stop Postgres in one step." -ForegroundColor DarkGray
