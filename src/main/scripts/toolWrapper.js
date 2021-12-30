const { execFile } = require('child_process');
const log = require('electron-log');
const { getDCGVersion } = require('./../../loading/scripts/loadingScripts.js');
const { userPreferences } = require('./../../userPreferences.js');
const { printConsole } = require('./uiUtils.js');

const printConsoleLog = (text) => { printConsole(text, 'log') };
const printConsoleError = (text) => { printConsole(text, 'error') };

function hideLoading() {
    document.getElementById('loading-indicator').classList.remove('p-1');
    document.getElementById('loading-indicator').classList.add('hidden');
    document.getElementById('queue-execute-button').removeAttribute('disabled');
}

function updateUiDone(code) {
    hideLoading();
    printConsole(`Done (Exit Code: ${code})`);
}

function runDCG(game, hashes) {
    // DestinyColladaGenerator.exe [<GAME>] [-o <OUTPUTPATH>] [<HASHES>]
    let commandArgs = [game, '-o', userPreferences.get('outputPath')].concat(hashes);
    let child = execFile(userPreferences.get('toolPath'), commandArgs, (err) => {
        if (err) {
            throw err;
        }
    });
    child.stdout.on('data', printConsoleLog);
    child.stderr.on('data', printConsoleError);

    return child;
}

function runDCGRecursive(game, itemHashes) {
    if (itemHashes.length > 0) {
        let child = runDCG(game, [itemHashes.pop()]);
        child.on('exit', (code) => { runDCGRecursive(game, itemHashes) });
    }
}

function executeQueue(game, hashes) {
    log.info(`Hashes: ${hashes.join(' ')}`);
    // change DOM to reflect program state
    document.getElementById('queue-execute-button').setAttribute('disabled', 'disabled');
    document.getElementById('loading-indicator').classList.remove('hidden');
    document.getElementById('loading-indicator').classList.add('p-1');

    if (userPreferences.get('aggregateOutput')) {
        runDCG(game, hashes).on('exit', (code) => {
            log.info(`Done (Exit Code: ${code})`)
            updateUiDone(code);
        });
    } else {
        runDCGRecursive(game, hashes);
        hideLoading();
    }
}

function executeButtonClickHandler() {
    getDCGVersion(userPreferences.get('dcgPath'))
        .then((version) => {
            if (version) {
                if (navigator.onLine) {
                    let itemHashes = [...queue.children].map(item => { return item.id })
                    printConsole(`Hashes: ${itemHashes.join(' ')}`);

                    executeQueue(gameSelector.value, itemHashes);
                } else {
                    printConsole('No internet connection detected', 'error');
                    hideLoading();
                }
            } else {
                printConsole('DCG inoperable', 'error');
                hideLoading();
            }
        })
}

module.exports = { executeButtonClickHandler };