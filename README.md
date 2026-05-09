# 🚀 BroadCast Archipelago - Universal Premium Overlay

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Electron](https://img.shields.io/badge/Electron-Latest-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)

**BroadCast Archipelago** is a premium notification suite designed for **Archipelago Multiworld** sessions. It provides real-time tracking of sent and received items with a modern, fluid aesthetic that is entirely customizable.

---

## ✨ Latest Features (v1.1.0)

### 🖼️ Custom Avatars & Friends Library
- **Player Avatars**: Personalize your notifications by uploading custom images for each player.
- **Friends Library**: Save and reuse your favorite avatars across different slots or sessions.
- **Independent Customization**: Toggle custom avatars separately for your **Desktop Overlay** and **OBS Mode**.

### 🔍 Advanced Hint System
- **Smart Autocomplete**: Search for items and groups with a real-time filtered list (appears below the search bar).
- **Hint Point Tracking**: Live tracking of available points and hint costs directly in the UI.
- **Persistent Hint List**: Organized history of all hints with visual "found/missing" status.

### 📍 Item Location Tracking
- **Show Locations**: Know exactly where an item was found with the new "Display Locations" toggle.
- **History Integration**: Locations are preserved in the event history for full session tracking.

---

## 🛠️ Core Features

### ⚙️ Integrated Control Panel (Redesigned)
- **Multi-Tab Interface**: dedicated tabs for **Display**, **Settings**, **Hints**, **Room**, and **Custom**.
- **Live Adjustments**: Toggle sync modes (**Global**, **Personal**, **Filtered**) without restarting.
- **Timing Controls**: Precisely adjust notification duration via sliders (separate for Overlay and OBS).

### 👥 Smart Filtering & Multi-Slot
- **Filtered Mode**: Follow specific players or groups to reduce noise in massive Multiworlds.
- **Dynamic Multi-Slot**: Connect to multiple slots simultaneously using the `slot1:Pass, slot2:Pass` syntax.
- **Instant Switching**: Switch between active tracked players directly from the overlay.

### 📺 Professional OBS Integration
- **OBS Auto-Hide**: Optional fade-out for browser sources to keep your stream layout clean.
- **Independent Syncing**: Set OBS to "Filtered" while keeping your Desktop Overlay on "Global".
- **Optimized Rendering**: Framer Motion powered 60 FPS fluid animations.

---

## 🏗️ Technical Infrastructure

### 🖥️ Interactive Screen Preview
- **Visual Drag & Drop**: Move the overlay window directly by dragging the preview in the Control Center.
- **Smart Handle (Auto-Flip)**: The control button automatically flips to the opposite side if it gets too close to the screen edge.

### 🛡️ Stability & Performance
- **Smart Slot Cache**: The bridge remembers game links for slot names to eliminate "InvalidGame" errors.
- **Network Optimization**: Enhanced WebSocket handling with compression and local traffic priority.
- **Diagnostic Tools**: Real-time system logs and diagnostic indicators for quick troubleshooting.

## 🐧 Linux & Steam Deck (Bazzite) Support
This edition is fully optimized for Linux distributions, including immutable systems like **Bazzite** or **SteamOS**:
- 🏗️ **Hybrid Mode**: Native Python OBS server support if Node.js is unavailable.
- 🛡️ **Sandbox Bypass**: Pre-configured with `--no-sandbox` to avoid SUID errors on Linux.
- 📦 **AppImage Support**: Automatic detection of AppImage builds for a dependency-free installation.

## 🛠️ System Architecture

1.  **Control Center (`BroadCast-Archipelago.py`)**: The visual configuration interface to position the overlay and manage connections.
2.  **The Bridge (`broadcast/bridge.py`)**: The core engine maintaining the connection to the Archipelago server and handling data filtering.
3.  **Broadcast App (`broadcast-app`)**: The visual layer (Vite + React + Framer Motion) delivering smooth 60 FPS animations.

---

## ⚙️ Installation

### Windows
1. Run `INSTALLATION.bat` to install dependencies.
2. Launch `BroadCast-Archipelago.pyw` to configure and start.

### Linux / Steam Deck
1. Grant permissions: `chmod +x INSTALLATION.sh`
2. Run `./INSTALLATION.sh` and launch via `python3 BroadCast-Archipelago.py`.

---

## 🚀 Quick Start

> [!TIP]
> **Headless Mode**: Once configured, launch instantly without the UI by running `python3 start_cli.py` (Linux) or `start_cli.bat` (Windows).

### Sync Modes:
- **Global**: Displays every event in the Multiworld.
- **Filtered**: Displays only items involving players in your "Tracked List".
- **Personal**: Displays only items you send or receive.

## 📝 Prerequisites
- **Python 3.12+**
- **Node.js 20+** (Recommended for the dynamic overlay)

---

### 📺 OBS Integration
- **Browser Source URL**: `http://localhost:5173/?view=obs`
- **Recommended Size**: 400x600 (or match your Overlay dimensions)
---


<div align="center">
  <img width="400" alt="Screenshot 1" src="https://github.com/user-attachments/assets/0f35b070-1aed-45f5-8fd0-925cb91b2482" />
  <img width="300" alt="Screenshot 2" src="https://github.com/user-attachments/assets/2268cf3b-ff7b-4131-a49a-4ec43cd16164" />
</div>
