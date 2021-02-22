const path = require('path');
const fs = require('fs');
const { ipcRenderer } = require('electron');

const { toolVersion } = require('./scripts/toolChecker.js');
const { defaultPreferences } = require('./scripts/defaultPreferences');

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

            resolve(stateString);
        } catch (err) {
            reject(err);
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
                    .then((res) => {
                        toolDownloadedFlag = true;
                        fs.writeFileSync(path.join(process.cwd(), 'user_preferences.json'), JSON.stringify(userPreferences), 'utf8');
                        resolve(userPreferences);
                    });
            } catch (err) {
                reject(err);
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
                .then(resolve)
                .catch(reject); // Will be called if tool is broken
            if (!typeof toolStatus === Array) {
                reject('Unable to determine tool version.'); // Will be called if tool is between version 1.5.1 and 1.6.2
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

Promise.all(loadingTasks)
    .then((res) => {
        // Settle timeout
        setTimeout(() => {
            console.log(userPreferences)
            ipcRenderer.send('mainPrint', JSON.parse(JSON.stringify(userPreferences)));
            ipcRenderer.send('loadingDone');
        }, 1000);
    })
    .catch((err) => {
        console.log(err);
    });
