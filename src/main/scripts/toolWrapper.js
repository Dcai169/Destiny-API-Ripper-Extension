const { execFile } = require('child_process');
const log = require('electron-log');
const { api } = require('electron-util');
const { getDCGVersion } = require('./../../loading/scripts/loadingScripts.js');
const { userPreferences } = require('./../../userPreferences.js');
const { printConsole } = require('./uiUtils.js');
const path = require('path');
const fsp = require('fs').promises;

const printConsoleLog = (text) => { printConsole(text, 'log') };
const printConsoleError = (text) => { printConsole(text, 'error') };

// Create working directory in temp
let tempDir = path.join(api.app.getPath('temp'), 'destiny-api-ripper-extension');
fsp.mkdir(tempDir, { recursive: true });

function logAndReturn(value) {
    log.info(value);
    return value;
}

function replaceBackslashes(path) {
    return path?.replaceAll('\\', '/');
}

function hideLoading() {
    // document.getElementById('loading-indicator').classList.remove('p-1');
    // document.getElementById('loading-indicator').classList.add('hidden');
    document.getElementById('queue-execute-button').removeAttribute('disabled');
}

function updateUiDone(code) {
    hideLoading();
    printConsole(`Done (Exit Code: ${code})`, (code) ? 'error' : 'log');
}

async function getMostRecentDestinyModel(folderPath) {
    let latestFolderDirent;
    let latestFolderSpawnTime;
    (await fsp.readdir(folderPath, { withFileTypes: true }))
        .filter(dirent => dirent.isDirectory())
        .forEach(async folder => {
            if (latestFolderDirent) {
                if ((await fsp.stat(path.join(folderPath, folder.name))).birthtimeMs > latestFolderSpawnTime) {
                    latestFolderDirent = folder.name;
                }
            } else {
                latestFolderDirent = folder;
                latestFolderSpawnTime = (await fsp.stat(path.join(folderPath, folder.name))).birthtimeMs;
            }
        })
    return path.join(folderPath, latestFolderDirent.name);
}

function runDCG(hashes, game="2") {
    // DestinyColladaGenerator.exe <GAME> -o <OUTPUT PATH> [<HASHES>]
    let exeArgs = [game, '-o', userPreferences.get('outputPath')].concat(hashes)
    let child = execFile(userPreferences.get('dcgPath'), exeArgs, (err) => {
        if (err) {
            throw err;
        }
    });
    child.stdout.on('data', printConsoleLog);
    child.stderr.on('data', printConsoleError);

    return child;
}

function runDCGRecursive(items, game="2") {
    return new Promise((resolve, reject) => {
        if (items.length > 0) {
            runDCG([items.pop().hash], game).on('exit', () => { runDCGRecursive(items, game) });
        } 
        
        if (items.length === 0) {
            resolve();
        }
    })
}

function convertShaderJSON(shaderPath, name) {
    // DestinyColladaGenerator.exe -s <SHADER JSON PATH> <OUTPUT PATH> <ITEM NAME>
    let child = execFile(userPreferences.get('dcgPath'), ['-s', shaderPath, userPreferences.get('outputPath'), name], (err) => {
        if (err) {
            throw err;
        }
    });
    child.stdout.on('data', printConsoleLog);
    child.stderr.on('data', printConsoleError);

    return child;
}

function runMDE(item, outputPath) {
    // MontevenDynamicExtractor.exe -p <PACKAGE PATH> -o <OUTPUT PATH> -n <ITEM NAME> -t -h <HASH>
    let exeArgs = ['-p', replaceBackslashes(userPreferences.get('pkgPath')), '-o', replaceBackslashes(outputPath), '-t', (item.shader ? '-h' : '-a'), item.hash].concat((item.shader ? [] : ['-n', item.name]))
    let child = execFile(userPreferences.get('mdePath'), exeArgs, { cwd: path.parse(userPreferences.get('mdePath')).dir }, (err) => {
        if (err) {
            throw err;
        }
    });
    child.stdout.on('data', printConsoleLog);
    child.stderr.on('data', printConsoleError);

    return child;
}

function runMDERecursive(items, outputPath) {
    return new Promise((resolve, reject) => {
        if (items.length > 0) {
            runMDE(items.pop(), outputPath).on('exit', () => { runMDERecursive(items, outputPath) });
        } 

        if (items.length === 0) {
            resolve();
        }
    })
}

function executeQueue(game, items) {
    // change DOM to reflect program state
    document.getElementById('queue-execute-button').setAttribute('disabled', 'disabled');
    // document.getElementById('loading-indicator').classList.remove('hidden');
    // document.getElementById('loading-indicator').classList.add('p-1');

    let _3dItems = [];
    let shaders = [];

    items.forEach((item) => {
        if (item.shader) {
            shaders.push(item);
        } else {
            _3dItems.push(item);
        }
    });

    // Extract 3d items
    if (userPreferences.get('ripHDTextures') && game === '2') {
        if (userPreferences.get('aggregateOutput')) {
            runDCG(_3dItems.map((item) => { return item.hash })).on('exit', async () => {
                await runMDERecursive(_3dItems, path.join((await getMostRecentDestinyModel(userPreferences.get('outputPath'))), 'Textures'))
            })
        } else {
            // implement with a for loop
            for (const item of _3dItems) {
                runDCG([item.hash]).on('exit', async () => {
                    runMDE(item, path.join((await getMostRecentDestinyModel(userPreferences.get('outputPath'))), 'Textures'))
                })
            }
        }
    } else {
        // Skip HD textures
        if (userPreferences.get('aggregateOutput')) {
            runDCG(_3dItems.map((i) => {return i.hash}), game).on('exit', (code) => {
                log.info(`Done (Exit Code: ${code})`)
                updateUiDone(code);
            });
        } else {
            runDCGRecursive(_3dItems, game);
        }
    }

    if (userPreferences.get('ripShaders') && shaders.length > 0) {
        // Extract shaders
        // Generate shader.json using MDE and save output to temp directory
        shaders.forEach(async (shader) => {
            let workingDir = await fsp.mkdtemp(path.join(tempDir, `${shader.name}-`));
            runMDE(shader, workingDir).on('exit', () => {
                // log.debug(path.join(workingDir, `${shader.hash}`, 'shader.json'))
                convertShaderJSON(path.join(workingDir, `${shader.hash}`, 'shader.json'), shader.name)
            });
        })
        // Convert shader.json to Blender python script using DCG
    }

    hideLoading();
}

function executeButtonClickHandler() {
    if ([...queue.children].length === 0) return
    getDCGVersion(userPreferences.get('dcgPath'))
        .then((version) => {
            if (version) {
                if (navigator.onLine) {
                    let items = [...queue.children].map(item => { return { 
                        hash: item.id,
                        name: item.getAttribute('name'),
                        shader: item.dataset.itemcategories.includes('shader')
                    } })

                    printConsole(`Hashes: ${items.map((i) => {return i.hash}).join(' ')}`);
                    log.verbose(`Hashes: ${items.map((i) => {return i.hash}).join(' ')}`)

                    executeQueue(gameSelector.value, items);
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