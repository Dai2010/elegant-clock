const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('elegantClock', {
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getAboutInfo: () => ipcRenderer.invoke('app:get-about-info'),
  openAbout: () => ipcRenderer.invoke('app:open-about'),
  openExternal: (url) => ipcRenderer.invoke('app:open-external', String(url)),
  getDefaultRingtone: () => ipcRenderer.invoke('app:get-default-ringtone'),
  getAutostart: () => ipcRenderer.invoke('app:get-autostart'),
  setAutostart: (enabled) => ipcRenderer.invoke('app:set-autostart', Boolean(enabled)),
  chooseRingtone: () => ipcRenderer.invoke('ringtone:choose'),
  minimize: () => ipcRenderer.send('window:minimize'),
  hideToTray: () => ipcRenderer.send('window:hide-to-tray'),
  toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
  close: () => ipcRenderer.send('window:close'),
  setAlwaysOnTop: (enabled) => ipcRenderer.send('window:set-always-on-top', Boolean(enabled)),
  setCompactMode: (enabled) => ipcRenderer.invoke('window:set-compact-mode', Boolean(enabled)),
  moveWindowBy: (deltaX, deltaY) => ipcRenderer.send('window:move-by', {
    deltaX: Number(deltaX) || 0,
    deltaY: Number(deltaY) || 0
  }),
  onRestoreFullUi: (callback) => {
    if (typeof callback !== 'function') {
      return () => {};
    }

    const listener = () => callback();
    ipcRenderer.on('window:restore-full-ui', listener);
    return () => ipcRenderer.removeListener('window:restore-full-ui', listener);
  },
  showNotification: (options) => ipcRenderer.invoke('notification:show', {
    title: options?.title,
    body: options?.body,
    focus: Boolean(options?.focus)
  }),
  platform: process.platform
});
