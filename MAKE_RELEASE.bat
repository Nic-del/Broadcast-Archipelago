@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo =============================================================
echo             BROADCAST ARCHIPELAGO - RELEASE CREATOR
echo =============================================================
echo.
echo This script will build the application and package ONLY the 
echo necessary files for distribution into the 'dist-release' folder 
echo and compress it into a clean 'BroadCast-Archipelago.zip'.
echo.
echo Ce script va compiler l'application et rassembler UNIQUEMENT
echo les dossiers necessaires dans un dossier propre 'dist-release'
echo puis creer une archive zip prete a etre distribuee.
echo.
echo =============================================================
choice /M "Do you want to start the release packaging process"
if %errorlevel% neq 1 goto :end
echo.

:: 1. Trigger fresh clean compilation
echo [1/4] Starting a clean application build...
call BUILD_DISTRIBUTABLE.bat
if %errorlevel% neq 0 (
    echo [ERROR] Clean compilation failed! Cannot create release.
    goto :error
)
echo.

:: 2. Wiping and recreating release workspace
echo [2/4] Setting up clean release directory 'dist-release'...
if exist dist-release (
    rmdir /s /q dist-release
)
mkdir dist-release
mkdir dist-release\broadcast
mkdir dist-release\broadcast-app\dist-packaged
mkdir dist-release\broadcast-app\dist
echo [SUCCESS] Release workspace is ready.
echo.

:: 3. Copying only necessary files
echo [3/4] Copying required folders and files...

:: Copy root python launch files
copy /Y BroadCast-Archipelago.pyw dist-release\ >nul
copy /Y start_cli.py dist-release\ >nul
copy /Y Start_CLI.bat dist-release\ >nul
copy /Y INSTALL_PYTHON_ONLY.bat dist-release\ >nul
copy /Y README.md dist-release\ >nul
copy /Y LICENSE dist-release\ >nul

:: Copy bridge connection scripts
copy /Y broadcast\bridge.py dist-release\broadcast\ >nul
copy /Y broadcast\extracted_items.txt dist-release\broadcast\ >nul
copy /Y broadcast\index.html dist-release\broadcast\ >nul

:: Copy compiled Electron standalone unpacked folder (using robocopy for speed and robustness)
robocopy "broadcast-app\dist-packaged\win-unpacked" "dist-release\broadcast-app\dist-packaged\win-unpacked" /E /MT /NFL /NDL /NP /NJH /NJS >nul
if %errorlevel% gtr 7 (
    echo [ERROR] Failed to copy Electron binaries. robocopy exit code: %errorlevel%
    goto :error
)

:: Copy compiled Vite static folder (for OBS Local File usage)
robocopy "broadcast-app\dist" "dist-release\broadcast-app\dist" /E /MT /NFL /NDL /NP /NJH /NJS >nul
if %errorlevel% gtr 7 (
    echo [ERROR] Failed to copy Vite static assets. robocopy exit code: %errorlevel%
    goto :error
)

echo [SUCCESS] All files copied successfully!
echo.

:: 4. Generating ZIP archive
echo [4/4] Creating ZIP archive 'BroadCast-Archipelago.zip' for distribution...
if exist BroadCast-Archipelago.zip (
    del /f /q BroadCast-Archipelago.zip
)
powershell -NoProfile -ExecutionPolicy Bypass -Command "Compress-Archive -Path dist-release\* -DestinationPath BroadCast-Archipelago.zip -Force"
if %errorlevel% neq 0 (
    echo [WARNING] ZIP compression failed. You can still manually zip the 'dist-release' folder.
) else (
    echo [SUCCESS] ZIP archive successfully generated!
)
echo.

echo =============================================================
echo           RELEASE CREATED SUCCESSFULLY / SUCCES
echo =============================================================
echo.
echo Generated deliverables:
echo   - Clean Release Folder (exactly what users need):
echo     [dist-release] (contains BroadCast-Archipelago.pyw, broadcast, etc.)
echo.
echo   - Compressed ZIP file (perfect for download / sharing):
echo     [BroadCast-Archipelago.zip] (contains the above, zipped)
echo.
echo Note:
echo Your users do not need Node.js or npm! They only need Python 
echo installed. They can simply extract the zip and double-click 
echo 'BroadCast-Archipelago.pyw' to run the entire system!
echo =============================================================
goto :end

:error
echo.
echo [ERROR] Release creation failed.
echo.

:end
pause
