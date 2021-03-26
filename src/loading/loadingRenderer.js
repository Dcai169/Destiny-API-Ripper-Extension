const path = require('path');
const { ipcRenderer } = require('electron');
const log = require('electron-log')
const { getReleaseAsset, toolVersion } = require('./scripts/loadingScripts.js');
const { userPreferences } = require('../userPreferences');

setInterval(() => {
    let loadingDots = document.getElementById('loading-dots');
    if (loadingDots.innerText.length < 3) {
        loadingDots.innerText += '.';
    } else {
        loadingDots.innerText = '';
    }
}, 500);

function redownloadTool() {
    log.debug('Tool redownload initiated');
    return new Promise((resolve, reject) => {
        try {
            // fs.rmdirSync(path.parse(userPreferences.get('toolPath')).dir, { recursive: true });
            // fs.mkdirSync(path.parse(userPreferences.get('toolPath')).dir, { recursive: true });
        } catch (err) {
            reject(err); // No r/w permission
        }
    });
}

function setBarPercent(percent, delay=0) {
    setInterval(() => {
        document.getElementById('main-bar').style.width = `${percent}%`;
    }, delay);
}

function checkToolIntegrity() {
    setBarPercent(20, 100);
    log.verbose('Checking tool integrity');
    return new Promise((resolve, reject) => {
        setBarPercent(40, 100);
        log.verbose(`Checking tool at ${userPreferences.get('toolPath')}`);
        toolVersion(userPreferences.get('toolPath'))
            .then((res) => {
                setBarPercent(60, 100);
                if (!res.stderr) {
                    setBarPercent(80, 100);
                    let version = res.stdout.substring(0, 5);
                    log,verbose(`Local Version: ${version}`);
                    getReleaseAsset()
                        .then((res) => {
                            // check for updates
                            if (version === path.parse(res.browser_download_url).dir.split('/').pop().substring(1)) {
                                log.verbose('DCG is up to date');
                            } else {
                                log.verbose('DCG is not the most recent');
                                log.verbose(`Newest version is ${path.parse(res.browser_download_url).dir.split('/').pop().substring(1)}`);
                                // redownloadTool()
                                //     .then(resolve)
                                //     .catch(reject);
                            }
                            setBarPercent(100, 100);
                            resolve(res);
                        })
                        .catch(reject);
                } else { // --version does not work; Will be called if tool is between version 1.5.1 and 1.6.2
                    log.verbose('Tool does not recognize -v');
                    resolve();
                    // redownloadTool()
                    //     .then(resolve)
                    //     .catch(reject);
                }
            })
            .catch(() => { // Will be called if tool is broken
                setBarPercent(100, 100);
                log.verbose('Version check failed');
                resolve();
                // Try to redownload
                // redownloadTool()
                //     .then(resolve)
                //     .catch(reject);
            });
    });
}

let loadingTasks = [
    checkToolIntegrity()
];

setTimeout(() => {
    Promise.all(loadingTasks)
    .then((res) => {
        // Settle timeout
        setTimeout(() => {
            log.verbose('Loading done');
            ipcRenderer.send('loadingDone');
        }, 1000);
    })
    .catch((err) => {
        ipcRenderer.send('mainPrint', err);
    });
}, 2000);


// document.getElementById('launch-button').addEventListener('click', () => { ipcRenderer.send('loadingDone'); });