@echo off
echo ===========================================
echo INSTALLATION COMPLETE DU BROADCAST
echo ===========================================
echo.

echo ETAPE 1 : Installation Python 3.12...
call INSTALL_PYTHON_ONLY.bat

echo.
echo ETAPE 2 : Installation Node.js...
call INSTALL_NODE_ONLY.bat

echo.
echo ===========================================
echo TOUTES LES INSTALLATIONS SONT TERMINEES !
echo.
echo Rappel : Vous devez avoir installe :
echo 1. Python 3.12
echo 2. Node.js (LTS)
echo ===========================================
echo.
pause
