$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'credential-store.ps1')

$node = 'C:\Program Files\nodejs\node.exe'
$watcher = Join-Path $PSScriptRoot 'campuswire-watch.js'
$configPath = Join-Path $PSScriptRoot 'campuswire-local.json'

if (!(Test-Path $node)) {
    throw "Node not found: $node"
}

if (!(Test-Path $watcher)) {
    throw "Watcher not found: $watcher"
}

$credential = Get-CampuswireCredential
if (-not $credential) {
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'configure-credentials.ps1') -InstallDir $PSScriptRoot
    $credential = Get-CampuswireCredential
}

if (-not $credential) {
    throw 'Campuswire credentials are not configured.'
}

$hostValue = '10.253.0.237'
$acId = '1'
if (Test-Path $configPath) {
    $config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
    if ($config.host) { $hostValue = $config.host }
    if ($config.ac_id) { $acId = $config.ac_id }
}

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $node
$psi.Arguments = "`"$watcher`""
$psi.WorkingDirectory = $PSScriptRoot
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
$psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
$psi.EnvironmentVariables['CAMPUSWIRE_USER'] = $credential.Username
$psi.EnvironmentVariables['CAMPUSWIRE_PASS'] = $credential.Password
$psi.EnvironmentVariables['CAMPUSWIRE_HOST'] = $hostValue
$psi.EnvironmentVariables['CAMPUSWIRE_ACID'] = $acId

[void][System.Diagnostics.Process]::Start($psi)
