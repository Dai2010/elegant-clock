const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('elegantClock', {
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  minimize: () => ipcRenderer.send('window:minimize'),
  toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
  close: () => ipcRenderer.send('window:close'),
  setAlwaysOnTop: (enabled) => ipcRenderer.send('window:set-always-on-top', Boolean(enabled)),
  platform: process.platform
});
