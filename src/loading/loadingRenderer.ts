import * as path from 'path';
import { ipcRenderer } from 'electron';
import * as log from 'electron-log';
import { getReleaseAsset, toolVersion } from './loadingScripts.js';
import { userPreferences } from './../userPreferences.js';

import { GitHubAsset } from './../types/github';

setInterval(() => {
    let loadingDots = document.getElementById('loading-dots');
    if (loadingDots.innerText.length < 3) {
        loadingDots.innerText += '.';
    } else {
        loadingDots.innerText = '';
    }
}, 500);

function setBarPercent(percent: number, delay = 0) {
    setInterval(() => {
        document.getElementById('main-bar').style.width = `${percent}%`;
    }, delay);
}

function checkToolIntegrity(): Promise<GitHubAsset | Error> {
    setBarPercent(20, 100);
    log.info('Checking tool integrity');
    return new Promise((resolve, reject) => {
        setBarPercent(40, 100);
        if (userPreferences.get('toolPath')) {
            log.verbose(`Checking tool at ${userPreferences.get('toolPath')}`);
            toolVersion((userPreferences.get('toolPath') as string))
                .then((res) => {
                    setBarPercent(60, 100);
                    if (!res.stderr) {
                        setBarPercent(80, 100);
                        let version = res.stdout.substring(0, 5);
                        log.info(`Local Version: ${version}`);
                        getReleaseAsset()
                            .then((res: GitHubAsset) => {
                                // check for updates
                                if (version === path.parse(res.browser_download_url).dir.split('/').pop().substring(1)) {
                                    log.info('DCG is up to date');
                                } else {
                                    log.info('DCG is not the most recent');
                                    log.info(`Newest version is ${path.parse(res.browser_download_url).dir.split('/').pop().substring(1)}`);
                                    // redownloadTool()
                                    //     .then(resolve)
                                    //     .catch(reject);
                                }
                                setBarPercent(100, 100);
                                resolve(res);
                            })
                            .catch(reject);
                    } else { // --version does not work; Will be called if tool is between version 1.5.1 and 1.6.2
                        log.info('Tool does not recognize -v');
                        resolve(Error('Tool does not recognize -v'));
                        // redownloadTool()
                        //     .then(resolve)
                        //     .catch(reject);
                    }
                })
                .catch((err) => { // Will be called if tool is broken
                    setBarPercent(100, 100);
                    log.info('Version check failed');
                    log.error(err.stderr);
                    resolve(Error('Version check failed'));
                    // Try to redownload
                    // redownloadTool()
                    //     .then(resolve)
                    //     .catch(reject);
                });
        } else {
            log.verbose('Tool path undefined')
            setBarPercent(100, 100);
            resolve(Error('Tool path undefined'));
        }
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