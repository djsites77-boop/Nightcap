#Requires -Version 5.1
<#
.SYNOPSIS
    Stops the local Postgres container started by start-dev.ps1.
    Data persists in the nightcap_pgdata Docker volume between runs.

.PARAMETER Wipe
    Also delete the Postgres data volume (fresh database next start).
#>
param(
    [switch]$Wipe
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if ($Wipe) {
    Write-Host "Stopping Postgres and deleting its data volume..." -ForegroundColor Yellow
    docker compose down -v
} else {
    Write-Host "Stopping Postgres (data preserved)..." -ForegroundColor Cyan
    docker compose stop db
}
