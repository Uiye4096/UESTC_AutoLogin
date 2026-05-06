param(
    [string]$InstallDir = "$env:LOCALAPPDATA\UESTC_AutoLogin",
    [switch]$KeepConfig
)

$ErrorActionPreference = 'Continue'

if (Test-Path (Join-Path $PSScriptRoot 'credential-store.ps1')) {
    . (Join-Path $PSScriptRoot 'credential-store.ps1')
}

Set-Location $env:TEMP

$startup = [Environment]::GetFolderPath('Startup')
$startupShortcut = Join-Path $startup 'Campuswire Network Watcher.lnk'
Remove-Item -LiteralPath $startupShortcut -Force -ErrorAction SilentlyContinue

$programs = [Environment]::GetFolderPath('Programs')
$programFolder = Join-Path $programs 'UESTC AutoLogin'
Remove-Item -LiteralPath $programFolder -Recurse -Force -ErrorAction SilentlyContinue

Get-Process node -ErrorAction SilentlyContinue | Where-Object {
    try {
        $log = Join-Path $env:LOCALAPPDATA 'Campuswire'
        $_.Id -and (Test-Path (Join-Path $log "watcher-node-$($_.Id).log"))
    } catch {
        $false
    }
} | Stop-Process -Force -ErrorAction SilentlyContinue

if (-not $KeepConfig) {
    Remove-CampuswireCredential
}

if ($KeepConfig) {
    Get-ChildItem -Path $InstallDir -Force -ErrorAction SilentlyContinue | Where-Object {
        $_.Name -ne 'campuswire-local.json'
    } | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
} else {
    Remove-Item -LiteralPath $InstallDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host 'UESTC AutoLogin uninstalled.'
