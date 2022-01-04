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

function downloadGitHubRelease(repo, path) {
    getReleaseAsset(repo)
    .then((res) => {
        if (ipcRenderer) {
            log.verbose(`Downloading ${res.browser_download_url} to ${path}`);
            ipcRenderer.send('dlPing', { url: res.browser_download_url, dlPath: path });
            ipcRenderer.once('dlPing-reply', (_, args) => {
                return args
            });
        }
    }).catch(logError);
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
    "dcgPath": {
        type: 'string',
        default: (() => {
            let dcgDirectory = path.join(api.app.getPath('userData'), 'bin', 'dcg');

            if (fs.mkdirSync(dcgDirectory, { recursive: true })) {
                return downloadGitHubRelease('TiredHobgoblin/Destiny-Collada-Generator', dcgDirectory);
            } else {
                if (findExecutable(dcgDirectory)) {
                    return path.join(dcgDirectory, findExecutable(dcgDirectory).name);
                } else {
                    return downloadGitHubRelease('TiredHobgoblin/Destiny-Collada-Generator', dcgDirectory);
                }
            }
        })()
    },
    "locale": {
        type: 'string',
        enum: ['de', 'en', 'es', 'es-mx', 'fr', 'it', 'ja', 'ko', 'pl', 'pt-br', 'ru', 'zh-cht', 'zh-chs'],
        default: 'en'
    },
    "aggregateOutput": {
        type: 'boolean',
        default: true
    },
    "preferredDCGVersion": { 
        type: 'string',
        default: 'latest'
    }
}

const store = new Store({ schema });

module.exports = { userPreferences: store, logError };
