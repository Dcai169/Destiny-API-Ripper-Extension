const path = require('path');
const fs = require('fs');
const { ipcRenderer } = require('electron');

const { checkTool } = require('./scripts/toolChecker.js');
const defaultPreferences = require('./scripts/defaultPreferences');

let mainBar = document.getElementById('main-bar');
let subBar = document.getElementById('sub-bar');
let loadingSummary = document.getElementById('loading-summary');

let userPreferences;
let toolDownloadedFlag = false;
let toolStatus;

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
    toolDownloadedFlag = true;
    fs.writeFileSync(path.join(process.cwd(), 'user_preferences.json'), JSON.stringify(userPreferences), 'utf8');
} finally {
    subBar.style.width = '100%'
    mainBar.style.width = '50%'
}

setTimeout(() => {
    loadingSummary.innerText = 'Checking tool integrity';
    subBar.style.width = '0%';
}, 500);


if (toolDownloadedFlag) {
    subBar.style.widthPercent = '100%';
} else {
    checkTool(userPreferences.toolPath.value)
        .then((fulfilled) => { 
            toolStatus = fulfilled;
        })
        .catch((err) => {
            throw err;
        });
    if (!typeof toolStatus === Array) {
        throw Error('Unable to determine tool version.');
    } else {
        subBar.style.widthPercent = '100%';
        mainBar.style.width = '100%'
    }
}

loadingSummary.innerText = 'Done';
// setTimeout(() => { ipcRenderer.send('loadingDone') }, 1000);
