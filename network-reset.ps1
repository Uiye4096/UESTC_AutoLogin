param(
    [switch]$RestartExplorer,
    [switch]$Full,
    [switch]$SkipRouteCleanup
)

$ErrorActionPreference = 'Stop'

function Stop-IfRunning {
    param([string[]]$Names)

    foreach ($name in $Names) {
        Get-Process -Name $name -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    }
}

Write-Host 'Stopping Verge / Tailscale processes...'
Stop-IfRunning -Names @(
    'verge',
    'Verge',
    'clash-verge',
    'clash-verge-service',
    'verge-mihomo',
    'tailscale',
    'Tailscale',
    'tailscale-ipn',
    'tailscaled'
)

Write-Host 'Resetting proxy and DNS...'
netsh winhttp reset proxy | Out-Null
reg add 'HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings' /v ProxyEnable /t REG_DWORD /d 0 /f | Out-Null
reg delete 'HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings' /v ProxyServer /f | Out-Null
reg delete 'HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings' /v AutoConfigURL /f | Out-Null
ipconfig /flushdns | Out-Null

if (-not $SkipRouteCleanup) {
    Write-Host 'Removing known proxy tunnel default routes...'
    route delete 0.0.0.0 mask 0.0.0.0 198.18.0.2 2>$null | Out-Null
    route delete ::/0 fdfe:dcba:9876::2 2>$null | Out-Null

    $guard = Join-Path $PSScriptRoot 'network-guard.ps1'
    if (Test-Path $guard) {
        powershell.exe -NoProfile -ExecutionPolicy Bypass -File $guard -Quiet | Out-Null
    }
}

netsh interface ip delete arpcache | Out-Null

if ($Full) {
    Write-Host 'Renewing network configuration...'
    ipconfig /release | Out-Null
    ipconfig /renew | Out-Null
}

if ($RestartExplorer) {
    Write-Host 'Restarting Explorer...'
    Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
    Start-Process explorer.exe
}

Write-Host 'Done.'
