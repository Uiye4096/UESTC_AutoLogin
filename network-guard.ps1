param(
    [string]$AuthHost = '10.253.0.237',
    [switch]$Quiet
)

$ErrorActionPreference = 'Continue'

function Write-Guard {
    param([string]$Message)
    if (-not $Quiet) { Write-Host $Message }
}

function Test-PrivateOrTunnelAddress {
    param([string]$Address)

    return (
        $Address -like '127.*' -or
        $Address -like '169.254.*' -or
        $Address -like '192.168.*' -or
        $Address -like '198.18.*' -or
        $Address -like '198.19.*' -or
        $Address -like '10.*' -or
        $Address -match '^172\.(1[6-9]|2[0-9]|3[0-1])\.'
    )
}

function Get-CampusDefaultRoute {
    $routes = route print -4
    $bestGateway = ''
    $bestInterface = ''
    $bestMetric = 2147483647

    foreach ($line in $routes) {
        if ($line -match '^\s*0\.0\.0\.0\s+0\.0\.0\.0\s+(\S+)\s+(\S+)\s+(\d+)\s*$') {
            $gateway = $Matches[1]
            $interface = $Matches[2]
            $metric = [int]$Matches[3]

            if (-not (Test-PrivateOrTunnelAddress $gateway) -and -not (Test-PrivateOrTunnelAddress $interface)) {
                if ($metric -lt $bestMetric) {
                    $bestGateway = $gateway
                    $bestInterface = $interface
                    $bestMetric = $metric
                }
            }
        }
    }

    if (-not $bestGateway) { return $null }
    return "$bestGateway $bestInterface $bestMetric"
}

function Remove-KnownTunnelDefaultRoutes {
    Write-Guard 'Removing known tunnel default routes if present...'
    route delete 0.0.0.0 mask 0.0.0.0 198.18.0.2 2>$null | Out-Null
    route delete ::/0 fdfe:dcba:9876::2 2>$null | Out-Null
}

function Ensure-AuthHostRoute {
    $route = Get-CampusDefaultRoute
    if (-not $route) {
        Write-Guard 'No campus default route candidate found; skip auth host route.'
        return 2
    }

    $parts = $route -split ' '
    $gateway = $parts[0]
    $interface = $parts[1]

    foreach ($line in (route print -4)) {
        if ($line -match '^\s*(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\d+)\s*$') {
            if ($Matches[1] -eq $AuthHost -and $Matches[2] -eq '255.255.255.255' -and $Matches[3] -eq $gateway -and $Matches[4] -eq $interface) {
                Write-Guard "Auth host route already present: $AuthHost via $gateway"
                return 0
            }
        }
    }

    route delete $AuthHost 2>$null | Out-Null
    route add $AuthHost mask 255.255.255.255 $gateway metric 1 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Guard "Auth host route added: $AuthHost via $gateway"
        return 0
    }

    Write-Guard "Failed to add auth host route: $AuthHost via $gateway"
    return 1
}

Remove-KnownTunnelDefaultRoutes
exit (Ensure-AuthHostRoute)
