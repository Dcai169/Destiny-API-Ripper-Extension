const { execFile } = require('child_process');
const log = require('electron-log');
const { api } = require('electron-util');
const { getDCGVersion } = require('./../../loading/scripts/loadingScripts.js');
const { userPreferences } = require('./../../userPreferences.js');
const { printConsole } = require('./uiUtils.js');
const path = require('path');
const fsp = require('fs').promises;

const printConsoleLog = (text) => { log.debug(text); printConsole(text, 'log'); };
const printConsoleError = (text) => { log.error(text); printConsole(text, 'error'); };

// Create working directory in temp
let tempDir = path.join(api.app.getPath('temp'), 'destiny-api-ripper-extension');
let buttonTimout;
fsp.mkdir(tempDir, { recursive: true });

function replaceBackslashes(path) {
    return path?.replaceAll('\\', '/');
}

function hideLoading() {
    clearTimeout(buttonTimout);
    document.getElementById('queue-execute-button').removeAttribute('disabled');
}

function updateUiDone(code=0) {
    hideLoading();
    printConsole(`Done (Exit Code: ${code})`, (code) ? 'error' : 'log');
    log.info(`Done (Exit Code: ${code})`);
}

function dispatchImportRequest(path) {
    if (userPreferences.get('blenderConnector')) {
        fetch('http://localhost:41786', { headers: {'X-Content-Path': path} });
    }
}

async function getMostRecentDestinyModel(folderPath) {
    let latestFolderName;
    let latestFolderSpawnTime;

    return new Promise(async (resolve, reject) => {
        (await fsp.readdir(folderPath, { withFileTypes: true }))
            .filter(dirent => dirent.isDirectory())
            .forEach(async (folder, index, arr) => {
                let folderSpawnTime = (await fsp.stat(path.join(folderPath, folder.name))).birthtimeMs;
    
                if (latestFolderName) {
                    if (folderSpawnTime > latestFolderSpawnTime) {
                        latestFolderName = folder.name;
                        latestFolderSpawnTime = folderSpawnTime;
                    }
                } else {
                    latestFolderName = folder.name;
                    latestFolderSpawnTime = folderSpawnTime;
                }
    
                if (index === arr.length - 1) {
                    resolve(path.join(folderPath, latestFolderName)); 
                }
            })
    })
}

function runDCG(hashes, game = "2", callback = Promise.resolve) {
    // DestinyColladaGenerator.exe <GAME> -o <OUTPUT PATH> [<HASHES>]
    let exeArgs = [game, '-o', userPreferences.get('outputPath')].concat(hashes)
    let child = execFile(userPreferences.get('dcgPath'), exeArgs, (err) => {
        if (err) {
            throw err;
        }
    });
    child.stdout.on('data', printConsoleLog);
    child.stderr.on('data', printConsoleError);
    child.on('exit', async () => {
        dispatchImportRequest(await getMostRecentDestinyModel(userPreferences.get('outputPath')));
        return callback();
    });
}

function runDCGRecursive(items, game = "2") {
    return new Promise((resolve, reject) => {
        if (items.length > 0) {
            runDCG([items.pop().hash], game, () => { return runDCGRecursive(items, game) });
        }

        if (items.length === 0) {
            resolve();
        }
    })
}

function convertShaderJSON(shaderPath, name, callback = Promise.resolve) {
    // DestinyColladaGenerator.exe -s <SHADER JSON PATH> <OUTPUT PATH> <ITEM NAME>
    let child = execFile(userPreferences.get('dcgPath'), ['-s', shaderPath, userPreferences.get('outputPath'), name], (err) => {
        if (err) {
            throw err;
        }
    });
    child.stdout.on('data', printConsoleLog);
    child.stderr.on('data', printConsoleError);
    child.on('exit', async () => {
        dispatchImportRequest(await getMostRecentDestinyModel(userPreferences.get('outputPath')));
        return callback()
    });
}

