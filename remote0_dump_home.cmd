@echo off
wsl.exe -d Ubuntu sh -lc "printf %s \"$HOME\"" > C:\Users\Public\remote0_home_linux.txt
