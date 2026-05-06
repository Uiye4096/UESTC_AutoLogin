param(
    [string]$PortalUrl = '',
    [int]$IntervalSeconds = 3,
    [int]$RecoveryCooldownSeconds = 12
)

$ErrorActionPreference = 'Continue'
$LogDir = Join-Path $env:LOCALAPPDATA 'Campuswire'
$LogFile = Join-Path $LogDir ("watcher-{0}.log" -f $PID)

if (!(Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

function Write-Log {
    param([string]$Message)

    $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    try {
        Add-Content -Path $LogFile -Value "[$stamp] $Message"
    } catch {}
}

function Test-Online {
    $hostName = if ($env:CAMPUSWIRE_HOST) { $env:CAMPUSWIRE_HOST } else { '10.253.0.237' }
    $callback = 'jQuery' + [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
    $url = "http://$hostName/cgi-bin/rad_user_info?callback=$callback&_=$([DateTimeOffset]::Now.ToUnixTimeMilliseconds())"

    try {
        Write-Log "status probe $url"
        $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
        $text = [string]$resp.Content
        $json = $text -replace '^[^(]*\(', '' -replace '\)\s*$', ''
        $data = $json | ConvertFrom-Json
        $ok = ($data.error -eq 'ok' -and $data.user_name)
        Write-Log "status response error=$($data.error) user=$($data.user_name) ip=$($data.online_ip) ok=$ok"
        return $ok
    } catch {
        Write-Log "status probe failed $($_.Exception.Message)"
    }

    Write-Log 'offline or unauthenticated detected'
    return $false
}

function Invoke-Recovery {
    Write-Log 'invoke recovery'
    $scriptPath = Join-Path $PSScriptRoot 'network-reset.ps1'
    if (Test-Path $scriptPath) {
        Write-Log "run $scriptPath"
        powershell.exe -ExecutionPolicy Bypass -File $scriptPath | Out-Null
    }

    $authJs = Join-Path $PSScriptRoot 'direct-auth.js'
    $authPs = Join-Path $PSScriptRoot 'direct-auth.ps1'
    if (Test-Path $authJs) {
        Write-Log "run $authJs"
        & node $authJs | Out-Null
        Write-Log "direct auth js exit=$LASTEXITCODE"
    } elseif (Test-Path $authPs) {
        Write-Log "run $authPs"
        powershell.exe -ExecutionPolicy Bypass -File $authPs | Out-Null
        Write-Log "direct auth ps exit=$LASTEXITCODE"
    } elseif ($PortalUrl) {
        Write-Log "open portal $PortalUrl"
        Start-Process $PortalUrl
    }
}

$lastRecoveryAt = Get-Date '2000-01-01'
Write-Log 'watcher started'

while ($true) {
    $online = Test-Online
    if (-not $online) {
        $elapsed = ((Get-Date) - $lastRecoveryAt).TotalSeconds
        if ($elapsed -ge $RecoveryCooldownSeconds) {
            Invoke-Recovery
            $lastRecoveryAt = Get-Date
        } else {
            Write-Log "recovery cooldown remaining=$([int]($RecoveryCooldownSeconds - $elapsed))s"
        }
    }
    Start-Sleep -Seconds $IntervalSeconds
}
