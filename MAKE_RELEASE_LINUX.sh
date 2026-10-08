#!/bin/bash
# Exit on error
set -e

# Change to the script directory
cd "$(dirname "$0")"

echo "============================================================="
echo "            BROADCAST ARCHIPELAGO - LINUX RELEASE CREATOR"
echo "============================================================="
echo ""

# 1. Trigger fresh clean compilation
echo "[1/4] Starting a clean application build for Linux..."
cd broadcast-app
# Clean old folders
rm -rf dist dist-packaged
# Install dependencies
npm install --legacy-peer-deps
# Build Linux overlay
npm run build:linux
cd ..
echo ""

# 2. Wiping and recreating release workspace
echo "[2/4] Setting up clean release directory 'dist-release'..."
rm -rf dist-release
mkdir -p dist-release/broadcast
mkdir -p dist-release/broadcast-app/dist-packaged
mkdir -p dist-release/broadcast-app/dist
echo "[SUCCESS] Release workspace is ready."
echo ""

# 3. Copying only necessary files
echo "[3/4] Copying required folders and files..."

# Copy root python launch files
cp BroadCast-Archipelago.pyw dist-release/
cp start_cli.py dist-release/
cp INSTALLATION.sh dist-release/
cp README.md dist-release/
cp LICENSE dist-release/
cp custom.example.css dist-release/

# Copy bridge connection scripts
cp broadcast/bridge.py dist-release/broadcast/
cp broadcast/extracted_items.txt dist-release/broadcast/
cp broadcast/index.html dist-release/broadcast/

# Copy compiled Electron standalone unpacked folder
cp -r broadcast-app/dist-packaged/linux-unpacked dist-release/broadcast-app/dist-packaged/
# Copy AppImage to release root for convenience (if built)
if ls broadcast-app/dist-packaged/Broadcast-Overlay*.AppImage 1> /dev/null 2>&1; then
    cp broadcast-app/dist-packaged/Broadcast-Overlay*.AppImage dist-release/broadcast-app/dist-packaged/
fi

# Copy compiled Vite static folder (for OBS Local File usage)
cp -r broadcast-app/dist dist-release/broadcast-app/

echo "[SUCCESS] All files copied successfully!"
echo ""

# 4. Generating archive
echo "[4/4] Creating tarball 'BroadCast-Archipelago-Linux.tar.gz' for distribution..."
rm -f BroadCast-Archipelago-Linux.tar.gz
tar -czf BroadCast-Archipelago-Linux.tar.gz dist-release
echo "[SUCCESS] Tarball successfully generated!"
echo ""

echo "============================================================="
echo "           RELEASE CREATED SUCCESSFULLY / SUCCES"
echo "============================================================="
echo ""
echo "Generated deliverables:"
echo "  - Clean Release Folder:"
echo "    [dist-release]"
echo "  - Compressed Tarball:"
echo "    [BroadCast-Archipelago-Linux.tar.gz]"
echo ""
echo "============================================================="
