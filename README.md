# BroadCast Archipelago - Notification System

This system is a premium notification tool designed for **Archipelago Multiworld** sessions. It displays real-time sent and received items during your game with a polished and modern aesthetic.

## 🛠️ How it works?

The system relies on three main components working together:

### 1. The Control Center (`BroadCast-Archipelago.pyw`)

This is the visual "brain". This interface allows you to:

- Configure your connection information (Server, Slot, Password).
- Choose which screen to display notifications on.
- Adjust the exact size and position of the broadcast window.
- Choose the filtering mode (see all items or only yours).

### 2. The Bridge (`broadcast/bridge.py`)

An invisible component running in the background:

- It maintains the connection with the **Archipelago** server.
- It translates technical server messages into readable notifications (e.g., "Link sent a Master Sword to Zelda").
- It distributes this information to the visual part via a local WebSocket server.

### 3. The Broadcast App (`broadcast-app`)

This is the visual layer (developed with Vite + Electron):

- It receives data from the Bridge.
- It displays elegant notifications with smooth animations.
- It is optimized to be transparent and integrate perfectly over your game or in **OBS**.

---

## ⚙️ Installation

Before launching the system for the first time, you must install the necessary dependencies. Automated scripts are provided to make this easy:

1.  **`INSTALLATION.bat`**: Runs the full installation. This is the script to use for a first-time setup.
2.  **`INSTALL_PYTHON_ONLY.bat`**: Installe only Python libraries (`websockets`, `psutil`). *Requires Python 3.12 installed.*
3.  **`INSTALL_NODE_ONLY.bat`**: Installs only Node.js modules for the visual interface. *Requires Node.js installed.*

---

## 🚀 Usage

### Standard Mode (Control Interface)

1.  **Launch**: Execute the file `BroadCast-Archipelago.pyw`.
2.  **Configuration**:
    - Enter the server address (e.g., `archipelago.gg:38210`).
    - Enter your Slot name (player).
    - Adjust the window position (previewed on the small black rectangle).
3.  **Start**: Click **START SYSTEM**.
    - The necessary processes will launch automatically.
    - A broadcast window will appear on the selected screen.

### Fast Mode (Headless)

Once you have configured your information via the Control Center, you no longer need to use it.

- You can directly launch the file **`Start_CLI.bat`**.
- This will launch the system in the background using your last saved settings from `broadcast_settings.json`.
- This is ideal for an instant start once everything is properly set up.

---

## 🎭 Tracking Modes

- **All Items**: Displays absolutely everything happening in the Multiworld (Ideal for commentators or chaos).
- **My Items**: Displays only items you send or receive.
- **OBS Mode**: Optimized for streamers. You can integrate the following URL into OBS as a "Browser Source" for a professional look:
  `http://localhost:5173/?mode=obs`

---

<img width="419" height="703" alt="image" src="https://github.com/user-attachments/assets/0f35b070-1aed-45f5-8fd0-925cb91b2482" /> <img width="316" height="700" alt="image" src="https://github.com/user-attachments/assets/2268cf3b-ff7b-4131-a49a-4ec43cd16164" />

## 📝 Requirements

- **Python 3.12** (for the Bridge and Launcher).
- **Node.js** (for the visual rendering engine).
- Dependencies installed via the provided `.bat` scripts.
