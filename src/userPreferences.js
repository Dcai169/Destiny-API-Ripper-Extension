const { BrowserWindow } = require('electron');
const { api, is } = require('electron-util');
const Store = require('electron-store');
const fs = require('fs');
const path = require('path');
const { download } = require('electron-dl');
const { getReleaseAsset, extract7zip, findExecutable } = require('./loading/scripts/loadingScripts.js');

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
                    throw err;
                }
            }
            
            if (!toolPath) {
                console.log('pbA0');
                getReleaseAsset()
                .then((res) => {
                    console.log('pbA1')
                    download(BrowserWindow.getFocusedWindow(), res.browser_download_url, { directory: toolDirectory })
                        .then((res) => {
                            console.log('pbA2')
                            extract7zip(res.getSavePath()).then((res) => {
                                console.log('pbA3')
                                fs.unlinkSync(res.get('Path'));
                                setTimeout(() => {
                                    return path.join(toolDirectory, findExecutable(toolDirectory).name);
                                }, 100);
                            }).catch(console.error);
                        }).catch(console.error);
                }).catch(console.error);
            } else {
                console.log('pbB0');
                console.log(toolPath)
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
    },
    "autoUpdateTool": {
        type: 'boolean',
        default: false
    }
}

const store = new Store({ schema });

module.exports = { userPreferences: store };
