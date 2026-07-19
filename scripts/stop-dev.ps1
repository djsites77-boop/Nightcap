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

# No $ErrorActionPreference = "Stop" here on purpose - Docker writes routine
# status text to stderr, which Windows PowerShell 5.1 would otherwise treat
# as a fatal error and abort the script even on success.
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if ($Wipe) {
    Write-Host "Stopping Postgres and deleting its data volume..." -ForegroundColor Yellow
    docker compose down -v
} else {
    Write-Host "Stopping Postgres (data preserved)..." -ForegroundColor Cyan
    docker compose stop db
}
if ($LASTEXITCODE -ne 0) {
    Write-Host "docker compose reported a non-zero exit code ($LASTEXITCODE) - check the output above." -ForegroundColor Yellow
}
