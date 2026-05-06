param(
    [string]$InstallDir = "$env:LOCALAPPDATA\UESTC_AutoLogin"
)

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'credential-store.ps1')

function Show-CredentialDialog {
    param(
        [string]$ExistingUsername = ''
    )

    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing

    $form = New-Object System.Windows.Forms.Form
    $form.Text = 'UESTC AutoLogin Credentials'
    $form.Size = New-Object System.Drawing.Size(430, 235)
    $form.StartPosition = 'CenterScreen'
    $form.FormBorderStyle = 'FixedDialog'
    $form.MaximizeBox = $false
    $form.MinimizeBox = $false

    $labelUser = New-Object System.Windows.Forms.Label
    $labelUser.Text = 'Student ID'
    $labelUser.Location = New-Object System.Drawing.Point(24, 28)
    $labelUser.Size = New-Object System.Drawing.Size(90, 24)
    $form.Controls.Add($labelUser)

    $textUser = New-Object System.Windows.Forms.TextBox
    $textUser.Location = New-Object System.Drawing.Point(130, 24)
    $textUser.Size = New-Object System.Drawing.Size(250, 24)
    $textUser.Text = $ExistingUsername
    $form.Controls.Add($textUser)

    $labelPass = New-Object System.Windows.Forms.Label
    $labelPass.Text = 'Password'
    $labelPass.Location = New-Object System.Drawing.Point(24, 72)
    $labelPass.Size = New-Object System.Drawing.Size(90, 24)
    $form.Controls.Add($labelPass)

    $textPass = New-Object System.Windows.Forms.TextBox
    $textPass.Location = New-Object System.Drawing.Point(130, 68)
    $textPass.Size = New-Object System.Drawing.Size(250, 24)
    $textPass.UseSystemPasswordChar = $true
    $form.Controls.Add($textPass)

    $note = New-Object System.Windows.Forms.Label
    $note.Text = 'Password is stored in Windows Credential Manager.'
    $note.Location = New-Object System.Drawing.Point(24, 112)
    $note.Size = New-Object System.Drawing.Size(360, 24)
    $form.Controls.Add($note)

    $ok = New-Object System.Windows.Forms.Button
    $ok.Text = 'Save'
    $ok.Location = New-Object System.Drawing.Point(210, 150)
    $ok.DialogResult = [System.Windows.Forms.DialogResult]::OK
    $form.AcceptButton = $ok
    $form.Controls.Add($ok)

    $cancel = New-Object System.Windows.Forms.Button
    $cancel.Text = 'Cancel'
    $cancel.Location = New-Object System.Drawing.Point(300, 150)
    $cancel.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
    $form.CancelButton = $cancel
    $form.Controls.Add($cancel)

    $result = $form.ShowDialog()
    if ($result -ne [System.Windows.Forms.DialogResult]::OK) {
        throw 'Credential configuration cancelled.'
    }
    if ([string]::IsNullOrWhiteSpace($textUser.Text) -or [string]::IsNullOrWhiteSpace($textPass.Text)) {
        throw 'Student ID and password are required.'
    }

    [pscustomobject]@{
        Username = $textUser.Text.Trim()
        Password = $textPass.Text
    }
}

$existing = Get-CampuswireCredential
$credentials = Show-CredentialDialog -ExistingUsername $(if ($existing) { $existing.Username } else { '' })
Set-CampuswireCredential -Username $credentials.Username -Password $credentials.Password

New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
$localConfig = [ordered]@{
    host = '10.253.0.237'
    username = $credentials.Username
    ac_id = '1'
}
$localConfig | ConvertTo-Json | Set-Content -Path (Join-Path $InstallDir 'campuswire-local.json') -Encoding UTF8

[System.Windows.Forms.MessageBox]::Show('UESTC AutoLogin credentials saved.', 'Credentials Saved', 'OK', 'Information') | Out-Null
