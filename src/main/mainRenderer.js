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

ipcRenderer.send('getStartupConsoleMessage');

function loadItems(itemMap) {
    itemMap.forEach((item) => {
        itemContainer.append(createItemTile(item, gameSelector.value));
    });
    log.debug(`${itemMap.size} items loaded`);
}

function searchBoxInputHandler() {
    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(() => {
        [...document.getElementById('item-container').children].forEach((element) => { // TODO: set visibility based on filter settings
            setVisibility(element);
        })
    }, 500);
}

function gameSelectorChangeListener() {
    if (itemMap[gameSelector.value].items) {
        loadItems(itemMap[gameSelector.value].items);
    } else {
        itemMap[gameSelector.value].get(locale).then((res) => {
            itemMap[gameSelector.value].items = res;
            loadItems(res);
        });
    }
}

window.addEventListener('DOMContentLoaded', (event) => {
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
gameSelector.addEventListener('change', gameSelectorChangeListener);
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
document.getElementById('outputPath').addEventListener('click', () => { ipcRenderer.send('selectOutputPath') });
document.getElementById('dcgPath').addEventListener('click', () => { ipcRenderer.send('selectDCGPath') });
document.getElementById('open-output').addEventListener('click', () => { ipcRenderer.send('openExplorer', [userPreferences.get('outputPath')]) })
document.getElementById('aggregateOutput').addEventListener('input', () => { userPreferences.set('aggregateOutput', document.getElementById('aggregateOutput').checked) });
document.getElementById('locale').addEventListener('change', () => {
    reloadRequired = true;
    document.getElementById('modal-close-button').textContent = 'Reload';
    userPreferences.set('locale', document.getElementById('locale').value);
});

document.getElementById('modal-close-button').addEventListener('click', () => {
    if (reloadRequired) {
        document.location.reload();
        reloadRequired = false;
    }
});

ipcRenderer.on('selectOutputPath-reply', (_, args) => {
    if (args) {
        userPreferences.set('outputPath', args[0]);
        document.getElementById('outputPath').value = args[0];
    }
});

ipcRenderer.on('selectDCGPath-reply', (_, args) => {
    if (args) {
        userPreferences.set('dcgPath', args[0]);
        document.getElementById('dcgPath').value = args[0];
    }
});

ipcRenderer.on('getStartupConsoleMessage-reply', (_, args) => { printConsole(args + '\n ', 'log') });

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
