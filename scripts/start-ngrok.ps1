#Requires -Version 5.1
<#
.SYNOPSIS
    Opens an ngrok tunnel to the Nightcap dev server on port 3500.

.DESCRIPTION
    Uses the reserved domain nightcap.ngrok.app (rd_3GkUNCoz5E49RmzBVNeE9McnqNx).
    Requires ngrok on PATH and a valid authtoken in your global ngrok config.

    No .env changes needed — keep BETTER_AUTH_URL on localhost. The app accepts
    both http://localhost:3500 and https://nightcap.ngrok.app at the same time.

.EXAMPLE
    .\scripts\start-ngrok.ps1
#>
param(
    [string]$Domain = $(if ($env:NGROK_DOMAIN) { $env:NGROK_DOMAIN } else { "nightcap.ngrok.app" }),
    [int]$Port = 3500
)

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Assert-Command($name, $hint) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Error "$name is not on PATH. $hint"
        exit 1
    }
}

function Start-NamedWindow($title, $command) {
    $escaped = $command.Replace("'", "''")
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "`$Host.UI.RawUI.WindowTitle = '$title'; Set-Location '$repoRoot'; $escaped"
    ) | Out-Null
}

Assert-Command "ngrok" "Install from https://ngrok.com/download and run ngrok config add-authtoken <token>"

$globalConfig = Join-Path $env:LOCALAPPDATA "ngrok\ngrok.yml"
$projectConfig = Join-Path $repoRoot "ngrok.yml"

if (-not (Test-Path $globalConfig)) {
    Write-Error "Global ngrok config not found at $globalConfig. Run: ngrok config add-authtoken <token>"
    exit 1
}

Write-Host "== Nightcap ngrok tunnel ==" -ForegroundColor Cyan
Write-Host "  Public URL : https://$Domain" -ForegroundColor Green
Write-Host "  Local port : $Port" -ForegroundColor Green
Write-Host ""
Write-Host "Use localhost OR ngrok — no .env swap. Keep BETTER_AUTH_URL=http://localhost:3500" -ForegroundColor DarkGray
Write-Host ""

$ngrokCmd = "ngrok start --config `"$globalConfig`" --config `"$projectConfig`" nightcap"
Start-NamedWindow "Nightcap - ngrok (https://$Domain)" $ngrokCmd

Write-Host "Opened ngrok window. Share: https://$Domain" -ForegroundColor Green
