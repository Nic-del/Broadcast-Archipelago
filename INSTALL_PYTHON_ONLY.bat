@echo off
setlocal enabledelayedexpansion

echo ===========================================
echo Installation des dependances PYTHON
echo ===========================================
echo.

:: 1. Tenter de trouver Python 3.12 via 'py'
set "PYTHON_CMD=py -3.12"
%PYTHON_CMD% --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Python 3.12 trouve via 'py -3.12'
    goto :INSTALL
)

:: 2. Tenter via 'python'
set "PYTHON_CMD=python"
%PYTHON_CMD% --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Python trouve via 'python'
    goto :INSTALL
)

:: 3. Echec total
echo [ERREUR] Python n'est pas installe ou n'est pas dans le PATH !
echo Veuillez l'installer depuis python.org (cochez 'Add to PATH')
pause
exit /b

:INSTALL
echo Installation de websockets et psutil via !PYTHON_CMD!...
call !PYTHON_CMD! -m pip install websockets psutil

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
