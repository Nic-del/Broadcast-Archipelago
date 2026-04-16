#!/bin/bash
# BroadCast Archipelago Linux Installer

echo "==========================================="
# Check for Python 3
if ! command -v python3 &> /dev/null
then
    echo "[ERROR] Python 3 is not installed!"
    exit
fi

# Check for Node.js (Optional for AppImage users)
NODE_READY=true
if ! command -v node &> /dev/null
then
    echo "[WARNING] Node.js is not installed! You will need the AppImage version to run the GUI."
    NODE_READY=false
fi

# Check for npm
if ! command -v npm &> /dev/null
then
    echo "[WARNING] npm is not installed!"
    NODE_READY=false
fi

echo "STEP 1: Installing Python dependencies (websockets, psutil, screeninfo)..."
# Using --break-system-packages for modern distros, or use a venv (safer)
python3 -m pip install websockets psutil screeninfo --break-system-packages || python3 -m pip install websockets psutil screeninfo

if [ "$NODE_READY" = true ]; then
    echo ""
    echo "STEP 2: Installing Node.js dependencies for the visual interface..."
    cd broadcast-app
    npm install
    cd ..
else
    echo ""
    echo "STEP 2: Skipped Node.js dependencies (Node not found)."
    echo "Note: You must use a pre-compiled AppImage to launch the overlay."
fi

echo ""
echo "==========================================="
echo "ALL INSTALLATIONS COMPLETED!"
echo "==========================================="
echo "You can now launch the app with: python3 BroadCast-Archipelago.py"
chmod +x ../BroadCast-Archipelago.py
