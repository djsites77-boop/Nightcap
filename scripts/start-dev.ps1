#Requires -Version 5.1
<#
.SYNOPSIS
    Starts Nightcap for local development on Windows: Postgres via Docker,
    migrations, optional seed data, then the Next.js dev server.

.PARAMETER Seed
    Also run the database seed script (demo host + admin accounts, sample
    properties). Safe to run once; running it again on non-empty data will
    error on unique-constraint conflicts rather than duplicate rows silently.

.EXAMPLE
    .\scripts\start-dev.ps1 -Seed
#>
param(
    [switch]$Seed
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

Write-Host "== Nightcap dev startup ==" -ForegroundColor Cyan

Assert-Command "docker" "Install Docker Desktop: https://www.docker.com/products/docker-desktop/"
Assert-Command "pnpm" "Install pnpm: https://pnpm.io/installation (or: npm install -g pnpm)"

if (-not (Test-Path ".env")) {
    Write-Host "No .env found - copying .env.example. Edit it (especially secrets) before real use." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
}

Write-Host "-- Installing dependencies (pnpm install) --" -ForegroundColor Cyan
if ((Invoke-Native { pnpm install }) -ne 0) { exit $LASTEXITCODE }

Write-Host "-- Starting Postgres (docker compose) on host port 4500 --" -ForegroundColor Cyan
if ((Invoke-Native { docker compose up -d db }) -ne 0) { exit $LASTEXITCODE }

Write-Host "-- Waiting for Postgres to be ready --" -ForegroundColor Cyan
$maxAttempts = 30
$attempt = 0
while ($true) {
    $attempt++
    $healthy = docker inspect --format "{{.State.Health.Status}}" (docker compose ps -q db) 2>$null
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

Write-Host "-- Starting the app on http://localhost:3500 --" -ForegroundColor Cyan
Write-Host "   (Ctrl+C to stop; Postgres keeps running - use scripts\stop-dev.ps1 to stop it too)" -ForegroundColor DarkGray
pnpm dev
