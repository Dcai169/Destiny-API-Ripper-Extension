// Module imports
const { ipcRenderer } = require('electron');
const log = require('electron-log');

// Script imports
const { getDestiny1ItemDefinitions, getDestiny2ItemDefinitions } = require('./scripts/destinyManifest.js');
const { createItemTile, addItemToContainer } = require('./scripts/itemTile.js');
const { setVisibility, setInputElemValue, printConsole } = require('./scripts/uiUtils.js');
const { executeButtonClickHandler } = require('./scripts/toolWrapper.js');
const { typeFilterClickHandler, dependentFilterClickHandler, rarityFilterClickHandler } = require('./scripts/filterMenus.js');
const { userPreferences } = require('../userPreferences');

// Document Objects
let itemContainer = document.getElementById('item-container');
let queue = document.getElementById('extract-queue');
let gameSelector = document.getElementById('gameSelector');

let searchTimeout;
let reloadRequired = false;
let itemMap = {
    '1': {
        get: getDestiny1ItemDefinitions,
        items: undefined
    },
    '2': {
        get: getDestiny2ItemDefinitions,
        items: undefined
    }
};

function loadItems(itemMap) {
    itemContainer.innerHTML = '';
    itemMap.forEach((item) => {
        itemContainer.append(createItemTile(item, gameSelector.value));
    });
    log.debug(`${itemMap.size} items loaded`);
}

function searchBoxInputHandler() {
    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(() => {
        if (document.getElementById('search-box').value) {
            [...document.querySelectorAll('#item-container .item-tile.m-1')].forEach((item) => {
                setVisibility(item, item.getAttribute('name').toLowerCase().includes(document.getElementById('search-box').value.toLowerCase()));
            })
        } else {
            [...document.getElementById('item-container').children].forEach((item) => {
                setVisibility(item);
            })
        }
    }, 500);
}

function gameSelectorChangeHandler() {
    if (itemMap[gameSelector.value].items) {
        loadItems(itemMap[gameSelector.value].items);
    } else {
        itemMap[gameSelector.value].get(userPreferences.get('locale').toLowerCase()).then((res) => {
            itemMap[gameSelector.value].items = res;
            loadItems(res);
        });
    }
}

function localeChangeHandler() {
    reloadRequired = true;
    document.getElementById('modal-close-button').textContent = 'Reload';
    userPreferences.set('locale', document.getElementById('locale').value);
}

function validateAndSetPath(path, settingKey) {
    if (!path) return;
    userPreferences.set(settingKey, path);
    document.getElementById(settingKey).value = path;
}

window.addEventListener('DOMContentLoaded', () => {
    if (process.platform === 'win32' && process.arch === 'x64') document.getElementById('mde-settings').classList.remove('hidden');

    ipcRenderer.invoke('getStartupConsoleMessage').then((startupConsoleMessages) => {
        startupConsoleMessages.forEach((message) => {
            printConsole(message.consoleMessage, message.textType);
        })
        printConsole('\n');
    });

    // Load userPreferences
    for ([key, value] of userPreferences) {
        setInputElemValue(key, value);
    }

    // Load items
    if (!itemMap[gameSelector.value].items) {
        itemMap[gameSelector.value].get(userPreferences.get('locale').toLowerCase()).then((res) => {
            itemMap[gameSelector.value].items = res;
            loadItems(res);
        });
    }
});

// Navbar items
gameSelector.addEventListener('change', gameSelectorChangeHandler);
[...document.getElementsByClassName('rarity-filter')].forEach((inputElem) => { inputElem.addEventListener('click', rarityFilterClickHandler); });
[...document.getElementsByClassName('type-filter')].forEach((element) => { element.addEventListener('click', typeFilterClickHandler) });
[...document.getElementsByClassName('dependent-filter')].forEach((element) => { element.addEventListener('click', dependentFilterClickHandler) });
document.getElementById('queue-clear-button').addEventListener('click', () => {
    [...queue.children].forEach(item => { addItemToContainer(item); });
    // log.silly('Queue cleared.');
});
document.getElementById('queue-execute-button').addEventListener('click', executeButtonClickHandler);
document.getElementById('search-box').addEventListener('input', searchBoxInputHandler);

// Console
document.getElementById('console-clear').addEventListener('click', () => { document.getElementById('console-text').innerHTML = '' });

// Settings modal
document.getElementById('open-output').addEventListener('click', () => { ipcRenderer.send('openExplorer', [userPreferences.get('outputPath')]) })
document.getElementById('aggregateOutput').addEventListener('input', () => { userPreferences.set('aggregateOutput', document.getElementById('aggregateOutput').checked) });
document.getElementById('ripHDTextures').addEventListener('input', () => { userPreferences.set('ripHDTextures', document.getElementById('ripHDTextures').checked) });
document.getElementById('ripShaders').addEventListener('input', () => { userPreferences.set('ripShaders', document.getElementById('ripShaders').checked) });
document.getElementById('locale').addEventListener('change', localeChangeHandler);

document.getElementById('outputPath').addEventListener('click', () => { ipcRenderer.invoke('selectOutputPath').then((res) => { validateAndSetPath(res, 'outputPath') }) });
document.getElementById('dcgPath').addEventListener('click', () => { ipcRenderer.invoke('selectDCGPath').then((res) => { validateAndSetPath(res, 'dcgPath') }) });
document.getElementById('mdePath').addEventListener('click', () => { ipcRenderer.invoke('selectMDEPath').then((res) => { validateAndSetPath(res, 'mdePath') }) });
document.getElementById('pkgPath').addEventListener('click', () => { ipcRenderer.invoke('selectPKGPath').then((res) => { validateAndSetPath(res, 'pkgPath') }) });

document.getElementById('modal-close-button').addEventListener('click', () => {
    if (reloadRequired) {
        document.location.reload();
        reloadRequired = false;
    }
});

// Keyboard shortcuts
ipcRenderer.on('reload', (_, args) => {
    if (args) {
        loadItems();
    }
});

ipcRenderer.on('force-reload', (_, args) => {
    if (args) {
        document.location.reload();
    }
});
