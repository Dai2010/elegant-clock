const { app, BrowserWindow, dialog, ipcMain, Notification } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

let mainWindow;

app.setAppUserModelId('io.github.dai2010.elegantclock');

function getWindowFromEvent(event) {
  return BrowserWindow.fromWebContents(event.sender);
}

function getDefaultRingtonePath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets', 'audio', '热风.mp3');
  }

  return path.join(__dirname, 'assets', 'audio', '热风.mp3');
}

function createRingtonePayload(filePath) {
  return {
    path: filePath,
    url: pathToFileURL(filePath).toString(),
    name: path.basename(filePath)
  };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 560,
    height: 430,
    minWidth: 420,
    minHeight: 320,
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

ipcMain.handle('app:get-default-ringtone', () => createRingtonePayload(getDefaultRingtonePath()));

ipcMain.handle('ringtone:choose', async (event) => {
  const window = getWindowFromEvent(event);
  const dialogOptions = {
    title: '选择闹钟铃声',
    properties: ['openFile'],
    filters: [
      { name: '音频文件', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  };
  const result = window
    ? await dialog.showOpenDialog(window, dialogOptions)
    : await dialog.showOpenDialog(dialogOptions);

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return createRingtonePayload(result.filePaths[0]);
});

ipcMain.handle('notification:show', (event, options = {}) => {
  const window = getWindowFromEvent(event);
  const title = String(options.title || 'Elegant Clock');
  const body = String(options.body || '提醒时间到了');

  if (Notification.isSupported()) {
    const notification = new Notification({
      title,
      body,
      silent: true
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
