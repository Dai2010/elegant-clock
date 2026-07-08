const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function getWindowFromEvent(event) {
  return BrowserWindow.fromWebContents(event.sender);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 520,
    height: 620,
    minWidth: 420,
    minHeight: 520,
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
