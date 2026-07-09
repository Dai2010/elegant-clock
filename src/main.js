const { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, Notification, screen, Tray } = require('electron');
const { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

let mainWindow;
let tray;
let isQuitting = false;
let compactMode = false;

const defaultWindowSize = {
  width: 560,
  height: 430,
  minWidth: 420,
  minHeight: 320
};

const compactWindowState = {
  bounds: null,
  maximized: false,
  fullscreen: false
};

const appId = 'io.github.dai2010.elegantclock';
const appDisplayName = 'Elegant Clock';
const autostartDesktopFileName = 'elegant-clock.desktop';
const windowsRunEntryName = 'Elegant Clock';
const autostartArgs = ['--autostart'];

const platformWindowConfig = {
  win32: {
    compactWidth: 420,
    compactHeight: 168,
    trayIconSize: 16
  },
  linux: {
    compactWidth: 440,
    compactHeight: 176,
    trayIconSize: 22
  },
  default: {
    compactWidth: 420,
    compactHeight: 168,
    trayIconSize: 18
  }
};

app.setAppUserModelId(appId);

function getWindowFromEvent(event) {
  return BrowserWindow.fromWebContents(event.sender);
}

function escapeDesktopEntryValue(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
}

function quoteDesktopExecPart(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function getLaunchPath() {
  return app.isPackaged ? process.execPath : process.argv[0];
}

function getAutostartLaunchArgs() {
  if (app.isPackaged) {
    return autostartArgs;
  }

  return [path.join(__dirname, '..'), ...autostartArgs];
}

function getLinuxAutostartPath() {
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(configHome, 'autostart', autostartDesktopFileName);
}

function getLinuxDesktopEntry() {
  const execParts = [getLaunchPath(), ...getAutostartLaunchArgs()].map(quoteDesktopExecPart).join(' ');
  const iconPath = getIconPath();

  return [
    '[Desktop Entry]',
    'Type=Application',
    `Name=${escapeDesktopEntryValue(appDisplayName)}`,
    'Comment=Launch Elegant Clock on login',
    `Exec=${execParts}`,
    `Icon=${escapeDesktopEntryValue(iconPath)}`,
    'Terminal=false',
    'Categories=Utility;',
    'X-GNOME-Autostart-enabled=true',
    `StartupWMClass=${escapeDesktopEntryValue(appDisplayName)}`,
    ''
  ].join('\n');
}

function getWindowsLoginItemSettings() {
  if (app.isPackaged) {
    return app.getLoginItemSettings({
      path: process.execPath,
      args: autostartArgs,
      name: windowsRunEntryName
    });
  }

  return app.getLoginItemSettings({
    path: process.argv[0],
    args: getAutostartLaunchArgs(),
    name: windowsRunEntryName
  });
}

function setWindowsAutostart(enabled) {
  const options = app.isPackaged
    ? {
        openAtLogin: enabled,
        openAsHidden: false,
        path: process.execPath,
        args: autostartArgs,
        name: windowsRunEntryName
      }
    : {
        openAtLogin: enabled,
        openAsHidden: false,
        path: process.argv[0],
        args: getAutostartLaunchArgs(),
        name: windowsRunEntryName
      };

  app.setLoginItemSettings(options);
}

function getAutostartInfo() {
  if (process.platform === 'win32') {
    const loginSettings = getWindowsLoginItemSettings();
    return {
      supported: true,
      enabled: Boolean(loginSettings.openAtLogin),
      method: 'Windows 登录启动项',
      detail: '通过当前用户的 Windows 登录启动项配置'
    };
  }

  if (process.platform === 'linux') {
    const autostartPath = getLinuxAutostartPath();
    let enabled = false;

    if (existsSync(autostartPath)) {
      try {
        enabled = !/^Hidden\s*=\s*true\s*$/im.test(readFileSync(autostartPath, 'utf8'));
      } catch {
        enabled = true;
      }
    }

    return {
      supported: true,
      enabled,
      method: 'XDG Autostart',
      detail: '写入 ~/.config/autostart/elegant-clock.desktop，适配 GNOME、KDE、Cinnamon、LXQt、Xfce 等桌面'
    };
  }

  return {
    supported: false,
    enabled: false,
    method: '不支持的平台',
    detail: '当前平台暂未提供开机自启动配置'
  };
}

function setAutostart(enabled) {
  if (process.platform === 'win32') {
    setWindowsAutostart(enabled);
    return getAutostartInfo();
  }

  if (process.platform === 'linux') {
    const autostartPath = getLinuxAutostartPath();

    if (enabled) {
      mkdirSync(path.dirname(autostartPath), { recursive: true });
      writeFileSync(autostartPath, getLinuxDesktopEntry(), { encoding: 'utf8', mode: 0o644 });
    } else if (existsSync(autostartPath)) {
      unlinkSync(autostartPath);
    }

    return getAutostartInfo();
  }

  throw new Error('当前平台不支持开机自启动');
}

function getPlatformWindowConfig() {
  return platformWindowConfig[process.platform] || platformWindowConfig.default;
}

function getIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png');
  }

  if (process.platform === 'win32') {
    return path.join(__dirname, '..', 'build', 'icon.ico');
  }

  return path.join(__dirname, '..', 'build', 'icons', '512x512.png');
}

