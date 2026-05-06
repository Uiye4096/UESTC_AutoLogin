# UESTC AutoLogin

UESTC AutoLogin keeps the UESTC campus network authenticated on Windows. It runs a lightweight watcher, detects when SRun reports the machine as offline, repairs common local network/proxy state, and performs direct SRun authentication again.

## Features

- Polls `http://10.253.0.237/cgi-bin/rad_user_info` every 3 seconds by default.
- Runs direct SRun authentication when the campus network session drops.
- Handles common Clash/Verge/Tailscale and proxy routing problems before retrying login.
- Stores the campus password in Windows Credential Manager.
- Provides Start Menu shortcuts for start, credential update, and uninstall.
- Installs as a per-user app under `%LOCALAPPDATA%\UESTC_AutoLogin`.

## Install

Download `UESTC_AutoLogin_Setup_0.1.0.exe` from the GitHub release and run it.

The installer will:

1. Check that Node.js is installed at `C:\Program Files\nodejs\node.exe`.
2. Ask for the campus network student ID and password.
3. Save the password to Windows Credential Manager.
4. Install files to `%LOCALAPPDATA%\UESTC_AutoLogin`.
5. Create a login startup shortcut and Start Menu shortcuts.
6. Start the watcher immediately.

If Node.js is missing, install Node.js LTS first and run the installer again.

## Change Credentials

Open:

```text
Start Menu > UESTC AutoLogin > Configure Credentials
```

This overwrites the existing Windows Credential Manager entry.

## Logs

Logs are written to:

```text
%LOCALAPPDATA%\Campuswire
```

Useful files:

- `watcher-node-<PID>.log`
- `direct-auth.log`

A healthy recovery usually includes:

```text
status response error=not_online_error ... ok=false
invoke recovery
direct auth first exit=0
status response error=ok ... ok=true
```

## Build

From the repository root:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\build-installer.ps1
```

Output:

```text
dist\UESTC_AutoLogin_Setup_0.1.0.exe
dist\UESTC_AutoLogin_0.1.0.zip
```

## Release

Version `0.1.0` is the first stable package based on the configuration that has stayed connected for five days.
