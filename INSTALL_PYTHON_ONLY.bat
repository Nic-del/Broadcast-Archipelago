@echo off
cd /d "%~dp0"
setlocal enabledelayedexpansion

echo ===========================================
echo Installing PYTHON dependencies
echo ===========================================
echo.

:: 1. Attempting to find Python 3.12 via 'py'
set "PYTHON_CMD=py -3.12"
%PYTHON_CMD% --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Python 3.12 found via 'py -3.12'
    goto :INSTALL
)

:: 2. Attempting via 'python'
set "PYTHON_CMD=python"
%PYTHON_CMD% --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Python found via 'python'
    goto :INSTALL
)

:: 3. Total failure
echo [ERROR] Python is not installed or not in PATH!
echo Please install it from python.org (check 'Add to PATH')
pause
exit /b

:INSTALL
echo Installing websockets and psutil via !PYTHON_CMD!...
call !PYTHON_CMD! -m pip install websockets psutil

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Installation failed. 
    echo Try running this script as administrator.
) else (
    echo.
    echo [OK] Python dependencies installed successfully!
)

echo.
pause