function getTrayIcon() {
  const icon = nativeImage.createFromPath(getIconPath());
  const { trayIconSize } = getPlatformWindowConfig();

  return icon.isEmpty()
    ? icon
    : icon.resize({ width: trayIconSize, height: trayIconSize });
}

function clampBoundsToWorkArea(bounds) {
  const display = screen.getDisplayNearestPoint({
    x: Math.round(bounds.x + bounds.width / 2),
    y: Math.round(bounds.y + bounds.height / 2)
  });
  const { workArea } = display;
  const width = Math.min(bounds.width, workArea.width);
  const height = Math.min(bounds.height, workArea.height);
  const maxX = workArea.x + workArea.width - width;
  const maxY = workArea.y + workArea.height - height;

  return {
    x: Math.min(Math.max(Math.round(bounds.x), workArea.x), maxX),
    y: Math.min(Math.max(Math.round(bounds.y), workArea.y), maxY),
    width,
    height
  };
}

function getCompactBounds(window) {
  const { compactWidth, compactHeight } = getPlatformWindowConfig();
  const bounds = window.getBounds();

  return clampBoundsToWorkArea({
    x: bounds.x + (bounds.width - compactWidth) / 2,
    y: bounds.y + (bounds.height - compactHeight) / 2,
    width: compactWidth,
    height: compactHeight
  });
}

function requestFullUi(window = mainWindow) {
  if (!window || window.isDestroyed()) {
    return;
  }

  if (compactMode) {
    setWindowCompactMode(window, false);
  }

  window.show();
  window.focus();
  window.webContents.send('window:restore-full-ui');
}

function applyPlatformCompactMode(window, enabled) {
  if (process.platform === 'win32') {
    window.setSkipTaskbar(enabled);
    window.setFocusable(!enabled);
    window.setResizable(!enabled);
    return;
  }

  if (process.platform === 'linux') {
    window.setSkipTaskbar(enabled);
    window.setResizable(!enabled);
    return;
  }

  window.setSkipTaskbar(enabled);
  window.setFocusable(!enabled);
  window.setResizable(!enabled);
}

