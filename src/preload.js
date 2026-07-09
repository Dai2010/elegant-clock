const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('elegantClock', {
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getDefaultRingtone: () => ipcRenderer.invoke('app:get-default-ringtone'),
  chooseRingtone: () => ipcRenderer.invoke('ringtone:choose'),
  minimize: () => ipcRenderer.send('window:minimize'),
  toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
  close: () => ipcRenderer.send('window:close'),
  setAlwaysOnTop: (enabled) => ipcRenderer.send('window:set-always-on-top', Boolean(enabled)),
  showNotification: (options) => ipcRenderer.invoke('notification:show', {
    title: options?.title,
    body: options?.body,
    focus: Boolean(options?.focus)
  }),
  platform: process.platform
});
