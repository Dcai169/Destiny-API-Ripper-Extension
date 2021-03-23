const { BrowserWindow } = require('electron');
const { api } = require('electron-util');
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
            let toolPath = path.join(api.app.getPath('userData'), 'bin');
            try {
                fs.mkdirSync(toolPath);
            } catch (err) {
                if (err.code === "EEXIST") {
                    return path.join(toolPath, findExecutable(toolPath).name);
                } else {
                    throw err;
                }
            }
            getReleaseAsset()
                .then((res) => {
                    console.log('pbB1');
                    download(BrowserWindow.getFocusedWindow(), res.browser_download_url, { directory: toolPath })
                        .then((res) => {
                            console.log('pbB2');
                            extract7zip(res.getSavePath()).then((res) => {
                                fs.unlinkSync(res.get('Path'));
                                console.log('pbB3');
                                setTimeout(() => {
                                    console.log('pbB4');
                                    return path.join(toolPath, findExecutable(toolPath).name);
                                }, 100);
                            }).catch(console.error);
                        }).catch((err) => {
                            console.log(JSON.stringify(err));
                        });
                }).catch(console.error);
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
