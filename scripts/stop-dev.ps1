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

function Invoke-Native {
    # Prints native-command output as plain text instead of PowerShell's red
    # "NativeCommandError" formatting for stderr, which Docker uses for
    # routine status text even on success.
    param([Parameter(Mandatory)][ScriptBlock]$Command)
    & $Command 2>&1 | ForEach-Object { Write-Host $_ }
    return $LASTEXITCODE
}

if ($Wipe) {
    Write-Host "Stopping Postgres and deleting its data volume..." -ForegroundColor Yellow
    $exitCode = Invoke-Native { docker compose down -v }
} else {
    Write-Host "Stopping Postgres (data preserved)..." -ForegroundColor Cyan
    $exitCode = Invoke-Native { docker compose stop db }
}
if ($exitCode -ne 0) {
    Write-Host "docker compose reported a non-zero exit code ($exitCode) - check the output above." -ForegroundColor Yellow
}
