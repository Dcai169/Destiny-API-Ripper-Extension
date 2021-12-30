const { execFile } = require('child_process');
const log = require('electron-log');
const { toolVersion } = require('./../../loading/scripts/loadingScripts.js');
const { userPreferences } = require('./../../userPreferences.js');
const { printConsoleOutput } = require('./uiUtils.js');

function hideLoading() {
    document.getElementById('loading-indicator').classList.remove('p-1');
    document.getElementById('loading-indicator').classList.add('hidden');
    document.getElementById('queue-execute-button').removeAttribute('disabled');
}

function updateUiDone(code) {
    hideLoading();
    printConsoleOutput(`Done (Exit Code: ${code})`);
}

function runDCG(game, hashes) {
    // DestinyColladaGenerator.exe [<GAME>] [-o <OUTPUTPATH>] [<HASHES>]
    let commandArgs = [game, '-o', userPreferences.get('outputPath')].concat(hashes);
    let child = execFile(userPreferences.get('toolPath'), commandArgs, (err) => {
        if (err) {
            throw err;
        }
    });
    child.stdout.on('data', printConsoleOutput);
    child.stderr.on('data', printConsoleOutput);

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
    toolVersion(userPreferences.get('toolPath'))
        .then((res) => {
            if (res.stdout) {
                printConsoleOutput(`DCG v${res.stdout.substring(0, 5)}`);
                if (navigator.onLine) {
                    let itemHashes = [...queue.childen].map(item => { return item.id });
                    printConsoleOutput(`Hashes: ${itemHashes.join(' ')}`);

                    executeQueue(gameSelector.value, itemHashes);
                } else {
                    printConsoleOutput('No internet connection detected');
                    hideLoading();
                }
            } else {
                printConsoleOutput('DCG inoperable');
                hideLoading();
            }
        })
        .catch(() => {
            printConsoleOutput('DCG inoperable');
            hideLoading();
        });
}

module.exports = { executeButtonClickHandler };