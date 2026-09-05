/**
 * GeoShield Electron Preload Script
 * Secure IPC bridge between renderer and main process.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => process.platform,

  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Server URL management
  setServerUrl: (url) => localStorage.setItem('geoshield_server_url', url),
  getServerUrl: () => localStorage.getItem('geoshield_server_url') || '',

  // Notifications
  showNotification: (title, body) => {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  },
});
