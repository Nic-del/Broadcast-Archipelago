@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo =============================================================
echo               BROADCAST ARCHIPELAGO - BUILD CENTER
echo =============================================================
echo.
echo [1/5] Checking Node.js and NPM installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js LTS version from https://nodejs.org/
    echo and try running this script again.
    goto :error
)
call npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] NPM is not installed or not in PATH!
    goto :error
)
echo [SUCCESS] Node.js is verified!
echo.

echo [2/5] Cleaning up old build folders (Clean Build)...
cd broadcast-app

:: Clean Vite build folder
if exist dist (
    echo   - Removing previous Vite 'dist' folder...
    rmdir /s /q dist
)
:: Clean Packaged build folder
if exist dist-packaged (
    echo   - Removing previous Electron package 'dist-packaged' folder...
    rmdir /s /q dist-packaged
)
echo [SUCCESS] Build workspace is clean!
echo.

echo [3/5] Installing/Verifying node modules...
echo This might take a few moments. Installing dependencies...
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo [ERROR] Dependency installation failed!
    goto :error
)
echo [SUCCESS] Dependencies installed and verified!
echo.

echo [4/5] Compiling and Packaging standalone Electron Overlay...
echo Building UI using Vite and compiling standalone executables...
call npm run build:full
if %errorlevel% neq 0 (
    echo [ERROR] Packaging failed! Please check the logs above.
    goto :error
)
echo [SUCCESS] Compilation and Standalone packaging complete!
echo.

echo [5/5] Checking generated output files...
set "PORTABLE_EXE=dist-packaged\Broadcast-Overlay Portable.exe"
set "UNPACKED_EXE=dist-packaged\win-unpacked\Broadcast-Overlay.exe"

if not exist "%UNPACKED_EXE%" (
    echo [WARNING] Unpacked executable is missing in: dist-packaged\win-unpacked\
)
if not exist "%PORTABLE_EXE%" (
    echo [WARNING] Portable standalone executable is missing in dist-packaged\
)

echo.
echo =============================================================
echo           BUILD COMPLETED SUCCESSFULLY / SUCCES
echo =============================================================
echo.
echo Standalone packages generated in:
echo   - unpacked directory (fast local launch):
echo     [broadcast-app\dist-packaged\win-unpacked]
echo.
echo   - single-file Portable (easy for users to download):
echo     [broadcast-app\dist-packaged\Broadcast-Overlay Portable.exe]
echo.
echo Notice:
echo The launcher (BroadCast-Archipelago.pyw) and CLI (start_cli.py)
echo will now automatically detect and use the unpacked standalone
echo overlay, bypassing Vite and npm dev environments!
echo.
echo Le lanceur detectera et utilisera desormais l'executable
echo autonome automatiquement, sans exiger l'installation de Node!
echo =============================================================
goto :end

:error
echo.
echo =============================================================
echo                     BUILD FAILED / ECHEC
echo =============================================================
echo An error occurred during the building process. Please see
echo the detailed error logs above.
echo =============================================================
echo.

:end
cd ..
pause
