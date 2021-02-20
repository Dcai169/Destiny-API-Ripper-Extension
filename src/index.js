const { app, BrowserWindow, ipcMain, dialog, Menu, MenuItem, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { checkTool } = require('./scripts/toolWrapper.js');

let toolStatus = (() => {
    try {
        const userPreferences = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'user_preferences.json'), 'utf-8'));
        if (userPreferences.toolPath.value) {
            checkTool(userPreferences.toolPath.value).then(
                (fulfilled) => { return fulfilled }, 
                // Not found / not working
                (rejected) => { return [1] }
            );
        } else {
            // Tool path is falsey
            return [2];
        }
    } catch (error) {
        // First launch
        if (fs.existsSync(path.join(process.cwd(), 'bin'))) {
            let executables = fs.readdirSync(path.join(process.cwd(), 'bin'), { withFileTypes: true }).filter((i) => { return i.isFile() && i.name.split('.').reverse()[0] === 'exe' });
            if (executables.length === 1) {
                checkTool(path.join(process.cwd(), 'bin', executables[0].name)).then(
                    (fulfilled) => { return fulfilled }, 
                    (rejected) => { return [3] }
                );
            } else {
                // Multiple exes
                return [4]
            }
        } else {
            // ./bin does not exist
            fs.mkdirSync(path.join(process.cwd(), 'bin'));

        }
    }
})();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
    app.quit();
}

const createMainWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 1600,
        height: 1000,
        webPreferences: {
            nodeIntegration: true
        }
    });

    // Menu items
    const mainMenu = new Menu();
    mainMenu.append(new MenuItem({
        label: 'File',
        submenu: [{
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
        }]
    }));

    Menu.setApplicationMenu(mainMenu);

    app.once('browser-window-created', () => {
        mainWindow.webContents.send('system-locale', [app.getLocale()])
    });

    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, 'main', 'index.html'));

    // Hide menubar
    mainWindow.setMenuBarVisibility(false);

    // Open the DevTools.
    // mainWindow.webContents.openDevTools();
};

const createLoadingWindow = () => {
    const loadingWindow = new BrowserWindow({
        width: 400,
        height: 250,
        frame: false,
        webPreferences: {
            nodeIntegration: true
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
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createLoadingWindow);

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
ipcMain.on('selectOutputPath', (event) => {
    event.reply('selectOutputPath-reply', dialog.showOpenDialogSync({ title: 'Select Output Path', properties: ['openDirectory', 'createDirectory', 'dontAddToRecent'] }))
});

ipcMain.on('selectToolPath', (event) => {
    event.reply('selectToolPath-reply', dialog.showOpenDialogSync({ title: 'Select Tool Path', filters: { name: 'Executable Files', extensions: ['exe'] }, properties: ['openFile', 'createDirectory', 'dontAddToRecent'] }))
});

ipcMain.on('openExplorer', (_, args) => {
    if (args) {
        shell.openPath(args[0]);
    }
});
