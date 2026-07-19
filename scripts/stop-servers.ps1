#Requires -Version 5.1
<#
.SYNOPSIS
    Closes every "Nightcap - *" window opened by start-servers.ps1 and stops
    the Postgres container.

.PARAMETER Wipe
    Also delete the Postgres data volume (fresh database next start).
#>
param(
    [switch]$Wipe
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "== Nightcap: stopping dev servers ==" -ForegroundColor Cyan

$windows = Get-Process powershell -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowTitle -like "Nightcap - *" }

if ($windows) {
    foreach ($w in $windows) {
        Write-Host "Closing window: $($w.MainWindowTitle)" -ForegroundColor Yellow
        Stop-Process -Id $w.Id -Force
    }
} else {
    Write-Host "No 'Nightcap - *' windows found open." -ForegroundColor DarkGray
}

if ($Wipe) {
    Write-Host "Stopping Postgres and deleting its data volume..." -ForegroundColor Yellow
    docker compose down -v
} else {
    Write-Host "Stopping Postgres (data preserved)..." -ForegroundColor Cyan
    docker compose stop db
}

Write-Host "Done." -ForegroundColor Green
