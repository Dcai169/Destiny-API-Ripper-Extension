const {app, BrowserWindow, ipcMain, dialog, Menu, MenuItem, shell} = require('electron');
const path = require('node:path');
const process = require('node:process');
const store = require('electron-store');

store.initRenderer();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Prevent windows from being garbage collected
let mainWindow;
// eslint-disable-next-line no-unused-vars
let settingsWindow;
// eslint-disable-next-line no-unused-vars
let dcgWindow;
let shouldReloadItems = false;

function setShouldReloadItemsHandler(_, flag) {
  shouldReloadItems = flag;
}

const createMainWindow = async () => {
  const _window = new BrowserWindow({
    width: 1600,
    height: 1000,
    webPreferences: {
      preload: path.join(__dirname, 'mainPreload.js'),
      sandbox: false,
    },
    backgroundColor: '#3E4145',
    icon: path.join(__dirname, 'styles', 'icons', 'icon_outline.png'),
    show: false,
  });
  _window.setMenuBarVisibility(false);
  _window.on('ready-to-show', () => {
    _window.show();
    _window.maximize();
  });
  _window.on('closed', () => {
    // Dereference the window
    mainWindow = undefined;
  });
  await _window.loadFile(path.join(__dirname, 'main.html'));
  return _window;
};

const createSettingsWindow = async () => {
  ipcMain.on('setShouldReloadItems', setShouldReloadItemsHandler);
  const parentWindow = BrowserWindow.getFocusedWindow();
  const _window = new BrowserWindow({
    width: 1000,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'settingsPreload.js'),
      sandbox: false,
    },
    backgroundColor: '#3E4145',
    icon: path.join(__dirname, 'styles', 'icons', 'icon_outline.png'),
    show: false,
    parent: parentWindow,
    modal: true,
  });
  _window.setMenuBarVisibility(false);
  _window.on('ready-to-show', () => {
    _window.show();
  });
  _window.on('close', async event => {
    event.preventDefault();
    // Avoid window flicker
    parentWindow.focus();
    _window.destroy();
    if (shouldReloadItems) {
      mainWindow.webContents.send('reload', true);
      setShouldReloadItemsHandler(null, false);
    }
  });
  _window.on('closed', () => {
    // Dereference the window
    settingsWindow = undefined;
    ipcMain.removeListener('setShouldReloadItems', setShouldReloadItemsHandler);
  });
  await _window.loadFile(path.join(__dirname, 'settings.html'));
  return _window;
};

const createDCGWindow = async () => {
  const parentWindow = BrowserWindow.getFocusedWindow();
  const _window = new BrowserWindow({
    width: 700,
    height: 300,
    webPreferences: {
      preload: path.join(__dirname, 'downloadDcgPreload.js'),
      sandbox: false,
    },
    backgroundColor: '#3E4145',
    icon: path.join(__dirname, 'styles', 'icons', 'icon_outline.png'),
    show: false,
    parent: parentWindow,
    modal: true,
  });
  _window.setMenuBarVisibility(false);
  _window.on('ready-to-show', () => {
    _window.show();
  });
  _window.on('closed', () => {
    // Dereference the window
    mainWindow = undefined;
  });
  await _window.loadFile(path.join(__dirname, 'downloadDcg.html'));
  return _window;
};

// Prevent multiple instances of the app
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }

    mainWindow.show();
  }
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = await createMainWindow();
  }
});

// eslint-disable-next-line unicorn/prefer-top-level-await
(async () => {
  await app.whenReady();
  ipcMain.handle('getPath', (_, f) => app.getPath(f));
  ipcMain.handle('getAppVersion', () => app.getVersion());
  mainWindow = await createMainWindow();
  // Menu items
  const mainMenu = new Menu();
  mainMenu.append(new MenuItem({
    label: 'File',
    submenu: [
      {
        role: 'reload',
        accelerator: 'CmdOrCtrl+R',
        click() {
          mainWindow.webContents.send('reload', true);
        },
      },
      {
        role: 'forceReload',
        accelerator: 'CmdOrCtrl+Shift+R',
        click() {
          mainWindow.webContents.send('force-reload', true);
        },
      },
      {
        role: 'toggleDevTools',
        accelerator: 'CmdOrCtrl+Shift+I',
        click() {
          mainWindow.BrowserWindow.openDevTools();
        },
      },
      {
        role: 'quit',
        accelerator: 'CmdOrCtrl+Q',
        click() {
          app.quit();
        },
      },
    ],
  }));

  Menu.setApplicationMenu(mainMenu);

  ipcMain.on('createSettingsWindow', async () => {
    settingsWindow = await createSettingsWindow();
  });
  ipcMain.on('createDCGWindow', async () => {
    dcgWindow = await createDCGWindow();
  });

  function openFileDialog(dialogTitle, isDir) {
    return dialog.showOpenDialogSync({
      title: dialogTitle,
      properties: [isDir ? 'openDirectory' : 'openFile', 'createDirectory', 'dontAddToRecent'],
    })?.pop();
  }

  ipcMain.handle('getNewPathForSettings', (_, dialogTitle, isDir) => openFileDialog(dialogTitle, isDir));
  ipcMain.on('openExplorer', (_, path) => {
    shell.openPath(path);
  });
  ipcMain.handle('isPackaged', () => app.isPackaged);
  ipcMain.handle('confirmDCGDownload', async () => {
    const choice = await (dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['No', 'Yes'],
      defaultId: 0,
      cancelId: 0,
      title: 'Confirmation',
      message: 'Download and configure DCG automatically?',
      detail: 'Destiny Collada Generator (DCG) is required, but not configured. You can let DARE handle that for you now or manually configure it later.',
    }));
    return choice.response;
  });
})();
