const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function getSettingsPath() {
  const searchDirs = [
    __dirname,
    path.dirname(process.execPath),
    process.cwd()
  ];
  
  for (const baseDir of searchDirs) {
    let currentDir = baseDir;
    for (let i = 0; i < 5; i++) {
      const checkPath = path.join(currentDir, 'broadcast_settings.json');
      if (fs.existsSync(checkPath)) {
        return checkPath;
      }
      const parent = path.dirname(currentDir);
      if (parent === currentDir) break;
      currentDir = parent;
    }
  }
  
  return app.isPackaged
    ? path.join(path.dirname(process.execPath), 'broadcast_settings.json')
    : path.join(__dirname, '..', 'broadcast_settings.json');
}

function getUserDataPath() {
  const settingsPath = getSettingsPath();
  const baseDir = path.dirname(settingsPath);
  return path.join(baseDir, '.electron_data');
}

// OPTIMIZATION: Limit FPS and resource usage to save performance for the game
app.commandLine.appendSwitch('limit-fps', '30'); // Limit overlay logic/render to 30fps
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache'); // FIX: Prevent GPU cache "Access Denied" errors
app.commandLine.appendSwitch('disable-http-cache'); // FIX: Prevent general disk cache errors

// COMPATIBILITY: Fix for Windows 10/11 to prevent the overlay from being hidden/paused by the OS
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

function loadSettingsSync() {
  const settingsPath = getSettingsPath();
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to load settings:", e);
  }
  return null;
}

// Check for hardware acceleration toggle before app is ready
const initialSettings = loadSettingsSync();
if (initialSettings && initialSettings.disable_hw_accel) {
  app.disableHardwareAcceleration();
}

// FIX: Set a custom user data path in the project folder to avoid conflicts with other Electron apps
const userDataPath = getUserDataPath();
if (!fs.existsSync(userDataPath)) fs.mkdirSync(userDataPath, { recursive: true });
app.setPath('userData', userDataPath);

function loadSettings() {
  const settingsPath = getSettingsPath();
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to load settings:", e);
  }
  return null;
}
function saveSettings(settings) {
  const settingsPath = getSettingsPath();
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4), 'utf8');
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
}

function createWindow() {
  const displays = screen.getAllDisplays();
  const settings = loadSettings();
  
  // Default to primary display
  let targetDisplay = screen.getPrimaryDisplay();
  
  if (settings) {
    if (settings.display_index !== undefined && settings.display_index !== -1) {
      if (displays[settings.display_index]) {
        targetDisplay = displays[settings.display_index];
      }
    } else if (displays.length > 1) {
      // If no setting but multiple screens, default to the last screen
      targetDisplay = displays[displays.length - 1];
    }
  } else if (displays.length > 1) {
    targetDisplay = displays[displays.length - 1];
  }

  const { x: dispX, y: dispY, width: dispW, height: dispH } = targetDisplay.workArea;
  console.log(`Targeting Display: ${targetDisplay.id} at ${dispX},${dispY} (${dispW}x${dispH})`);

  // Default values relative to target display
  let winW = 400;
  let winH = 600;
  let winX = dispX + dispW - 420;
  let winY = dispY + dispH - 620;

  if (settings) {
    if (settings.win_w) winW = parseInt(settings.win_w);
    if (settings.win_h) winH = parseInt(settings.win_h);
    
    // If X or Y is -1, use auto position relative to target display
    if (settings.win_x !== undefined && settings.win_x !== -1) {
      winX = parseInt(settings.win_x);
    }
    if (settings.win_y !== undefined && settings.win_y !== -1) {
      winY = parseInt(settings.win_y);
    }
  }

  const win = new BrowserWindow({
    width: winW,
    height: winH,
    x: winX,
    y: winY,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      backgroundThrottling: true, // Throttles animations/timers when window is not focused
      offscreen: false,
      devTools: false, // Disable devTools in production to save memory
      spellcheck: false,
    },
  });

  // WINDOWS 10/11 FIX: Set priority level to 'screen-saver' to stay above fullscreen games
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Load the Production Build or fall back to Dev Server
  const distPath = path.join(__dirname, 'dist', 'index.html');
  const syncMode = settings && settings.sync_mode ? settings.sync_mode : 'all';

  if (fs.existsSync(distPath)) {
    win.loadFile(distPath, { query: { view: 'overlay', sync: syncMode } });
  } else {
    win.loadURL(`http://localhost:5173?view=overlay&sync=${syncMode}`);
  }

  // OPTIMIZATION: Lower frame rate even further when not needed
  win.webContents.setFrameRate(30);

  // Savestate
  let isSavingBlocked = false;
  win.on('blur', () => {
    // Prevent saving if window snaps to (0,0) on blur (Linux/Desktop manager bug)
    isSavingBlocked = true;
    setTimeout(() => { isSavingBlocked = false; }, 500);
  });

  const saveState = () => {
    if (isSavingBlocked) return;
    
    const bounds = win.getBounds();
    
    // Safety check: Don't save (0,0) or tiny windows which are likely glitches
    if (bounds.x === 0 && bounds.y === 0) return;
    if (bounds.width < 10 || bounds.height < 10) return;

    const currentDisplay = screen.getDisplayMatching(bounds);
    const displays = screen.getAllDisplays();
    const displayIndex = displays.findIndex(d => d.id === currentDisplay.id);
    
    const currentSettings = loadSettings() || {};
    currentSettings.win_x = bounds.x;
    currentSettings.win_y = bounds.y;
    currentSettings.win_w = bounds.width;
    currentSettings.win_h = bounds.height;
    currentSettings.display_index = displayIndex;
    
    saveSettings(currentSettings);
    win.webContents.send('window-bounds-updated', bounds);
  };

  win.on('move', saveState);
  win.on('resize', saveState);

  // IPC Handlers
  ipcMain.handle('get-displays', () => {
    return screen.getAllDisplays().map(d => ({
      id: d.id,
      label: d.label,
      bounds: d.bounds,
      workArea: d.workArea,
      isPrimary: d.id === screen.getPrimaryDisplay().id
    }));
  });

  ipcMain.handle('get-window-bounds', () => {
    return win.getBounds();
  });

  ipcMain.on('set-display', (event, index) => {
    const displays = screen.getAllDisplays();
    const targetDisplay = displays[index];
    if (targetDisplay) {
      const { x, y, width, height } = targetDisplay.workArea;
      const bounds = win.getBounds();
      
      // Keep same size but move to target display (top right corner by default)
      win.setBounds({
        x: x + width - bounds.width - 20,
        y: y + height - bounds.height - 20,
        width: bounds.width,
        height: bounds.height
      });
      saveState();
    }
  });

  ipcMain.on('close-app', () => {
    app.quit();
  });

  // Watch for display changes
  const notifyDisplays = () => {
    win.webContents.send('displays-updated', screen.getAllDisplays().map(d => ({
      id: d.id,
      label: d.label,
      bounds: d.bounds,
      workArea: d.workArea,
      isPrimary: d.id === screen.getPrimaryDisplay().id
    })));
  };

  screen.on('display-added', notifyDisplays);
  screen.on('display-removed', notifyDisplays);
  screen.on('display-metrics-changed', notifyDisplays);
}

app.whenReady().then(() => {
  // Set App ID for Windows taskbar grouping
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.broadcast.app');
  }
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
