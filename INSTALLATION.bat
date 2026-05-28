@echo off
cd /d "%~dp0"
echo ===========================================
echo COMPLETE BROADCAST INSTALLATION
echo ===========================================
echo.

echo STEP 1: Installing Python 3.12...
call INSTALL_PYTHON_ONLY.bat

echo.
echo STEP 2: Installing Node.js...
call INSTALL_NODE_ONLY.bat

echo.
echo ===========================================
echo ALL INSTALLATIONS ARE COMPLETE!
echo.
echo Reminder: You must have installed:
echo 1. Python 3.12
echo 2. Node.js (LTS)
echo ===========================================
echo.
pause
