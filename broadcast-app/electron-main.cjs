const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// OPTIMIZATION: Disable Hardware Acceleration to prevent game frame drops and stuttering
app.disableHardwareAcceleration();

// EXPERIMENTAL: Further optimize command line switches for low impact
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-gpu-rasterization');
app.commandLine.appendSwitch('limit-fps', '30'); // Limit overlay logic/render to 30fps to save resources for the game

function loadSettings() {
  const settingsPath = path.join(__dirname, '..', 'broadcast_settings.json');
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
  const settingsPath = path.join(__dirname, '..', 'broadcast_settings.json');
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

  // Load the Production Build or fall back to Dev Server
  const distPath = path.join(__dirname, 'dist', 'index.html');

  if (fs.existsSync(distPath)) {
    win.loadFile(distPath);
  } else {
    win.loadURL('http://localhost:5173');
  }

  // OPTIMIZATION: Lower frame rate even further when not needed
  win.webContents.setFrameRate(30);

  // Savestate
  const saveState = () => {
    const bounds = win.getBounds();
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
