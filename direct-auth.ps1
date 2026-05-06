param(
    [string]$PortalHost = '10.253.0.237',
    [string]$Username = $env:CAMPUSWIRE_USER,
    [string]$Password = $env:CAMPUSWIRE_PASS,
    [string]$AcId = '1',
    [string]$Ip = '',
    [string]$Type = '1',
    [string]$N = '200',
    [string]$EncVer = 'srun_bx1'
)

$ErrorActionPreference = 'Stop'
$LocalConfig = Join-Path $PSScriptRoot 'campuswire-local.json'
if ((-not $Username -or -not $Password) -and (Test-Path $LocalConfig)) {
    $config = Get-Content -Path $LocalConfig -Raw | ConvertFrom-Json
    if (-not $Username) { $Username = $config.username }
    if (-not $Password) { $Password = $config.password }
    if ($config.host) { $PortalHost = $config.host }
    if ($config.ac_id) { $AcId = $config.ac_id }
}
if (-not $Username -or -not $Password) {
    throw 'Missing campus auth credentials. Set CAMPUSWIRE_USER/CAMPUSWIRE_PASS or create campuswire-local.json.'
}
$LogDir = Join-Path $env:LOCALAPPDATA 'Campuswire'
$LogFile = Join-Path $LogDir 'direct-auth.log'
if (!(Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

function Write-Log([string]$Message) {
    $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $LogFile -Value "[$stamp] $Message"
}

function Get-MD5Hex([string]$Text) {
    $md5 = [System.Security.Cryptography.MD5]::Create()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
    $hash = $md5.ComputeHash($bytes)
    ($hash | ForEach-Object { $_.ToString('x2') }) -join ''
}

function Get-SHA1Hex([string]$Text) {
    $sha1 = [System.Security.Cryptography.SHA1]::Create()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
    $hash = $sha1.ComputeHash($bytes)
    ($hash | ForEach-Object { $_.ToString('x2') }) -join ''
}

function Get-Base64([string]$Text) {
    [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($Text))
}

function XEncode([string]$Data, [string]$Key) {
    $box = 0..255
    $rndkey = New-Object int[] 256
    $keyLen = $Key.Length
    for ($i = 0; $i -lt 256; $i++) {
        $rndkey[$i] = [int][char]$Key[$i % $keyLen]
    }
    $j = 0
    for ($i = 0; $i -lt 256; $i++) {
        $j = ($j + $box[$i] + $rndkey[$i]) % 256
        $tmp = $box[$i]
        $box[$i] = $box[$j]
        $box[$j] = $tmp
    }
    $a = 0
    $j = 0
    $result = New-Object System.Text.StringBuilder
    for ($i = 0; $i -lt $Data.Length; $i++) {
        $a = ($a + 1) % 256
        $j = ($j + $box[$a]) % 256
        $tmp = $box[$a]
        $box[$a] = $box[$j]
        $box[$j] = $tmp
        $k = $box[($box[$a] + $box[$j]) % 256]
        [void]$result.Append([char]([byte]([int][char]$Data[$i] -bxor $k)))
    }
    return $result.ToString()
}

function Get-Json([string]$Uri) {
    (Invoke-WebRequest -UseBasicParsing -Uri $Uri -TimeoutSec 8).Content
}

function Get-Jsonp([string]$Uri) {
    $raw = (Invoke-WebRequest -UseBasicParsing -Uri $Uri -TimeoutSec 8).Content
    $m = [regex]::Match($raw, '^[^(]+\((.*)\)$')
    if (-not $m.Success) { throw "Invalid JSONP response: $raw" }
    $m.Groups[1].Value | ConvertFrom-Json
}

if (-not $Ip) {
    $Ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -notmatch '^127\.|^169\.254\.' -and $_.ValidLifetime -ne ([TimeSpan]::Zero) } |
        Select-Object -First 1 -ExpandProperty IPAddress)
    if (-not $Ip) {
        $Ip = (Get-NetIPAddress -AddressFamily IPv6 -ErrorAction SilentlyContinue |
            Where-Object { $_.IPAddress -notmatch '^::1$|^fe80:' } |
            Select-Object -First 1 -ExpandProperty IPAddress)
    }
}

Write-Log "start host=$PortalHost user=$Username ip=$Ip ac=$AcId"

$tokenUrl = "http://$PortalHost/cgi-bin/get_challenge?username=$([uri]::EscapeDataString($Username))&ip=$([uri]::EscapeDataString($Ip))"
$tokenJson = Get-Jsonp ($tokenUrl + "&callback=jQuery")
$Ip = $tokenJson.online_ip
$tokenUrl = "http://$PortalHost/cgi-bin/get_challenge?username=$([uri]::EscapeDataString($Username))&ip=$([uri]::EscapeDataString($Ip))"
$tokenJson = Get-Jsonp ($tokenUrl + "&callback=jQuery")
$token = $tokenJson.challenge
if (-not $token) { throw "Failed to get challenge token" }
Write-Log "challenge=$token"

$hmd5 = Get-MD5Hex ($Password + $token)
$payload = @{ username = $Username; password = $Password; ip = $Ip; acid = $AcId; enc_ver = $EncVer }
$info = '{SRBX1}' + (Get-Base64 (XEncode (ConvertTo-Json $payload -Compress) $token))
$str = "$token$Username$token$hmd5$token$AcId$token$Ip$token$N$token$Type$token$info"
$chksum = Get-SHA1Hex $str

$loginUrl = "http://$PortalHost/cgi-bin/srun_portal?action=login&username=$([uri]::EscapeDataString($Username))&password=$([uri]::EscapeDataString('{MD5}' + $hmd5))&ac_id=$AcId&ip=$([uri]::EscapeDataString($Ip))&chksum=$chksum&info=$([uri]::EscapeDataString($info))&n=$N&type=$Type&os=Windows&name=Windows&double_stack=0"
 $resp = Get-Jsonp ($loginUrl + "&callback=jQuery")
Write-Log "response=$resp"
Write-Host $resp
