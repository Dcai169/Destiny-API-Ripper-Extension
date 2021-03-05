const path = require('path');
const fs = require('fs');
const { ipcRenderer } = require('electron');
const { downloadAndExtractTool, getReleaseAsset } = require('./scripts/githubReleaseDler.js');

const { toolVersion } = require('./scripts/toolChecker.js');
const { defaultPreferences } = require('./scripts/defaultPreferences');

let userPreferences;
let toolDownloadedFlag = false;
let toolStatus;

setInterval(() => {
    let loadingDots = document.getElementById('loading-dots');
    if (loadingDots.innerText.length < 3) {
        loadingDots.innerText += '.';
    } else {
        loadingDots.innerText = '';
    }
}, 500);

function parsePercent(widthPercent) {
    return parseInt(widthPercent.slice(0, -1).trim());
}

function redownloadTool() {
    ipcRenderer.send('mainPrint', 'Redownload initated');
    return new Promise((resolve, reject) => {
        try {
            fs.rmdirSync(path.parse(userPreferences.toolPath.value).dir, { recursive: true });
            fs.mkdirSync(path.join(process.cwd(), 'bin'));
            downloadAndExtractTool(path.join(process.cwd(), 'bin'))
                .then(resolve)
                .catch(reject); // No internet or no r/w permission
        } catch (err) {
            reject(err); // No r/w permission
        }
    });
}

function setUiState({ stateString, mainPercent, subPercent }) {
    return new Promise((resolve, reject) => {
        try {
            let mainBar = document.getElementById('main-bar');
            // let subBar = document.getElementById('sub-bar');

            if (stateString) {
                document.getElementById('loading-summary').innerText = stateString;
            }
            if (mainPercent) {
                mainBar.style.width = `${parsePercent(mainBar.style.width) + mainPercent}%`;
            } else if (typeof mainPercent === 'number') {
                mainBar.style.width = '0%';
            }

            // if (subPercent) {
            //     subBar.style.width = `${parsePercent(subBar.style.width) + subPercent}%`;
            // } else if (typeof subPercent === 'number') {
            //     subBar.style.width = '0%';
            // }

            setTimeout(() => { resolve(stateString) }, 500);
        } catch (err) {
            reject(err); // If this is called something has really gone wrong.
        }
    });

}

function loadUserPreferences() {
    return new Promise((resolve, reject) => {
        let preferencesPath = path.join(process.cwd(), 'user_preferences.json');

        if (fs.existsSync(preferencesPath)) {
            userPreferences = JSON.parse(fs.readFileSync(preferencesPath, 'utf-8'));
            resolve(userPreferences);
        } else {
            try {
                // default preferences/first launch
                userPreferences = defaultPreferences;
                Promise.all(Object.entries(userPreferences).map(([_, value]) => { return value.ifUndefined(); }))
                    .then(() => {
                        toolDownloadedFlag = true;
                        fs.writeFileSync(path.join(process.cwd(), 'user_preferences.json'), JSON.stringify(userPreferences), 'utf8');
                        resolve(userPreferences);
                    });
            } catch (err) {
                reject(err); // Will call if program cannot write files.
            }
        }
    });
}

function checkToolIntegrity() {
    return new Promise((resolve, reject) => {
        if (toolDownloadedFlag) {
            resolve(toolDownloadedFlag);
        } else {
            toolVersion(userPreferences.toolPath.value)
                .then((version) => {
                    ipcRenderer.send('mainPrint', `Local Version: ${version.substring(0, 5)}`);
                    getReleaseAsset()
                        .then((res) => {
                            // check for updates
                            if (version.substring(0, 5) === path.parse(res.browser_download_url).dir.split('/').pop().substring(1)) {
                                resolve(version);
                            } else {
                                redownloadTool()
                                    .then(resolve)
                                    .catch(reject);
                            }
                        })
                        .catch(reject);
                })
                .catch(() => { // Will be called if tool is broken
                    // Try to redownload
                    redownloadTool()
                        .then(resolve)
                        .catch(reject);
                });
            if (!typeof toolStatus === Array) {
                reject('Unable to determine tool version.'); // Will be called if tool is between version 1.5.1 and 1.6.2
            } else {
                resolve();
            }
        }
    });
}

let loadingTasks = [
    setUiState({ stateString: 'Loading user preferences', mainPercent: 0, subPercent: 0 }),
    loadUserPreferences().then(setUiState({ stateString: 'Checking tool intergrity', mainPercent: 50, subPercent: 0 })),
    checkToolIntegrity().then(setUiState({ stateString: 'Done', mainPercent: 50, subPercent: 0 }))
];

Promise.all(loadingTasks)
    .then((res) => {
        // Settle timeout
        setTimeout(() => {
            ipcRenderer.send('loadingDone');
        }, 1000);
    })
    .catch((err) => {
        ipcRenderer.send('mainPrint', err);
    });
