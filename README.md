# remote0 WSL Launcher

This folder snapshots the scripts used to start the `remote0` account's WSL environment from the current Windows account.

## Current Script Locations

The live scripts are currently stored in:

- `C:\Users\Uiye2\start_remote0_wsl_delayed.cmd`
- `C:\Users\Uiye2\start_remote0_wsl_delayed.vbs`
- `C:\Users\Uiye2\remote0_dump_home.cmd`

This repository is a saved copy at:

- `C:\Users\Uiye2\remote0-wsl-launcher`

## Files

- `start_remote0_wsl_delayed.cmd`
  - Waits 180 seconds, then calls the desktop script that starts `remote0` WSL.
- `start_remote0_wsl_delayed.vbs`
  - Waits 180 seconds, then runs the desktop launch script hidden.
- `remote0_dump_home.cmd`
  - Runs `wsl.exe -d Ubuntu` and writes the Linux `$HOME` path to `C:\Users\Public\remote0_home_linux.txt`.

## Runtime Notes

- The launch path is designed around the Windows user `remote0`.
- WSL distributions are registered per Windows user, so `remote0`'s WSL is not visible from the current Windows user's `wsl -l -v`.
- The delayed launch has been stable for five days as of 2026-05-06.

## Important Dependency

The delayed scripts call a desktop command file:

```cmd
D:\Desktop\启动 remote0 WSL.cmd
```

If the desktop script is moved or renamed, update both delayed launcher files.
