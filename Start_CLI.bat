@echo off
cd /d "%~dp0"
setlocal enabledelayedexpansion

:: Check if --silent or --invisible is passed in arguments
set "SILENT=0"
set "ARGS="
for %%a in (%*) do (
    if "%%a"=="--silent" (
        set "SILENT=1"
    ) else if "%%a"=="--invisible" (
        set "SILENT=1"
    ) else if "%%a"=="h" (
        rem Skip hidden flag
    ) else (
        set "ARGS=!ARGS! %%a"
    )
)

:: If we are already running in hidden mode (re-entered), jump straight to run_hidden
if "%~1"=="h" goto :run_hidden

:: If --silent is not requested, go straight to normal execution
if not "%SILENT%"=="1" goto :normal

:: Relaunch invisibly using PowerShell (more robust than mshta which is often blocked by Windows security)
powershell -WindowStyle Hidden -Command "Start-Process -FilePath '%~f0' -ArgumentList 'h !ARGS!' -WindowStyle Hidden"
exit /b

:run_hidden
:: Run silently using pyw (no terminal)
pyw -3.12 start_cli.py !ARGS!
goto :eof

:normal
echo Starting Archipelago Broadcast System (Headless Mode)
echo Use arguments to override settings (e.g. Start_CLI.bat --server archipelago.gg:1234 --slot Linkss --mode all)
echo.
echo TIP: Add --silent to launch without showing this terminal window.
echo.
py -3.12 start_cli.py %*
pause


