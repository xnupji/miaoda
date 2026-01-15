@echo off
setlocal
chcp 65001 >nul
echo ===========================================
echo HTP Auto Deploy Launcher
echo ===========================================
echo.
echo Starting deploy_all.ps1 ...
echo.
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy_all.ps1"
set "RC=%ERRORLEVEL%"
echo.
if "%RC%"=="0" (
  echo Done. Check above logs for SUCCESS or WARNINGS.
) else (
  echo Deploy script returned error code %RC%.
)
echo.
echo Press any key to close...
pause >nul
endlocal