function setWindowCompactMode(window, enabled) {
  if (!window || window.isDestroyed()) {
    return false;
  }

  if (enabled) {
    if (compactMode) {
      return true;
    }

    compactWindowState.bounds = typeof window.getNormalBounds === 'function'
      ? window.getNormalBounds()
      : window.getBounds();
    compactWindowState.maximized = window.isMaximized();
    compactWindowState.fullscreen = window.isFullScreen();
    compactMode = true;

    if (compactWindowState.fullscreen) {
      window.setFullScreen(false);
    }

    if (compactWindowState.maximized) {
      window.unmaximize();
    }

    applyPlatformCompactMode(window, true);
    window.setMinimumSize(getPlatformWindowConfig().compactWidth, getPlatformWindowConfig().compactHeight);
    window.setBounds(getCompactBounds(window), false);
    window.showInactive();
    return true;
  }

  if (!compactMode) {
    applyPlatformCompactMode(window, false);
    window.show();
    window.focus();
    return true;
  }

  compactMode = false;
  applyPlatformCompactMode(window, false);
  window.setMinimumSize(defaultWindowSize.minWidth, defaultWindowSize.minHeight);

  if (compactWindowState.bounds && !compactWindowState.fullscreen) {
    window.setBounds(clampBoundsToWorkArea(compactWindowState.bounds), false);
  }

  if (compactWindowState.fullscreen) {
    window.setFullScreen(true);
  } else if (compactWindowState.maximized) {
    window.maximize();
  }

  window.show();
  window.focus();
  return true;
}

function updateTrayMenu() {
  if (!tray) {
    return;
  }

  const autostartInfo = getAutostartInfo();

  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: '显示完整窗口',
      click: () => requestFullUi()
    },
    {
      label: '隐藏到状态栏',
      click: () => mainWindow?.hide()
    },
    {
      label: '开机自启动',
      type: 'checkbox',
      enabled: autostartInfo.supported,
      checked: autostartInfo.enabled,
      click: (menuItem) => {
        try {
          setAutostart(menuItem.checked);
        } finally {
          updateTrayMenu();
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]));
}

function createTray() {
  if (tray) {
    return;
  }

  const trayIcon = getTrayIcon();
  if (trayIcon.isEmpty()) {
    return;
  }

  try {
    tray = new Tray(trayIcon);
  } catch {
    tray = null;
    return;
  }

  tray.setToolTip('Elegant Clock');
  tray.on('click', () => requestFullUi());
  tray.on('double-click', () => requestFullUi());
  updateTrayMenu();
}

function getDefaultRingtonePath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets', 'audio', 'ringtone_default.mp3');
  }

  return path.join(__dirname, 'assets', 'audio', 'ringtone_default.mp3');
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
    width: defaultWindowSize.width,
    height: defaultWindowSize.height,
    minWidth: defaultWindowSize.minWidth,
    minHeight: defaultWindowSize.minHeight,
    title: 'Elegant Clock',
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    icon: getIconPath(),
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

  mainWindow.on('close', (event) => {
    if (isQuitting || !tray) {
      return;
    }

    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit();
  }
});

ipcMain.handle('app:get-version', () => app.getVersion());

ipcMain.handle('app:get-default-ringtone', () => createRingtonePayload(getDefaultRingtonePath()));

ipcMain.handle('app:get-autostart', () => getAutostartInfo());

ipcMain.handle('app:set-autostart', (_event, enabled) => {
  const autostartInfo = setAutostart(Boolean(enabled));
  updateTrayMenu();
  return autostartInfo;
});

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
      requestFullUi(window);
    });

    notification.show();
  } else {
    window?.flashFrame(true);
  }

  if (options.focus) {
    requestFullUi(window);
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

ipcMain.handle('window:set-compact-mode', (event, enabled) => setWindowCompactMode(getWindowFromEvent(event), enabled));

ipcMain.on('window:move-by', (event, positionDelta = {}) => {
  const window = getWindowFromEvent(event);
  if (!window || !compactMode) {
    return;
  }

  const bounds = window.getBounds();
  const nextBounds = clampBoundsToWorkArea({
    x: bounds.x + (Number(positionDelta.deltaX) || 0),
    y: bounds.y + (Number(positionDelta.deltaY) || 0),
    width: bounds.width,
    height: bounds.height
  });

  window.setBounds(nextBounds, false);
});

ipcMain.on('window:close', (event) => {
  getWindowFromEvent(event)?.close();
});

ipcMain.on('window:set-always-on-top', (event, enabled) => {
  getWindowFromEvent(event)?.setAlwaysOnTop(Boolean(enabled), 'floating');
});
