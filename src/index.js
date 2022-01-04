const { app, BrowserWindow, ipcMain, dialog, Menu, MenuItem, shell } = require('electron');
const store = require('electron-store');
const log = require('electron-log');
const { debugInfo } = require('electron-util');
const { download } = require('electron-dl');
const { extract7zip, findExecutable } = require('./loading/scripts/loadingScripts.js');
const { logError } = require('./userPreferences.js');
const fsp = require('fs').promises;
const path = require('path');
let startupConsoleMessage = `DARE v${app.getVersion()}\n`;

store.initRenderer();
log.info(debugInfo());

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
    app.quit();
}

const createMainWindow = () => {
    log.verbose('Main window spawned');

    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 1600,
        height: 1000,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true,
            enableRemoteModule: true
        }
    });

    mainWindow.maximize();

    // Menu items
    const mainMenu = new Menu();
    mainMenu.append(new MenuItem({
        label: 'File',
        submenu: [
            {
                role: 'reload',
                accelerator: 'CmdOrCtrl+R',
                click: () => { mainWindow.webContents.send('reload', true) }
            },
            {
                role: 'forceReload',
                accelerator: 'CmdOrCtrl+Shift+R',
                click: () => { mainWindow.webContents.send('force-reload', true) }
            },
            {
                role: 'toggleDevTools',
                accelerator: 'CmdOrCtrl+Shift+I',
                click: () => { mainWindow.BrowserWindow.openDevTools() }
            },
            {
                role: 'quit',
                accelerator: 'CmdOrCtrl+Q',
                click: () => { app.quit() }
            }
        ]
    }));

    Menu.setApplicationMenu(mainMenu);

    app.once('browser-window-created', () => {
        mainWindow.webContents.send('system-locale', app.getLocale());
        mainWindow.webContents.send('app-version', app.getVersion());
    });

    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, 'main', 'index.html'));

    // Hide menubar
    mainWindow.setMenuBarVisibility(false);

    // Open the DevTools.
    mainWindow.webContents.openDevTools();
};

const createLoadingWindow = () => {
    log.verbose('Loading window spawned');

    const loadingWindow = new BrowserWindow({
        width: 400,
        height: 250,
        frame: false,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true,
            enableRemoteModule: true
        }
    });

    // Menu items
    const loadingMenu = new Menu();
    loadingMenu.append(new MenuItem({
        label: 'File',
        submenu: [{
            role: 'toggleDevTools',
            accelerator: 'CmdOrCtrl+Shift+I',
            click: () => { mainWindow.BrowserWindow.openDevTools() }
        },
        {
            role: 'quit',
            accelerator: 'CmdOrCtrl+Q',
            click: () => { app.quit() }
        }]
    }));

    Menu.setApplicationMenu(loadingMenu);

    // Set window as non resizable and non closeable
    loadingWindow.setResizable(false);
    loadingWindow.setClosable(false);

    // and load the index.html of the app.
    loadingWindow.loadFile(path.join(__dirname, 'loading', 'index.html'));

    // Hide menubar
    loadingWindow.setMenuBarVisibility(false);

    // Open the DevTools.
    // loadingWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
    createLoadingWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
let fsopSemaphore = false;

ipcMain.on('loadingDone', (event, args) => {
    startupConsoleMessage += args.consoleMessage;
    createMainWindow();
    BrowserWindow.fromId(event.frameId).destroy();
    log.verbose('Loading window destroyed');
});

ipcMain.handle('download', async (event, { url, dlPath }) => {
    if (event.sender.getURL().includes('loading')) {
        let dlData;
        fsopSemaphore = true;
        await download(BrowserWindow.fromId(event.frameId), url, { directory: dlPath, saveAs: false, overwrite: true, onCompleted: (res) => { dlData = res } });
        return dlData;
    }
});

ipcMain.handle('decompress7zip', async (_, args) => {
    let archivePath = args.path;
    let exeDir = path.parse(archivePath).dir;

    await extract7zip(archivePath)
    let dcgPath = path.join(exeDir, findExecutable(exeDir).name);
    await fsp.chmod(dcgPath, 0o744);
    fsopSemaphore = false;
    return dcgPath;
});

ipcMain.handle('getFSOPSemaphore', () => {
    return fsopSemaphore;
});

ipcMain.on('setFSOPSemaphore', (_, args) => {
    fsopSemaphore = args;
})

ipcMain.on('selectOutputPath', (event) => {
    event.reply('selectOutputPath-reply', dialog.showOpenDialogSync({ title: 'Select Output Path', properties: ['openDirectory', 'createDirectory', 'dontAddToRecent'] }))
});

ipcMain.on('selectDCGPath', (event) => {
    event.reply('selectDCGPath-reply', dialog.showOpenDialogSync({ title: 'Select DCG Path', filters: { name: 'Executable Files', extensions: ['exe'] }, properties: ['openFile', 'createDirectory', 'dontAddToRecent'] }))
});

ipcMain.on('openExplorer', (_, args) => {
    if (args) {
        shell.openPath(args[0]);
    }
});

ipcMain.on('getStartupConsoleMessage', (event) => { event.reply('getStartupConsoleMessage-reply', startupConsoleMessage) });
