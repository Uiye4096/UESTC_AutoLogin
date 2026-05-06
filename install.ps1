param(
    [string]$InstallDir = "$env:LOCALAPPDATA\UESTC_AutoLogin"
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Windows.Forms

function Assert-Node {
    $node = 'C:\Program Files\nodejs\node.exe'
    if (!(Test-Path $node)) {
        [System.Windows.Forms.MessageBox]::Show('Node.js was not found. Install Node.js LTS, then run this installer again.', 'Missing Node.js', 'OK', 'Error') | Out-Null
        throw "Node not found: $node"
    }
}

Assert-Node

$installerDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (Test-Path (Join-Path $installerDir 'install-startup-helper.ps1')) {
    $payloadDir = $installerDir
} else {
    $payloadDir = Split-Path -Parent $installerDir
}

New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null

$exclude = @('.git', 'dist', 'campuswire-local.json')
Get-ChildItem -Path $payloadDir -Force | Where-Object {
    $exclude -notcontains $_.Name
} | ForEach-Object {
    $target = Join-Path $InstallDir $_.Name
    if ($_.PSIsContainer) {
        Copy-Item -Path $_.FullName -Destination $target -Recurse -Force
    } else {
        Copy-Item -Path $_.FullName -Destination $target -Force
    }
}

powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $InstallDir 'configure-credentials.ps1') -InstallDir $InstallDir
powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $InstallDir 'install-startup-helper.ps1') | Out-Null

$programs = [Environment]::GetFolderPath('Programs')
$folder = Join-Path $programs 'UESTC AutoLogin'
New-Item -ItemType Directory -Path $folder -Force | Out-Null

$shell = New-Object -ComObject WScript.Shell
$startShortcut = $shell.CreateShortcut((Join-Path $folder 'Start UESTC AutoLogin.lnk'))
$startShortcut.TargetPath = Join-Path $InstallDir 'start-campuswire-watch.cmd'
$startShortcut.WorkingDirectory = $InstallDir
$startShortcut.Save()

$configureShortcut = $shell.CreateShortcut((Join-Path $folder 'Configure Credentials.lnk'))
$configureShortcut.TargetPath = 'powershell.exe'
$configureShortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$InstallDir\configure-credentials.ps1`" -InstallDir `"$InstallDir`""
$configureShortcut.WorkingDirectory = $InstallDir
$configureShortcut.Save()

$uninstallShortcut = $shell.CreateShortcut((Join-Path $folder 'Uninstall UESTC AutoLogin.lnk'))
$uninstallShortcut.TargetPath = 'powershell.exe'
$uninstallShortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$InstallDir\uninstall.ps1`""
$uninstallShortcut.WorkingDirectory = $InstallDir
$uninstallShortcut.Save()

Start-Process -FilePath (Join-Path $InstallDir 'start-campuswire-watch.cmd') -WorkingDirectory $InstallDir

[System.Windows.Forms.MessageBox]::Show('UESTC AutoLogin has been installed and started.', 'Installation Complete', 'OK', 'Information') | Out-Null
