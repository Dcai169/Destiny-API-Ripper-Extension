const path = require('path');
const fs = require('fs');
const { ipcRenderer } = require('electron');

const { toolVersion } = require('./scripts/toolChecker.js');
const defaultPreferences = require('./scripts/defaultPreferences');

let userPreferences;
let toolDownloadedFlag = false;
let toolStatus;

setInterval(() => {
    let loadingDots = document.getElementById('loading-dots');
    let dot = '.';
    if (loadingDots.innerText.length < 3) {
        loadingDots.innerText += dot;
    } else {
        loadingDots.innerText = '';
    }
}, 400);

function parsePercent(widthPercent) {
    return parseInt(widthPercent.slice(0, -1).trim())
}

function setUiState({ stateString, mainPercent, subPercent }) {
    return new Promise((resolve, reject) => {
        try {
            let mainBar = document.getElementById('main-bar');
            let subBar = document.getElementById('sub-bar');

            if (stateString) {
                document.getElementById('loading-summary').innerText = stateString;
            }
            if (mainPercent) {
                mainBar.style.width = `${parsePercent(mainBar.style.width) + mainPercent}%`;
            } else if (typeof mainPercent === 'number') {
                mainBar.style.width = '0%';
            }

            if (subPercent) {
                subBar.style.width = `${parsePercent(subBar.style.width) + subPercent}%`;
            } else if (typeof subPercent === 'number') {
                subBar.style.width = '0%';
            }

            resolve();
        } catch (err) {
            reject(err);
        }
    });

}

function loadUserPreferences() {
    return new Promise((resolve, reject) => {
        try {
            userPreferences = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'user_preferences.json'), 'utf-8'));
            resolve(userPreferences);
        } catch (err) {
            if (err.code === -4058) {
                // default preferences/first launch
                userPreferences = defaultPreferences;
                let preferenceEntries = Object.entries(userPreferences);
                for (const [key, property] of preferenceEntries) {
                    property.ifUndefined(key);
                }
                toolDownloadedFlag = true;
                fs.writeFileSync(path.join(process.cwd(), 'user_preferences.json'), JSON.stringify(userPreferences), 'utf8');
                resolve(userPreferences);
            } else {
                reject(err);
            }
        }
    });
}

function checkToolIntegrity() {
    return new Promise((resolve, reject) => {
        if (toolDownloadedFlag) {
            resolve();
        } else {
            toolVersion(userPreferences.toolPath.value)
                .then(resolve)
                .catch(reject);
            if (!typeof toolStatus === Array) {
                reject('Unable to determine tool version.');
            } else {
                resolve();
            }
        }
    });
}

let loadingTasks = [
    setUiState({ stateString: 'Initalizing' }),
    setUiState({ stateString: 'Loading user preferences', mainPercent: 0, subPercent: 0 }).then(loadUserPreferences),
    setUiState({ stateString: 'Checking tool intergrity', mainPercent: 50, subPercent: 0 }).then(checkToolIntegrity),
    setUiState({ stateString: 'Done', mainPercent: 50, subPercent: 0 })
];

Promise.all(loadingTasks).then((res) => { ipcRenderer.send('loadingDone', res) });
