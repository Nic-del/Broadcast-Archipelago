@echo off
echo ===========================================
echo Installing Node.js modules (Vite/React)
echo ===========================================
echo.

cd broadcast-app
call npm install --legacy-peer-deps

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Installation failed. 
    echo Check that Node.js is properly installed on your PC.
) else (
    echo.
    echo [SUCCESS] Modules are installed!
)

echo.
pause
