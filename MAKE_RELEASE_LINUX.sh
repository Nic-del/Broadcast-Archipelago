#!/bin/bash
# BROADCAST ARCHIPELAGO - LINUX RELEASE CREATOR

# Exit immediately if a command exits with a non-zero status
set -e

# Change directory to the script's directory
cd "$(dirname "$0")"

echo "============================================================="
echo "             BROADCAST ARCHIPELAGO - LINUX RELEASE"
echo "============================================================="
echo ""
echo "This script will build the application and package ONLY the"
echo "necessary files for Linux distribution into 'dist-release'"
echo "and compress it into a clean 'BroadCast-Archipelago-Linux.zip'."
echo ""

# 1. Trigger fresh compilation
echo "[1/4] Starting a clean application build for Linux..."
cd broadcast-app

# Clean previous build directories
if [ -d "dist" ]; then
    echo "  - Removing previous Vite 'dist' folder..."
    rm -rf dist
fi
if [ -d "dist-electron" ]; then
    echo "  - Removing previous Electron package 'dist-electron' folder..."
    rm -rf dist-electron
fi

echo "Installing/Verifying node modules..."
npm install --legacy-peer-deps

echo "Building UI and compiling AppImage..."
npm run pack:linux
cd ..

# 2. Setup clean release directory
echo "[2/4] Setting up clean release directory 'dist-release'..."
if [ -d "dist-release" ]; then
    rm -rf dist-release
fi
mkdir -p dist-release
mkdir -p dist-release/broadcast
mkdir -p dist-release/broadcast-app/dist-electron
mkdir -p dist-release/broadcast-app/dist

echo "[SUCCESS] Release workspace is ready."
echo ""

# 3. Copying only necessary files
echo "[3/4] Copying required folders and files..."

# Copy root python launch files
cp BroadCast-Archipelago.py dist-release/
cp start_cli.py dist-release/
cp INSTALLATION.sh dist-release/
cp README.md dist-release/
cp LICENSE dist-release/

# Make sure they are executable
chmod +x dist-release/BroadCast-Archipelago.py
chmod +x dist-release/start_cli.py
chmod +x dist-release/INSTALLATION.sh

# Copy bridge connection scripts
cp broadcast/bridge.py dist-release/broadcast/
cp broadcast/extracted_items.txt dist-release/broadcast/
cp broadcast/index.html dist-release/broadcast/

# Copy compiled AppImage
cp broadcast-app/dist-electron/*.AppImage dist-release/broadcast-app/dist-electron/

# Copy compiled Vite static folder (for OBS Local File usage)
cp -r broadcast-app/dist/* dist-release/broadcast-app/dist/

echo "[SUCCESS] All files copied successfully!"
echo ""

# 4. Generating ZIP archive
echo "[4/4] Creating ZIP archive 'BroadCast-Archipelago-Linux.zip'..."
if [ -f "BroadCast-Archipelago-Linux.zip" ]; then
    rm -f BroadCast-Archipelago-Linux.zip
fi

# Use zip command to package the release
cd dist-release
zip -r ../BroadCast-Archipelago-Linux.zip *
cd ..

echo "============================================================="
echo "       LINUX RELEASE CREATED SUCCESSFULLY!"
echo "============================================================="
echo ""
echo "Generated deliverables:"
echo "  - Clean Release Folder (exactly what users need):"
echo "    [dist-release]"
echo ""
echo "  - Compressed ZIP file (perfect for download / sharing):"
echo "    [BroadCast-Archipelago-Linux.zip]"
echo "============================================================="
