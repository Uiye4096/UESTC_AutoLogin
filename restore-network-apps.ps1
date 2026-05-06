$ErrorActionPreference = 'Continue'

function Stop-IfRunning {
    param([string[]]$Names)

    foreach ($name in $Names) {
        Get-Process -Name $name -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    }
}

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

Start-Sleep -Seconds 2

$candidates = @(
    'E:\Tools\ClashVerge\Clash Verge\clash-verge.exe',
    'C:\Program Files\Tailscale\tailscale-ipn.exe'
)

foreach ($path in $candidates) {
    if (Test-Path $path) {
        Start-Process -FilePath $path -WindowStyle Hidden
    }
}
