$ErrorActionPreference = 'Stop'

$script:CredentialTarget = 'UESTC_AutoLogin/Campuswire'

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

[StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
public struct CREDENTIAL {
    public UInt32 Flags;
    public UInt32 Type;
    public string TargetName;
    public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public UInt32 CredentialBlobSize;
    public IntPtr CredentialBlob;
    public UInt32 Persist;
    public UInt32 AttributeCount;
    public IntPtr Attributes;
    public string TargetAlias;
    public string UserName;
}

public static class CredMan {
    public const UInt32 CRED_TYPE_GENERIC = 1;
    public const UInt32 CRED_PERSIST_LOCAL_MACHINE = 2;

    [DllImport("advapi32.dll", EntryPoint="CredReadW", CharSet=CharSet.Unicode, SetLastError=true)]
    public static extern bool CredRead(string target, UInt32 type, UInt32 reservedFlag, out IntPtr credentialPtr);

    [DllImport("advapi32.dll", EntryPoint="CredWriteW", CharSet=CharSet.Unicode, SetLastError=true)]
    public static extern bool CredWrite([In] ref CREDENTIAL userCredential, UInt32 flags);

    [DllImport("advapi32.dll", EntryPoint="CredDeleteW", CharSet=CharSet.Unicode, SetLastError=true)]
    public static extern bool CredDelete(string target, UInt32 type, UInt32 flags);

    [DllImport("advapi32.dll", EntryPoint="CredFree", SetLastError=true)]
    public static extern void CredFree(IntPtr buffer);
}
'@

function Set-CampuswireCredential {
    param(
        [Parameter(Mandatory=$true)][string]$Username,
        [Parameter(Mandatory=$true)][string]$Password
    )

    $passwordBytes = [Text.Encoding]::Unicode.GetBytes($Password)
    $blob = [Runtime.InteropServices.Marshal]::AllocCoTaskMem($passwordBytes.Length)
    try {
        [Runtime.InteropServices.Marshal]::Copy($passwordBytes, 0, $blob, $passwordBytes.Length)
        $cred = New-Object CREDENTIAL
        $cred.Type = [CredMan]::CRED_TYPE_GENERIC
        $cred.TargetName = $script:CredentialTarget
        $cred.CredentialBlobSize = $passwordBytes.Length
        $cred.CredentialBlob = $blob
        $cred.Persist = [CredMan]::CRED_PERSIST_LOCAL_MACHINE
        $cred.UserName = $Username

        if (-not [CredMan]::CredWrite([ref]$cred, 0)) {
            throw "CredWrite failed with Win32 error $([Runtime.InteropServices.Marshal]::GetLastWin32Error())."
        }
    } finally {
        if ($blob -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::FreeCoTaskMem($blob)
        }
    }
}

function Get-CampuswireCredential {
    $ptr = [IntPtr]::Zero
    if (-not [CredMan]::CredRead($script:CredentialTarget, [CredMan]::CRED_TYPE_GENERIC, 0, [ref]$ptr)) {
        return $null
    }

    try {
        $cred = [Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [type][CREDENTIAL])
        $password = ''
        if ($cred.CredentialBlobSize -gt 0) {
            $password = [Runtime.InteropServices.Marshal]::PtrToStringUni($cred.CredentialBlob, [int]($cred.CredentialBlobSize / 2))
        }

        [pscustomobject]@{
            Username = $cred.UserName
            Password = $password
        }
    } finally {
        [CredMan]::CredFree($ptr)
    }
}

function Remove-CampuswireCredential {
    [void][CredMan]::CredDelete($script:CredentialTarget, [CredMan]::CRED_TYPE_GENERIC, 0)
}
