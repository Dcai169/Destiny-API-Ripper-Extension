const { api } = require('electron-util');
const log = require('electron-log');
const Store = require('electron-store');
const fs = require('fs');
const path = require('path');
const { download } = require('electron-dl');
const { getReleaseAsset, extract7zip, findExecutable } = require('./loading/scripts/loadingScripts.js');
const { ipcRenderer, BrowserWindow } = require('electron');

function logError(err) {
    console.error(err);
    log.error(err);
}

let schema = {
    "outputPath": {
        type: 'string',
        default: (() => {
            let defaultPath = path.join(api.app.getPath('documents'), 'DARE Output');
            try {
                fs.mkdirSync(defaultPath);
            } catch (err) {
                if (err.code === "EEXIST") {
                    return defaultPath;
                } else {
                    logError(err);
                    throw err;
                }
            }
        })()
    },
    "toolPath": {
        type: 'string',
        default: (() => {
            let toolDirectory = path.join(api.app.getPath('userData'), 'bin');
            let toolPath = "";
            try {
                fs.mkdirSync(toolDirectory);
            } catch (err) {
                if (err.code === "EEXIST") {
                    if (findExecutable(toolDirectory)) {
                        toolPath = path.join(toolDirectory, findExecutable(toolDirectory).name);
                    }
                } else {
                    logError(err);
                    throw err;
                }
            }

            if (!toolPath) {
                getReleaseAsset()
                    .then((res) => {
                        log.verbose(`Downloading ${res.browser_download_url} to ${toolDirectory}`);
                        download(BrowserWindow.getFocusedWindow(), res.browser_download_url, { directory: toolDirectory, saveAs: false })
                            .then((res) => {
                                extract7zip(res.getSavePath()).then((res) => {
                                    let toolPath = path.join(toolDirectory, findExecutable(toolDirectory).name);
                                    fs.unlink(res.get('Path'), () => {
                                        fs.chmod(toolPath, 0o744, () => {
                                            setTimeout(() => {
                                                return toolPath;
                                            }, 100);
                                        });
                                    });
                                }).catch(logError);
                            }).catch(logError);
                    }).catch(logError);
            } else {
                return toolPath;
            }
        })()
    },
    "locale": {
        type: 'string',
        enum: ['de', 'en', 'es', 'es-mx', 'fr', 'it', 'ja', 'ka', 'pl', 'pt-br', 'ru', 'zh-cht', 'zh-chs'],
        default: 'en'
    },
    "aggregateOutput": {
        type: 'boolean',
        default: true
    }
}

const store = new Store({ schema });

module.exports = { userPreferences: store };
