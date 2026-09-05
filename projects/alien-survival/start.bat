@echo off
title Alien Survival - Local Server (keep this window open)
cd /d "%~dp0"
start http://localhost:8765/
python -m http.server 8765 --directory "%~dp0."
pause
