param(
    [string]$PortalUrl = 'http://aaa.uestc.edu.cn',
    [string]$TaskName = 'Campuswire Network Watcher'
)

$ErrorActionPreference = 'Stop'
$watcher = Join-Path $PSScriptRoot 'campuswire-watch.ps1'

if (!(Test-Path $watcher)) {
    throw "Watcher not found: $watcher"
}

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$watcher`" -PortalUrl `"$PortalUrl`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId $env:UserName -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
Write-Host "Registered task: $TaskName"
