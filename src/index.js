const { app, BrowserWindow, ipcMain, dialog, Menu, MenuItem, shell, autoUpdater } = require('electron');
// const isDev = require('electron-is-dev');
const path = require('path');
// const fs = require('fs');

// // Update stuff
// const updateServer = 'https://hazel-six-omega.vercel.app'
// const updateUrl = `${updateServer}/update/${process.platform}/${app.getVersion()}`

// autoUpdater.setFeedURL({ updateUrl });

// autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
//     const dialogOpts = {
//         type: 'info',
//         buttons: ['Restart', 'Later'],
//         title: 'Application Update',
//         message: (process.platform === 'win32' ? releaseNotes : releaseName),
//         detail: 'A new version has been downloaded. Restart the application to apply the updates.'
//     }

//     dialog.showMessageBox(dialogOpts).then((returnValue) => {
//         if (returnValue.response === 0) { autoUpdater.quitAndInstall() }
//     });
// });

// autoUpdater.on('error', (err) => {
//     console.error('There was a problem updating the application');
//     console.error(err);
// })

// if (!isDev) {
//     setInterval(() => {
//         autoUpdater.checkForUpdates();
//     }, 60000);
// }

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

    // Open the DevTools.
    // loadingWindow.webContents.openDevTools();
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

ipcMain.on('mainPrint', (event, args) => {
    // console.log(event);
    console.log(args);
});

ipcMain.on('loadingDone', (event, args) => {
    createMainWindow();
    BrowserWindow.fromId(event.frameId).destroy();
});

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
