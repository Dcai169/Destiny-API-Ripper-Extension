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

function logExitCode(code = 0) {
    printConsole(`Done (Exit Code: ${code})`, (code) ? 'error' : 'log');
    log.info(`Done (Exit Code: ${code})`);
}

function dispatchImportRequest(path) {
    if (userPreferences.get('blenderConnector')) {
        log.verbose('Dispatching import request to Blender');
        fetch('http://localhost:41786', { method: "HEAD", headers: { 'X-Content-Path': path } });
    }
}

async function importRequestCallback() {
    dispatchImportRequest(await getMostRecentDestinyModel(userPreferences.get('outputPath')));
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

async function runDCG(hashes, game = "2", callback = () => {}) {
    return new Promise((resolve, reject) => {
        // DestinyColladaGenerator.exe <GAME> -o <OUTPUT PATH> [<HASHES>]
        let exeArgs = [game, '-o', userPreferences.get('outputPath')].concat(hashes)
        let child = execFile(userPreferences.get('dcgPath'), exeArgs, (err) => {
            if (err) {
                 reject(err);
            }
        });
        child.stdout.on('data', printConsoleLog);
        child.stderr.on('data', printConsoleError);
        child.on('exit', (code) => {
            logExitCode(code);
            callback();
            resolve();
        });
    });
}

async function runDCGAll(items, game = "2", callback = () => {}) {
    return new Promise(async (resolve, reject) => {
        while (items.length > 0) {
            await runDCG([items.pop().hash], game, callback);
        }
        resolve();
    })
}

async function runMDE(item, outputPath, callback = () => {}) {
    return new Promise((resolve, reject) => {
        // MontevenDynamicExtractor.exe -p <PACKAGE PATH> -o <OUTPUT PATH> -n <ITEM NAME> -t -h <HASH>
        let exeArgs = ['--pkgspath', replaceBackslashes(userPreferences.get('pkgPath')), '--outputpath', replaceBackslashes(outputPath)]
            // If the item's class is not null, add it to the name, then replace all the spaces with underscores
            .concat((item.shader ? [] : ['--filename', `${(item.class ? `${item.class}_` : '')}${item.name.toLowerCase()}`.replaceAll(/[ -]/g, '_')]))
            // If the item is a shader, use the '-h' flag, otherwise use the '-a' flag
            .concat(['--textures', (item.shader ? '--shader' : '--api'), item.hash]);

        let child = execFile(userPreferences.get('mdePath'), exeArgs, { cwd: path.parse(userPreferences.get('mdePath')).dir }, (err) => {
            if (err) {
                reject(err);
            }
        });
        child.stdout.on('data', printConsoleLog);
        child.stderr.on('data', printConsoleError);
        child.on('exit', (code) => {
            logExitCode(code);
            callback();
            resolve();
        })
    });
}

async function runMDEAll(items, outputPath) {
    return new Promise(async (resolve, reject) => {
        while (items.length > 0) {
            await runMDE(items.pop(), outputPath);
        }
        resolve();
    })
}

async function convertShaderJSON(shaderPath, name, callback = () => {}) {
    return new Promise((resolve, reject) => {
        // DestinyColladaGenerator.exe -s <SHADER JSON PATH> <OUTPUT PATH> <ITEM NAME>
        let child = execFile(userPreferences.get('dcgPath'), ['-s', shaderPath, userPreferences.get('outputPath'), name], (err) => {
            if (err) {
                reject(err);
            }
        });
        child.stdout.on('data', printConsoleLog);
        child.stderr.on('data', printConsoleError);
        child.on('exit', (code) => {
            logExitCode(code);
            callback();
            resolve();
        });
    });
}

async function ripShader(shader, callback = () => {}) {
    return new Promise(async (resolve, reject) => {
        let workingDir = await fsp.mkdtemp(path.join(tempDir, `${shader.name}-`));
        await runMDE(shader, workingDir);
        await convertShaderJSON(path.join(workingDir, `${shader.name}.json`), shader.name);
        callback();
        resolve()
    })
}

async function ripAllShaders(shaders, callback = () => {}) {
    return new Promise(async (resolve, reject) => {
        while (shaders.length > 0) {
            await ripShader(shaders.pop(), callback);
        }
        resolve();
    })
}

async function executeQueue(game, items) {
    // change DOM to reflect program state
    document.getElementById('queue-execute-button').setAttribute('disabled', 'disabled');
    buttonTimout = setTimeout(hideLoading, 1000*20);

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
            await runDCG(_3dItems.map((item) => { return item.hash }), game);
            let hdtPath = path.join((await getMostRecentDestinyModel(userPreferences.get('outputPath'))), 'HD_Textures');
            await fsp.mkdir(hdtPath);
            await runMDEAll(_3dItems, hdtPath);
            importRequestCallback();
        } else {
            for (const item of _3dItems) {
                await runDCG([item.hash], game);
                let hdtPath = path.join((await getMostRecentDestinyModel(userPreferences.get('outputPath'))), 'HD_Textures');
                await fsp.mkdir(hdtPath);
                await runMDE(item, hdtPath);
                importRequestCallback();
            }
        }
    } else {
        // Skip HD textures
        if (userPreferences.get('aggregateOutput')) {
            await runDCG(_3dItems.map((i) => { return i.hash }), game);
            importRequestCallback();
        } else {
            await runDCGAll(_3dItems, game, importRequestCallback);
        }
    }

    if (userPreferences.get('ripShaders') && d2Shaders.length > 0) {
        // Extract shaders
        // Generate shader.json using MDE and save output to temp directory
        await ripAllShaders(d2Shaders, importRequestCallback);
    }

    hideLoading();
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