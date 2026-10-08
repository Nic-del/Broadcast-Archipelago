#!/bin/bash
# Exit on error
set -e

echo "==========================================="
echo "  COMPLETE BROADCAST LINUX INSTALLATION"
echo "==========================================="
echo ""

# STEP 1: Install Python dependencies
echo "STEP 1: Installing Python dependencies (websockets, psutil)..."
if command -v python3 &>/dev/null; then
    PYTHON_CMD="python3"
elif command -v python &>/dev/null; then
    PYTHON_CMD="python"
else
    echo "[ERROR] Python is not installed or not in PATH!"
    echo "Please install Python 3 (3.10+) and try again."
    exit 1
fi

echo "Using Python: $($PYTHON_CMD --version)"

# Check if we need --break-system-packages (for PEP 668 managed environments)
PIP_FLAGS=""
if $PYTHON_CMD -m pip install --help 2>&1 | grep -q "break-system-packages"; then
    PIP_FLAGS="--break-system-packages"
fi

$PYTHON_CMD -m pip install websockets psutil $PIP_FLAGS

echo "[OK] Python dependencies installed successfully!"
echo ""

echo "==========================================="
echo "ALL INSTALLATIONS ARE COMPLETE!"
echo "==========================================="

