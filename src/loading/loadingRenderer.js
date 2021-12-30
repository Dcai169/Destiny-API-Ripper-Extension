const path = require('path');
const { ipcRenderer } = require('electron');
const log = require('electron-log')
const { userPreferences } = require('../userPreferences');
const { getDCGVersion, getReleaseAsset } = require('./scripts/loadingScripts.js');
const { execFile } = require('child_process');

setInterval(() => {
    let loadingDots = document.getElementById('loading-dots');
    if (loadingDots.innerText.length < 3) {
        loadingDots.innerText += '.';
    } else {
        loadingDots.innerText = '';
    }
}, 500);

function setBarPercent(percent, delay = 0) {
    setInterval(() => {
        document.getElementById('main-bar').style.width = `${percent}%`;
    }, delay);
}

(async () => {
    if (userPreferences.get('dcgPath')) {
        log.verbose(`Checking DCG at ${userPreferences.get('dcgPath')}`);
        let dcgVersion = await getDCGVersion(userPreferences.get('dcgPath'));

        if (dcgVersion) { // DCG has working --version handling
            log.info(`DCG version: v${dcgVersion}`);
            let targetedDCGLink = (await getReleaseAsset('TiredHobgoblin/Destiny-Collada-Generator', userPreferences.get('preferredDCGVersion'))).browser_download_url;
        
            // check if DCG matches desired version
            if (`${targetedDCGLink.split('/')[7]}.0` !== `v${dcgVersion}`) {
                log.warn(`DCG version mismatch: v${userPreferences.get('preferredDCGVersion')}`);
                ipcRenderer.send('loadingDone', {'consoleMessage': 'DCG version mismatch'});
            } else {
                log.verbose(`DCG version matches desired version`);
                ipcRenderer.send('loadingDone', {'consoleMessage': `DCG v${dcgVersion.substring(0, dcgVersion.length - 2)}`});
            }
        } else { // Legacy DCG or misconfigured DCG path
            log.warn(`DCG version check failed`);
            ipcRenderer.send('loadingDone', {'consoleMessage': 'Destiny Collada Generator version check failed, Check the DCG path is configured correctly'}); 
        }
    } else {
        log.error('DCG path undefined')
    }
})();

// document.getElementById('launch-button').addEventListener('click', () => { ipcRenderer.send('loadingDone'); });