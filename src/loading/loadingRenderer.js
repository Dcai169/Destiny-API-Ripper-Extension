const path = require('path');
const { ipcRenderer } = require('electron');
const log = require('electron-log')
const { userPreferences } = require('../userPreferences');
const { getDCGVersion, getReleaseAsset } = require('./scripts/loadingScripts.js');

setInterval(() => {
    let loadingDots = document.getElementById('loading-dots');
    if (loadingDots.innerText.length < 3) {
        loadingDots.innerText += '.';
    } else {
        loadingDots.innerText = '';
    }
}, 500);

function setBarPercent(percent) {
    document.getElementById('main-bar').style.width = `${percent}%`;
}

function sendLoadingDoneEvent(textContent, delay) {
    setTimeout(() => {
        ipcRenderer.send('loadingDone', textContent);
    }, delay);
}

(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (await ipcRenderer.invoke('getFSOPSemaphore')) { setBarPercent(25); await new Promise(resolve => setTimeout(resolve, 4000)); }
    if (userPreferences.get('dcgPath')) {
        log.verbose(`Checking DCG at ${userPreferences.get('dcgPath')}`);
        let dcgVersion = await getDCGVersion(userPreferences.get('dcgPath'));
        setBarPercent(50);

        if (dcgVersion) { // DCG has working --version handling
            log.info(`DCG version: v${dcgVersion}`);
            let targetedDCGLink = (await getReleaseAsset('TiredHobgoblin/Destiny-Collada-Generator', userPreferences.get('preferredDCGVersion'))).browser_download_url;
            setBarPercent(75);
        
            // check if DCG matches desired version
            if (`${targetedDCGLink.split('/')[7]}.0` !== `v${dcgVersion}`) {
                setBarPercent(100);
                log.warn(`DCG version mismatch: v${userPreferences.get('preferredDCGVersion')}`);
                sendLoadingDoneEvent({'consoleMessage': 'DCG version mismatch', 'textType': 'log'}, 1000);
            } else {
                setBarPercent(100);
                log.verbose(`DCG version matches desired version`);
                sendLoadingDoneEvent({'consoleMessage': `DCG v${dcgVersion.substring(0, dcgVersion.length - 2)}`, 'textType': 'log'}, 1000);
            }
        } else { // Legacy DCG or misconfigured DCG path
            setBarPercent(100); 
            log.warn(`DCG version check failed`);
            sendLoadingDoneEvent({'consoleMessage': 'Destiny Collada Generator version check failed, Check the DCG path is configured correctly', 'textType': 'warn'}, 1000);
        }
    } else {
        log.error('DCG path undefined')
        setTimeout(() => { ipcRenderer.send('loadingTimeout') }, 7000);
        setBarPercent(100);
    }
})();

// document.getElementById('launch-button').addEventListener('click', () => { ipcRenderer.send('loadingDone'); });