const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');

const { checkTool } = require('../scripts/toolWrapper.js');
const defaultPreferences = require('../scripts/defaultPreferences');

let mainBar = document.getElementById('main-bar');
let subBar = document.getElementById('sub-bar');
let loadingSummary = document.getElementById('loading-summary');

let userPreferences;
let toolDownloadedFlag = false;

function parsePercent(widthPercent) {
    return parseInt(widthPercent.slice(0, -1).trim())
}

loadingSummary.innerText = 'Initializing';

setInterval(() => {
    let loadingDots = document.getElementById('loading-dots');
    let dot = '.';
    if (loadingDots.innerText.length < 3) {
        loadingDots.innerText += dot;
    } else {
        loadingDots.innerText = '';
    }
}, 400);

loadingSummary.innerText = 'Loading user preferences';
subBar.style.width = '0%'
try {
    userPreferences = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'user_preferences.json'), 'utf-8'));
} catch (error) {
    // default preferences/first launch
    userPreferences = defaultPreferences;
    let preferenceEntries = Object.entries(userPreferences);
    for (const [key, property] of preferenceEntries) {
        property.ifUndefined(key);
        setTimeout(() => {
            subBar.style.width = (parsePercent(subBar.style.width) + Math.floor(100/preferenceEntries.length));
        }, 100);
    }
    propogateUserPreferences();
} finally {
    subBar.style.width = '100%'
    mainBar.style.width = '20%'
}

loadingSummary.innerText = 'Checking tool integrity';
subBar.style.width = '0%'
let toolStatus = (() => {
    try {
        if (userPreferences.toolPath.value) {
            checkTool(userPreferences.toolPath.value).then(
                (fulfilled) => { return fulfilled }, 
                // Not found / not working
                (rejected) => { return [1] }
            );
        } else {
            // Tool path is falsey
            return [2];
        }
    } catch (error) {
        // First launch
        if (fs.existsSync(path.join(process.cwd(), 'bin'))) {
            let executables = fs.readdirSync(path.join(process.cwd(), 'bin'), { withFileTypes: true }).filter((i) => { return i.isFile() && i.name.split('.').reverse()[0] === 'exe' });
            if (executables.length === 1) {
                checkTool(path.join(process.cwd(), 'bin', executables[0].name)).then(
                    (fulfilled) => { return fulfilled }, 
                    (rejected) => { return [3] }
                );
            } else {
                // Multiple exes
                return [4]
            }
        } else {
            // ./bin does not exist
            fs.mkdirSync(path.join(process.cwd(), 'bin'));

        }
    }
})();

console.log(process.cwd());
console.log(...toolStatus);

// let testBar = setInterval();
ipcRenderer.send('loadingDone');

