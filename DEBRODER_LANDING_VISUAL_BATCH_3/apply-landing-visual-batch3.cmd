@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0apply-landing-visual-batch3.ps1"
if errorlevel 1 (
  echo.
  echo FAIL: Batch 3 tidak diterapkan.
  exit /b 1
)
endlocal
