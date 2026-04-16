# BroadCast Archipelago - Notification System

This system is a premium notification tool designed for **Archipelago Multiworld** sessions. It displays real-time sent and received items during your game with a polished and modern aesthetic.

## ✨ New Features & Updates

### 🚀 Release 1.0.3 (Latest)

- 🔀 **Dynamic Multi-Slot Support**: Switch between multiple pre-configured Archipelago slots instantly from the history panel.


### 🌟 Core Features
- 🖱️ **Interactive Screen Preview**: Drag and move your overlay window directly from the Control Center's mini-map preview.
- 📍 **Smart Draggable Button**: A single, multi-purpose button to toggle history or move the window.
- 🧪 **Integrated Testing Suite**: Instant verification with the "TEST" button.
- 📺 **Intelligent Multi-Monitor Logic**: Enhanced screen detection and automatic notification flipping based on window position.
- 🖥️ **Hardware Acceleration Bypass**: Automatically disables GPU acceleration for the UI to prioritize your game's graphics card usage.
- 🎨 **Smart Render Throttling**: The overlay now limits itself to 30 FPS and throttles resources when idle or hidden.

## 🛠️ How it works?

The system relies on three main components working together:

### 1. The Control Center (`BroadCast-Archipelago.pyw`)

This is the visual "brain". This interface allows you to:

- **Live Preview**: Drag the purple rectangle on the mini-map to position your overlay precisely.
- **Connection**: Configure your connection information (Server, Slot, Password).
- **Control**: Select which screen to use and trigger test notifications.
- **Filtering**: Choose the filtering mode (see all items or only yours).
- **Monitoring**: See the status of the local bridge and Electron app.

### 2. The Bridge (`broadcast/bridge.py`)

An invisible component running in the background:

- It maintains the connection with the **Archipelago** server.
- It translates technical server messages into readable notifications (e.g., "Link sent a Master Sword to Zelda").
- It distributes this information to the visual part via a local WebSocket server.
- It relays test triggers from the Control Center to all active displays.

### 3. The Broadcast App (`broadcast-app`)

This is the visual layer (developed with Vite + Electron):

- **Premium UI**: Elegant notifications with smooth animations and glowing accents.
- **Interaction**: Features a smart draggable handle that flips sides based on screen position.
- **OBS Ready**: Fully optimized for transparency and window capture.

---

## ⚙️ Installation

Before launching the system for the first time, you must install the necessary dependencies. Automated scripts are provided to make this easy:

1.  **`INSTALLATION.bat`**: Runs the full installation. This is the script to use for a first-time setup.
2.  **`INSTALL_PYTHON_ONLY.bat`**: Installe only Python libraries (`websockets`, `psutil`). _Requires Python 3.12 installed._
3.  **`INSTALL_NODE_ONLY.bat`**: Installs only Node.js modules for the visual interface. _Requires Node.js installed._

---

## 🚀 Usage

### Standard Mode (Control Interface)


1.  **Launch**: Execute the file `BroadCast-Archipelago.pyw`.
2.  **Configuration**:
    - Enter the server address (e.g., `archipelago.gg:38210`).
    - Enter your Slot name (player).
    - **Multi-Slots**: (Optional) Enter other slots to track (Format: `Slot1:Pass, Slot2:Pass`). You'll be able to switch between them instantly in the history panel.
    - Adjust position by dragging the rectangle in the **SCREEN PREVIEW**.

3.  **Start**: Click **START SYSTEM**.
    - The necessary processes will launch automatically.
4.  **Reposition**: Once the overlay is open, you can also move it directly using the small circular "Grab" handle on the side of the window.

### Fast Mode (Headless)

Once you have configured your information via the Control Center, you no longer need to use it.

- You can directly launch the file **`Start_CLI.bat`**.
- This will launch the system in the background using your last saved settings.

---

## 🎭 Tracking Modes

- **All Items**: Displays absolutely everything happening in the Multiworld (Ideal for commentators or chaos).
- **My Items**: Displays only items you send or receive.
- **OBS Mode**: Optimized for streamers. Use the local URL in an OBS Browser Source:
  `http://localhost:5173/?mode=obs`

---

<img width="419" height="703" alt="image" src="https://github.com/user-attachments/assets/0f35b070-1aed-45f5-8fd0-925cb91b2482" /> <img width="316" height="700" alt="image" src="https://github.com/user-attachments/assets/2268cf3b-ff7b-4131-a49a-4ec43cd16164" />

## 📝 Requirements

- **Python 3.12** (for the Bridge and Launcher): [Download here](https://www.python.org/downloads/release/python-31210/)
- **Node.js** (for the visual rendering engine): [Download here](https://nodejs.org/en)
- Dependencies installed via the provided `.bat` scripts.
