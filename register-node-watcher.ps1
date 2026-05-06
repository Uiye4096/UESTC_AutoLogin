param(
    [string]$TaskName = 'CampuswireNodeWatcher'
)

$ErrorActionPreference = 'Stop'

$node = 'C:\Progra~1\nodejs\node.exe'
$watcher = 'C:\Users\Uiye2\CampuswireRunner\campuswire-watch-launcher.js'

if (!(Test-Path $node)) {
    throw "Node not found: $node"
}

if (!(Test-Path $watcher)) {
    throw "Watcher not found: $watcher"
}

$taskCommand = "$node $watcher"

& schtasks.exe /Create /TN $TaskName /TR $taskCommand /SC ONLOGON /RL LIMITED /F | Out-Host
& schtasks.exe /Run /TN $TaskName | Out-Host
