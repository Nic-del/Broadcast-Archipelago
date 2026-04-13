@echo off
echo Starting Archipelago Broadcast System (Headless Mode)
echo Use arguments to override settings (e.g. Start_CLI.bat --server archipelago.gg:1234 --slot Linkss --mode all)
echo.

py -3.12 start_cli.py %*

pause