function runMDE(item, outputPath) {
    // MontevenDynamicExtractor.exe -p <PACKAGE PATH> -o <OUTPUT PATH> -n <ITEM NAME> -t -h <HASH>
    let exeArgs = ['--pkgspath', replaceBackslashes(userPreferences.get('pkgPath')), '--outputpath', replaceBackslashes(outputPath)]
        // If the item's class is not null, add it to the name, then replace all the spaces with underscores
        .concat((item.shader ? [] : ['--filename', `${(item.class ? `${item.class}_` : '')}${item.name.toLowerCase()}`.replaceAll(/[ -]/g, '_')]))
        // If the item is a shader, use the '-h' flag, otherwise use the '-a' flag
        .concat(['--textures', (item.shader ? '--shader' : '--api'), item.hash]);

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
            runMDE(items.pop(), outputPath).on('exit', async () => { await runMDERecursive(items, outputPath) });
        }

        if (items.length === 0) {
            resolve();
        }
    })
}

function ripShader(shader, callback = Promise.resolve) {
    return new Promise(async (resolve, reject) => {
        let workingDir = await fsp.mkdtemp(path.join(tempDir, `${shader.name}-`));
        runMDE(shader, workingDir).on('exit', () => {
            convertShaderJSON(path.join(workingDir, `${shader.hash}`, 'shader.json'), shader.name, callback);
        });
    })
}

function ripShaderRecursive(shaders) {
    return new Promise((resolve, reject) => {
        if (shaders.length > 0) {
            ripShader(shaders.pop(), () => { return ripShaderRecursive(shaders) })
        }

        if (shaders.length === 0) {
            resolve();
        }
    })
}

function checkExecutionFinished(_3dItems, shaders, delay=1000) {
    setTimeout(() => {
        if (_3dItems === [] && shaders === []) {
            updateUiDone();
        }
    }, delay);
}

function executeQueue(game, items) {
    // change DOM to reflect program state
    document.getElementById('queue-execute-button').setAttribute('disabled', 'disabled');
    buttonTimout = setTimeout(hideLoading, 1000*16);

    let _3dItems = [];
    let d2Shaders = [];

    items.forEach((item) => {
        if (item.shader && item.game === '2') {
            d2Shaders.push(item);
        } else {
            _3dItems.push(item);
        }
    });

    // Extract 3d items
    if (userPreferences.get('ripHDTextures') && game === '2') {
        if (userPreferences.get('aggregateOutput')) {
            runDCG(_3dItems.map((item) => { return item.hash }), game, async () => {
                let hdtPath = path.join((await getMostRecentDestinyModel(userPreferences.get('outputPath'))), 'HD_Textures')
                await fsp.mkdir(hdtPath);
                runMDERecursive(_3dItems, hdtPath).then(() => {
                    checkExecutionFinished(_3dItems, d2Shaders);
                })
            })
        } else {
            for (const item of _3dItems) {
                runDCG([item.hash]).on('close', async () => {
                    let hdtPath = path.join((await getMostRecentDestinyModel(userPreferences.get('outputPath'))), 'HD_Textures')
                    await fsp.mkdir(hdtPath);
                    runMDE(item, path.join(hdtPath, 'Textures')).on('close', updateUiDone);
                })
            }
        }
    } else {
        // Skip HD textures
        if (userPreferences.get('aggregateOutput')) {
            runDCG(_3dItems.map((i) => { return i.hash }), game).on('close', updateUiDone);
        } else {
            runDCGRecursive(_3dItems, game).then(() => {
                checkExecutionFinished(_3dItems, d2Shaders);
            });
        }
    }

    if (userPreferences.get('ripShaders') && d2Shaders.length > 0) {
        // Extract shaders
        // Generate shader.json using MDE and save output to temp directory
        ripShaderRecursive(d2Shaders).then(() => {
            checkExecutionFinished(_3dItems, d2Shaders);
        });
    }
}

function executeButtonClickHandler() {
    if ([...queue.children].length === 0) return
    getDCGVersion(userPreferences.get('dcgPath'))
        .then((version) => {
            if (version) {
                if (navigator.onLine) {
                    let items = [...queue.children].map(item => {
                        return {
                            hash: item.id,
                            name: item.getAttribute('name'),
                            shader: item.dataset.itemcategories.includes('shader'),
                            class: item.dataset?.class || null,
                            game: item.dataset.game
                        }
                    })

                    printConsole(`Hashes: ${items.map((i) => { return i.hash }).join(' ')}`);
                    log.verbose(`Hashes: ${items.map((i) => { return i.hash }).join(' ')}`)

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