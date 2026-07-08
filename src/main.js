const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');

let mainWindow;

app.setAppUserModelId('io.github.dai2010.elegantclock');

function getWindowFromEvent(event) {
  return BrowserWindow.fromWebContents(event.sender);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 560,
    height: 820,
    minWidth: 420,
    minHeight: 620,
    title: 'Elegant Clock',
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    show: false,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
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

ipcMain.handle('app:get-version', () => app.getVersion());

ipcMain.handle('notification:show', (event, options = {}) => {
  const window = getWindowFromEvent(event);
  const title = String(options.title || 'Elegant Clock');
  const body = String(options.body || '提醒时间到了');

  if (Notification.isSupported()) {
    const notification = new Notification({
      title,
      body,
      silent: false
    });

    notification.on('click', () => {
      window?.show();
      window?.focus();
    });

    notification.show();
  } else {
    window?.flashFrame(true);
  }

  if (options.focus) {
    window?.show();
    window?.focus();
  }

  return true;
});

ipcMain.on('window:minimize', (event) => {
  getWindowFromEvent(event)?.minimize();
});

ipcMain.on('window:toggle-maximize', (event) => {
  const window = getWindowFromEvent(event);
  if (!window) {
    return;
  }

  if (window.isMaximized()) {
    window.unmaximize();
  } else {
    window.maximize();
  }
});

ipcMain.on('window:close', (event) => {
  getWindowFromEvent(event)?.close();
});

ipcMain.on('window:set-always-on-top', (event, enabled) => {
  getWindowFromEvent(event)?.setAlwaysOnTop(Boolean(enabled), 'floating');
});
