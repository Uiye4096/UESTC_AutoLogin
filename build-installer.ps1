param(
    [string]$Version = '0.1.0'
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dist = Join-Path $root 'dist'
$packageRoot = Join-Path $dist "UESTC_AutoLogin_$Version"
$setupExe = Join-Path $dist "UESTC_AutoLogin_Setup_$Version.exe"
$zipPath = Join-Path $dist "UESTC_AutoLogin_$Version.zip"
$sedPath = Join-Path $dist 'iexpress.sed'

Remove-Item -LiteralPath $packageRoot -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $packageRoot -Force | Out-Null
New-Item -ItemType Directory -Path $dist -Force | Out-Null

$exclude = @('.git', 'dist', 'campuswire-local.json')
Get-ChildItem -LiteralPath $root -Force | Where-Object {
    $exclude -notcontains $_.Name
} | ForEach-Object {
    $target = Join-Path $packageRoot $_.Name
    if ($_.PSIsContainer) {
        Copy-Item -LiteralPath $_.FullName -Destination $target -Recurse -Force
    } else {
        Copy-Item -LiteralPath $_.FullName -Destination $target -Force
    }
}

Remove-Item -LiteralPath $zipPath -Force -ErrorAction SilentlyContinue
Compress-Archive -Path (Join-Path $packageRoot '*') -DestinationPath $zipPath -Force

$files = Get-ChildItem -LiteralPath $packageRoot -File | Sort-Object Name
$sourceEntries = New-Object System.Collections.Generic.List[string]
$stringEntries = New-Object System.Collections.Generic.List[string]
for ($i = 0; $i -lt $files.Count; $i++) {
    $sourceEntries.Add("%FILE$i%=")
    $stringEntries.Add("FILE$i=`"$($files[$i].Name)`"")
}

$sed = @"
[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=0
HideExtractAnimation=1
UseLongFileName=1
InsideCompressed=1
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=
DisplayLicense=
FinishMessage=
TargetName=$setupExe
FriendlyName=UESTC AutoLogin Setup
AppLaunched=powershell.exe -NoProfile -ExecutionPolicy Bypass -File install.ps1
PostInstallCmd=<None>
AdminQuietInstCmd=
UserQuietInstCmd=
SourceFiles=SourceFiles
[SourceFiles]
SourceFiles0=$packageRoot
[SourceFiles0]
$($sourceEntries -join "`r`n")
[Strings]
$($stringEntries -join "`r`n")
"@

Set-Content -LiteralPath $sedPath -Value $sed -Encoding ASCII

$iexpress = Join-Path $env:WINDIR 'System32\iexpress.exe'
if (!(Test-Path $iexpress)) {
    throw "IExpress not found: $iexpress"
}

Remove-Item -LiteralPath $setupExe -Force -ErrorAction SilentlyContinue
& $iexpress /N /Q $sedPath

for ($i = 0; $i -lt 20 -and !(Test-Path $setupExe); $i++) {
    Start-Sleep -Milliseconds 500
}

if (!(Test-Path $setupExe)) {
    throw "Installer was not created: $setupExe"
}

Write-Host "Created $setupExe"
Write-Host "Created $zipPath"
