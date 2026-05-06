$ErrorActionPreference = 'Continue'

function Section {
    param([string]$Name)
    Write-Host ''
    Write-Host "=== $Name ==="
}

function Try-Run {
    param(
        [string]$Name,
        [scriptblock]$Command
    )

    Section $Name
    try {
        & $Command
    } catch {
        Write-Host "FAILED: $($_.Exception.Message)"
    }
}

Try-Run 'Processes: Clash / Verge / Mihomo / Tailscale' {
    Get-Process | Where-Object { $_.ProcessName -match 'clash|verge|mihomo|tailscale|tail' } |
        Select-Object ProcessName, Id, Path | Format-Table -AutoSize
}

Try-Run 'ipconfig /all' {
    ipconfig /all
}

Try-Run 'IPv4 routes' {
    route print -4
}

Try-Run 'IPv6 routes' {
    route print -6
}

Try-Run 'WinHTTP proxy' {
    netsh winhttp show proxy
}

Try-Run 'User proxy registry' {
    $key = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings'
    Get-ItemProperty -Path $key -Name ProxyEnable, ProxyServer, AutoConfigURL, AutoDetect -ErrorAction SilentlyContinue |
        Select-Object ProxyEnable, ProxyServer, AutoConfigURL, AutoDetect | Format-List
}

Section 'Risk summary'
$route4 = route print -4 | Out-String
$route6 = route print -6 | Out-String
if ($route4 -match '0\.0\.0\.0\s+0\.0\.0\.0\s+198\.18\.0\.2') {
    Write-Host 'RISK: IPv4 default route points to Mihomo/Meta Tunnel gateway 198.18.0.2.'
}
if ($route6 -match '::/0\s+fdfe:dcba:9876::2') {
    Write-Host 'RISK: IPv6 default route points to Mihomo/Meta Tunnel gateway fdfe:dcba:9876::2.'
}
if ($route4 -notmatch '0\.0\.0\.0\s+0\.0\.0\.0\s+198\.18\.0\.2' -and $route6 -notmatch '::/0\s+fdfe:dcba:9876::2') {
    Write-Host 'No known Mihomo default route detected.'
}
