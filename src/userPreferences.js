const { api } = require('electron-util');
const log = require('electron-log');
const Store = require('electron-store');
const fs = require('fs');
const path = require('path');
const { getReleaseAsset, findExecutable } = require('./loading/scripts/loadingScripts.js');
const { ipcRenderer } = require('electron');

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
                        if (ipcRenderer) {
                            log.verbose(`Downloading ${res.browser_download_url} to ${toolDirectory}`);
                            ipcRenderer.send('dlPing', { url: res.browser_download_url, dlPath: toolDirectory });
                            ipcRenderer.once('dlPing-reply', (_, args) => {
                                return args
                            });
                        }
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

module.exports = { userPreferences: store, logError };
