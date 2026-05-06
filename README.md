# UESTC AutoLogin

UESTC AutoLogin is a Windows helper for keeping the UESTC campus network logged in. It watches the SRun online status, repairs common local proxy/VPN route issues, and logs in again when the machine drops offline.

## Download

Use the latest release:

```text
https://github.com/Uiye4096/UESTC_AutoLogin/releases
```

For version `0.1.0`, download:

```text
UESTC_AutoLogin_Setup_0.1.0.exe
```

## Requirements

- Windows 10 or Windows 11.
- Node.js LTS installed at:

```text
C:\Program Files\nodejs\node.exe
```

If the installer reports that Node.js is missing, install Node.js LTS first, then run the installer again.

## Install

1. Run `UESTC_AutoLogin_Setup_0.1.0.exe`.
2. Enter your UESTC campus network student ID.
3. Enter your campus network password.
4. Click `Save` / `Install`.

The installer will:

- Save the password in Windows Credential Manager.
- Install files to `%LOCALAPPDATA%\UESTC_AutoLogin`.
- Create a startup shortcut so the watcher runs after Windows login.
- Create Start Menu shortcuts under `UESTC AutoLogin`.
- Start the watcher immediately.

## Daily Use

After installation, no manual action is normally needed. The watcher runs in the background and checks campus network login status every 3 seconds.

To start it manually:

```text
Start Menu > UESTC AutoLogin > Start UESTC AutoLogin
```

To change the saved student ID or password:

```text
Start Menu > UESTC AutoLogin > Configure Credentials
```

The new credentials overwrite the old Windows Credential Manager entry.

## Check Whether It Works

Logs are written to:

```text
%LOCALAPPDATA%\Campuswire
```

Useful files:

- `watcher-node-<PID>.log`
- `direct-auth.log`

A successful recovery usually looks like:

```text
status response error=not_online_error ... ok=false
invoke recovery
direct auth first exit=0
status response error=ok ... ok=true
```

If the watcher says `ok=true`, the campus network session is authenticated.

## Uninstall

Use:

```text
Start Menu > UESTC AutoLogin > Uninstall UESTC AutoLogin
```

Uninstall removes:

- The startup shortcut.
- Start Menu shortcuts.
- The installed app directory.
- The saved Windows Credential Manager entry.

## What It Does Internally

The main watcher is `campuswire-watch.js`.

It checks:

```text
http://10.253.0.237/cgi-bin/rad_user_info
```

When the session is offline, it:

1. Runs lightweight network cleanup for known proxy/VPN route problems.
2. Ensures the campus auth host uses the campus network route.
3. Runs direct SRun authentication.
4. Restarts common network apps such as Verge/Tailscale after recovery.

## Troubleshooting

### Node.js Missing

Install Node.js LTS and rerun the installer.

### Wrong Password

Run:

```text
Start Menu > UESTC AutoLogin > Configure Credentials
```

Then restart the watcher from the Start Menu.

### Still Offline

Check:

```text
%LOCALAPPDATA%\Campuswire\watcher-node-<PID>.log
%LOCALAPPDATA%\Campuswire\direct-auth.log
```

Look for login responses or network route errors.

### Proxy, Clash, Verge, or Tailscale Interference

This tool already tries to handle common TUN/proxy route problems. If recovery still fails, temporarily quit those tools and run `Start UESTC AutoLogin` again.

## Build From Source

From the repository root:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\build-installer.ps1
```

Build output:

```text
dist\UESTC_AutoLogin_Setup_0.1.0.exe
dist\UESTC_AutoLogin_0.1.0.zip
```

## Version

`0.1.0` is the first stable packaged release based on the configuration that stayed connected for five days.
