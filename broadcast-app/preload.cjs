const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  getWindowBounds: () => ipcRenderer.invoke('get-window-bounds'),
  setDisplay: (index) => ipcRenderer.send('set-display', index),
  onDisplaysUpdated: (callback) => {
    const listener = (_event, displays) => callback(displays);
    ipcRenderer.on('displays-updated', listener);
    return () => ipcRenderer.removeListener('displays-updated', listener);
  },
  onWindowBoundsUpdated: (callback) => {
    const listener = (_event, bounds) => callback(bounds);
    ipcRenderer.on('window-bounds-updated', listener);
    return () => ipcRenderer.removeListener('window-bounds-updated', listener);
  }
});
