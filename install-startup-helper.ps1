param(
    [string]$ShortcutName = 'Campuswire Network Watcher'
)

$ErrorActionPreference = 'Stop'

$launcher = Join-Path $PSScriptRoot 'start-campuswire-watch.cmd'
if (!(Test-Path $launcher)) {
    throw "Launcher not found: $launcher"
}

$startup = [Environment]::GetFolderPath('Startup')
$lnkPath = Join-Path $startup "$ShortcutName.lnk"

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($lnkPath)
$shortcut.TargetPath = $launcher
$shortcut.Arguments = ''
$shortcut.WorkingDirectory = $PSScriptRoot
$shortcut.WindowStyle = 7
$shortcut.Save()

Write-Host "Created startup shortcut: $lnkPath"
