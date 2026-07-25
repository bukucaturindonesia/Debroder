@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0apply-landing-visual-batch2.ps1"
exit /b %errorlevel%
