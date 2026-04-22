# 🚀 BroadCast Archipelago - Universal Premium Overlay

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Electron](https://img.shields.io/badge/Electron-Latest-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)

**BroadCast Archipelago** is a premium notification suite designed for **Archipelago Multiworld** sessions. It provides real-time tracking of sent and received items with a modern, fluid aesthetic that is entirely customizable.

---

## ✨ New Features (v1.0.4)

### 👥 Smart Filtering & Player Tracking
- **Filtered Mode**: Tired of spam in massive Multiworlds? Precisely select which players you want to "follow".
- **Tracked Players**: Manage your tracking list directly from the overlay or via the launcher.
- **Noise Reduction**: Filter notifications to see only what matters to you or your group.

### ⚙️ In-Overlay Control Center
- **Live Settings**: No need to restart the app! Change your sync mode (**Global**, **Personal**, **Filtered**) via the gear icon on the overlay.
- **Dual Sync**: Configure different modes for your **Desktop Overlay** and your **OBS Browser Source**.
- **Slot Management**: Switch profiles (Slots) instantly without manual disconnection.
- **Notification Timings**: Adjust how long messages stay on screen and toggle auto-hide for OBS.

---

## 🐧 Linux & Steam Deck (Bazzite) Specifics
This edition is optimized for Linux distributions, including immutable systems like **Bazzite** or **SteamOS**:
- 🏗️ **Hybrid Mode**: Supports OBS server via native Python if Node.js is not available.
- 🛡️ **Sandbox Bypass**: Pre-configured with `--no-sandbox` to avoid SUID errors on Linux.
- 📦 **AppImage Support**: Automatic detection of AppImage builds for dependency-free installation.

---

## 🛠️ System Architecture

1.  **Control Center (`BroadCast-Archipelago.py`)**: Visual configuration interface to position the overlay and adjust connection settings.
2.  **The Bridge (`broadcast/bridge.py`)**: The heart of the system that maintains the connection with the Archipelago server and handles data filtering.
3.  **Broadcast App (`broadcast-app`)**: The visual layer (Vite + React + Framer Motion) providing smooth 60 FPS animations.
