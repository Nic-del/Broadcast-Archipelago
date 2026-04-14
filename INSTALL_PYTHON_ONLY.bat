@echo off
echo ===========================================
echo Installation des dependances PYTHON
echo ===========================================
echo.

:: Vérification de Python
py -3.12 --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Python 3.12 n'est pas installe !
    echo Veuillez l'installer depuis le Microsoft Store ou python.org
    pause
    exit /b
)

echo Installation de websockets et psutil pour Python 3.12...
call py -3.12 -m pip install websockets psutil

if %errorlevel% neq 0 (
    echo.
    echo [ERREUR] L'installation a echoue. 
    echo Essayez de lancer ce script en tant qu'administrateur.
) else (
    echo.
    echo [OK] Dependances Python installees avec succes !
)

echo.
pause
