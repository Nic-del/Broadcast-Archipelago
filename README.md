# BroadCast Archipelago - Notification System (Linux Edition)

This system is a premium notification tool designed for **Archipelago Multiworld** sessions. It displays real-time sent and received items during your game with a polished and modern aesthetic.

## ✨ New Features & Updates

### 🚀 Release 1.1.0 (Latest)
- 🐧 **Universal Linux Compatibility**: Pre-configured with `--no-sandbox` to work across all major distributions without permission hurdles.
- 👥 **Dynamic Multi-Slot Support**: Track multiple players simultaneously (Format: `Slot1:Pass, Slot2:Pass`) and switch between them instantly.
- 📡 **Remote Sync Control**: Change Sync Modes (All, Filtered, Personal) and manage tracked players directly from the overlay interface.
- 🎥 **Enhanced OBS Integration**: Choose between **Global**, **Filtered**, and **Personal** synchronization specifically for your stream overlay.
- 🔍 **Monitoring & Diagnostics**: Built-in real-time logs and diagnostic tools to troubleshoot connection and system health.
- ⚡ **Performance Optimized**: Locked at 30 FPS with background throttling and hardware acceleration bypass.
- 🛡️ **Enhanced Window Management**: Protection against automatic "snapping" to (0,0) coordinates on focus loss.

### 🌟 Core Features
- 🖱️ **Interactive Screen Preview**: Drag and move your overlay window directly from the Control Center's mini-map preview.
- 📍 **Smart Draggable Button**: A multi-purpose button to toggle history or move the window. It automatically jumps to the other side if pushed against a screen edge.
- 🧪 **Integrated Testing Suite**: Instantly verify your layout with the "SEND TEST MESSAGES" or "TEST" buttons.
- 📺 **Intelligent Multi-Monitor Logic**: Enhanced screen detection and automatic notification flipping based on window position.
- 🖥️ **Hardware Acceleration Bypass**: Automatically disables GPU acceleration for the UI to prioritize your game's graphics card usage.

## 🛠️ How it works?

The system relies on three main components working together:

### 1. The Control Center (`BroadCast-Archipelago.py`)

This is the visual "brain". This interface allows you to:

- **Live Preview**: Drag the purple rectangle on the mini-map to position your overlay precisely.
- **Connection**: Configure your connection information (Server, Slot, Password).
- **Control**: Select which screen to use and trigger test notifications.
- **Filtering**: Choose the filtering mode (All, Filtered, Personal).
- **Monitoring**: See the status of the local bridge and Electron app.

### 2. The Bridge (`broadcast/bridge.py`)

An invisible component running in the background:

- It maintains the connection with the **Archipelago** server.
- It translates technical server messages into readable notifications.
- It distributes this information via a local WebSocket server.
- It relays configuration changes and test triggers between all connected displays.

### 3. The Broadcast App (`broadcast-app`)

This is the visual layer (developed with Vite + Electron):

- **Premium UI**: Elegant notifications with smooth animations and glowing accents.
- **Interaction**: Features a smart draggable handle that flips sides based on screen position.
- **OBS Ready**: Fully optimized for transparency and window capture.

---

## ⚙️ Installation

Before launching the system for the first time, you must install the necessary dependencies:

1.  **`INSTALLATION.sh`**: Runs the full installation. This is the script to use for a first-time setup.
    _Note: Ensure `python3`, `node`, and `npm` are installed._

---

## 🚀 Usage

> [!TIP]
> **Quick Launch**: After your first configuration, you can launch the system instantly using **`python3 start_cli.py`** without opening the full Control Center.

### Standard Mode (Control Interface)

1.  **Launch**: Execute the file `python3 BroadCast-Archipelago.py`.
2.  **Configuration**:
    - Enter the server address (e.g., `archipelago.gg:38210`).
    - Enter your Slot name (player).
    - **Multi-Slots**: (Optional) Enter other slots to track (Format: `Slot1:Pass, Slot2:Pass`).
    - **Tracked Players**: (Optional) In Filtered mode, comma-separated list of players to track.
    - Adjust position by dragging the rectangle in the **SCREEN PREVIEW**.

3.  **Start**: Click **START SYSTEM**.
    - The necessary processes will launch automatically.
4.  **Reposition**: Once the overlay is open, you can also move it directly using the small circular "Grab" handle on the side of the window.

### Fast Mode (Headless)

Once you have configured your information via the Control Center, you no longer need to use it.

- You can directly launch the file **`python3 start_cli.py`**.
- This will launch the system in the background using your last saved settings.

---

## 🎭 Tracking Modes & Personalization

- **All Items (Global)**: Displays absolutely everything happening in the Multiworld.
- **Filtered Items**: Displays only items related to a specific list of players.
- **My Items (Personal)**: Displays only items you send or receive.
- **Dynamic Control**: You can switch between these modes directly from the interactive history panel at any time.

---

<img width="419" height="703" alt="image" src="https://github.com/user-attachments/assets/0f35b070-1aed-45f5-8fd0-925cb91b2482" /> <img width="316" height="700" alt="image" src="https://github.com/user-attachments/assets/2268cf3b-ff7b-4131-a49a-4ec43cd16164" />

## 📝 Requirements

- **Python 3.12** (for the Bridge and Launcher): [Download here](https://www.python.org/downloads/release/python-31210/)
- **Node.js** (for the visual rendering engine): [Download here](https://nodejs.org/en)
- Dependencies installed via the provided `.sh` script.
