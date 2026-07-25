@echo off
setlocal
node "%~dp0apply-batch4a-compat-hotfix.mjs"
exit /b %errorlevel%
