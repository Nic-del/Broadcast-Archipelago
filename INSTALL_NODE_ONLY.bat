@echo off
echo ===========================================
echo Installation des modules Node.js (Vite/React)
echo ===========================================
echo.

cd broadcast-app
call npm install --legacy-peer-deps

if %errorlevel% neq 0 (
    echo.
    echo [ERREUR] L'installation a echoue. 
    echo Verifiez que Node.js est bien installe sur votre PC.
) else (
    echo.
    echo [SUCCES] Les modules sont installes !
)

echo.
pause
