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

function downloadGitHubRelease(repo, path, decompress = (res) => { return res }) {
    getReleaseAsset(repo)
    .then((res) => {
        if (ipcRenderer) {
            log.verbose(`Downloading ${res.browser_download_url} to ${path}`);
            ipcRenderer.invoke('download', { url: res.browser_download_url, dlPath: path }).then(decompress);
        }
    }).catch(logError);
}

function decompressDCG(dlParameters) {
    ipcRenderer.invoke('decompress7zip', dlParameters).then((res) => {
        return res;
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
                downloadGitHubRelease('TiredHobgoblin/Destiny-Collada-Generator', dcgDirectory, decompressDCG);
            } else {
                if (findExecutable(dcgDirectory)) {
                    return path.join(dcgDirectory, findExecutable(dcgDirectory).name);
                } else {
                    downloadGitHubRelease('TiredHobgoblin/Destiny-Collada-Generator', dcgDirectory, decompressDCG);
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
