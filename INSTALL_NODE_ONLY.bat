@echo off
cd /d "%~dp0"

echo ===========================================
echo Installing Node.js modules (Vite/React)
echo ===========================================
echo.

if exist broadcast-app\dist-packaged\win-unpacked\Broadcast-Overlay.exe (
    echo [INFO] Pre-packaged standalone overlay detected!
    echo Regular users DO NOT need to run this installation.
    echo The system will automatically use the compiled standalone version.
    echo.
    echo If you want to force install Node dev modules anyway,
    choice /M "Do you want to continue setting up the developer environment"
    if %errorlevel% neq 1 goto :end
    echo.
)

cd broadcast-app
call npm install --legacy-peer-deps

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] npm install failed. 
    echo Check that Node.js is properly installed on your PC.
    goto :end
)

echo.
echo ===========================================
echo Verifying Electron installation...
echo ===========================================

if not exist node_modules\electron\dist\electron.exe (
    echo.
    echo [WARNING] Electron binary is missing or failed to download!
    echo Attempting to force manual download of Electron binary...
    echo.
    node node_modules\electron\install.js
)

if not exist node_modules\electron\dist\electron.exe (
    echo.
    echo [INFO] Standard installer failed to extract.
    echo Attempting native Windows PowerShell fallback extraction...
    echo.
    set "ELECTRON_VER="
    for /f "delims=" %%i in ('node -p "require('./node_modules/electron/package.json').version" 2^>nul') do set "ELECTRON_VER=%%i"
    
    if defined ELECTRON_VER (
        powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -Path '%LOCALAPPDATA%\electron\Cache' -Filter '*electron-v%ELECTRON_VER%-win32-*.zip' -Recurse | ForEach-Object { Expand-Archive -Path $_.FullName -DestinationPath 'node_modules\electron\dist' -Force; Set-Content -Path 'node_modules\electron\path.txt' -Value 'electron.exe' -NoNewline; Write-Host '[SUCCESS] Native extraction complete.' }"
    ) else (
        echo [ERROR] Could not read Electron version from package.json
    )
)

if not exist node_modules\electron\dist\electron.exe (
    echo.
    echo [ERROR] Electron failed to install correctly.
    echo.
    echo Common reasons:
    echo 1. Your antivirus might have blocked or quarantined 'electron.exe'.
    echo    Try temporarily disabling antivirus and running this script again.
    echo 2. Network connection / proxy blocked the download from GitHub.
    echo    Check your internet connection and try running:
    echo      cd broadcast-app
    echo      node node_modules/electron/install.js
    echo 3. The npm 'ignore-scripts' setting is enabled. Try running:
    echo      npm config set ignore-scripts false
    echo      npm rebuild electron
    echo.
) else (
    echo.
    echo [SUCCESS] Electron binary is verified and ready!
    echo [SUCCESS] Modules are installed!
)

:end
echo.
pause
