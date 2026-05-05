# 🚀 BroadCast Archipelago - Universal Premium Overlay

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Electron](https://img.shields.io/badge/Electron-Latest-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)

**BroadCast Archipelago** is a premium notification suite designed for **Archipelago Multiworld** sessions. It provides real-time tracking of sent and received items with a modern, fluid aesthetic that is entirely customizable.

---

## ✨ Latest Features (v1.1.0)

### 🖼️ Custom Avatars & Friends Library
- **Player Avatars**: Personalize your notifications by uploading custom images for each player in your Multiworld.
- **Friends Library**: Save your favorite avatars to a library to reuse them across different slots or sessions.
- **Custom Mode**: Independently toggle custom avatars for your **Desktop Overlay** and **OBS Stream Mode**.

### 📍 Item Location Tracking
- **Show Locations**: Know exactly where an item was found! Toggle location display to see the source of every notification.
- **Event History Integration**: Locations are preserved in the redesigned event history for better tracking of "who got what where".

### 🎨 Premium UI Redesign
- **Multi-Tab Interface**: A completely redesigned control panel with dedicated tabs for **Display**, **Settings**, **Hints**, **Room**, and **Custom**.
- **Modern Aesthetic**: Fluid animations, glassmorphism effects, and a more intuitive layout for managing your session.

### 🔍 Advanced Hint System
- **Smart Autocomplete**: Search for items and groups with a real-time filtered list. Suggestions appear below the search bar for better visibility.
- **Hint Point Tracking**: Live tracking of your available hint points and the cost of the next hint.
- **Persistent Hint List**: All your hints are saved and organized in a dedicated tab, with clear visual indicators for found vs. missing items.

---

## 🕒 Previous Updates (v1.0.4)

### 👥 Smart Filtering & Player Tracking
- **Filtered Mode**: Tired of spam in massive Multiworlds? Precisely select which players you want to "follow".
- **Tracked Players**: Manage your tracking list directly from the overlay or via the launcher.
- **Noise Reduction**: Filter notifications to see only what matters to you or your group.

### ⚙️ In-Overlay Control Panel
- **Live Adjustments**: No need to restart the app! Toggle your sync mode (**Global**, **Personal**, **Filtered**) via the gear icon on the overlay.
- **Dual Syncing**: Configure independent sync modes for your **Desktop Overlay** and your **OBS Browser Source**.
- **Slot Management**: Switch profiles (Slots) instantly without manual disconnection.

---

## 🐧 Linux & Steam Deck (Bazzite) Support
This edition is fully optimized for Linux distributions, including immutable systems like **Bazzite** or **SteamOS**:
- 🏗️ **Hybrid Mode**: Native Python OBS server support if Node.js is unavailable.
- 🛡️ **Sandbox Bypass**: Pre-configured with `--no-sandbox` to avoid SUID errors on Linux.
- 📦 **AppImage Support**: Automatic detection of AppImage builds for a dependency-free installation.

---

## 🛠️ System Architecture

1.  **Control Center (`BroadCast-Archipelago.py`)**: The visual configuration interface to position the overlay and manage connections.
2.  **The Bridge (`broadcast/bridge.py`)**: The core engine maintaining the connection to the Archipelago server and handling data filtering.
3.  **Broadcast App (`broadcast-app`)**: The visual layer (Vite + React + Framer Motion) delivering smooth 60 FPS animations.

---

## ⚙️ Installation

### Windows
1. Run `INSTALLATION.bat` to install Python and Node.js dependencies.
2. Use `BroadCast-Archipelago.pyw` to configure your access.

### Linux / Steam Deck
1. Grant execution permissions: `chmod +x INSTALLATION.sh`
2. Run `./INSTALLATION.sh`.
3. Launch the system with `python3 BroadCast-Archipelago.py`.

---

## 🚀 Quick Start

> [!TIP]
> **Headless Mode**: Once configured, you can launch the system instantly without the control UI by running:
> `python3 start_cli.py` (Linux) or `start_cli.bat` (Windows).

### Sync Modes:
- **All Items (Global)**: Displays every single event in the Multiworld.
- **Filtered Items**: Displays only items from players in your "Tracked List".
- **My Items (Personal)**: Displays only what you send or receive.

### 📺 OBS Integration
- **Browser Source URL**: `http://localhost:5173/?view=obs`
- **Recommended Size**: 400x600 (or match your Overlay dimensions)


---

## 📝 Prerequisites
- **Python 3.12+**
- **Node.js 20+** (Recommended for the dynamic overlay)
- **Visual C++ Redistributable** (For Windows users)

---

<div align="center">
  <img width="400" alt="Screenshot 1" src="https://github.com/user-attachments/assets/0f35b070-1aed-45f5-8fd0-925cb91b2482" />
  <img width="300" alt="Screenshot 2" src="https://github.com/user-attachments/assets/2268cf3b-ff7b-4131-a49a-4ec43cd16164" />
</div>
