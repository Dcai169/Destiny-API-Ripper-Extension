// Module imports
const { ipcRenderer } = require('electron');
const log = require('electron-log');
// const os = require('os');

// Script imports
const { getDestiny1ItemDefinitions, getDestiny2ItemDefinitions } = require('./scripts/destinyManifest.js');
const { createItemTile, addItemToContainer } = require('./scripts/itemTile.js');
const { setVisibility, updateUIInput } = require('./scripts/uiUtils.js');
const { executeButtonClickHandler } = require('./scripts/toolWrapper.js');
const { baseFilterClickHandler, compositeFilterClickHandler, updateItems } = require('./scripts/filterMenus.js');
const { userPreferences } = require('../userPreferences');

// Document Objects
let itemContainer = $('#item-container');
let queue = $('#extract-queue');
let gameSelector = document.getElementById('gameSelector');

let searchDebounceTimeout;
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
    log.silly('Container cleared');
    itemContainer.empty();
    log.silly('Queue cleared');
    queue.empty();

    log.debug(`${itemMap.size} items indexed`);
    itemMap.forEach((item) => {
        itemContainer.append(createItemTile(item, gameSelector.value));
    });
    log.debug(`${itemMap.size} items loaded`);
}

function searchBoxInputHandler(event) {
    window.clearTimeout(searchDebounceTimeout);

    searchDebounceTimeout = setTimeout(() => {
        if (event.target.value) {
            log.silly(`Search: ${event.target.value.toLowerCase()}`);
            // There's a bug in here; probably some sort of race condition issue
            itemContainer.eq(0).children().each((_, element) => {
                let item = $(element);
                setVisibility(item, item.hasClass('m-1') && item.attr('name').toLowerCase().includes(event.target.value.toLowerCase()));
            });
        } else {
            [...document.getElementsByClassName('base-filter')].forEach(updateItems);
        }
    }, 400);
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
        // log.debug(`${key}: ${value} (${typeof value})`);
        updateUIInput(key, value);
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
[...document.getElementsByClassName('base-filter')].forEach((element) => { element.addEventListener('click', baseFilterClickHandler) });
[...document.getElementsByClassName('composite-filter')].forEach((element) => { element.addEventListener('click', compositeFilterClickHandler) });
document.getElementById('queue-clear-button').addEventListener('click', () => { [...queue.eq(0).children()].forEach(item => { addItemToContainer($(`#${item.id}`).detach()); }); log.silly('Queue cleared.'); });
document.getElementById('queue-execute-button').addEventListener('click', executeButtonClickHandler);
document.getElementById('search-box').addEventListener('input', searchBoxInputHandler);

// Console
document.getElementById('console-clear').addEventListener('click', () => { document.getElementById('console-text').textContent = '' });

// Settings modal
document.getElementById('outputPath').addEventListener('click', () => { ipcRenderer.send('selectOutputPath') });
document.getElementById('toolPath').addEventListener('click', () => { ipcRenderer.send('selectToolPath') });
document.getElementById('open-output').addEventListener('click', () => { ipcRenderer.send('openExplorer', [userPreferences.get('outputPath')]) })
document.getElementById('aggregateOutput').addEventListener('input', () => { userPreferences.set('aggregateOutput', document.getElementById('aggregateOutput').checked) });
document.getElementById('locale').addEventListener('change', () => {
    reloadRequired = true;
    $('#modal-close-button').text('Reload');
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
    }
});

ipcRenderer.on('selectToolPath-reply', (_, args) => {
    if (args) {
        userPreferences.set('toolPath', args[0]);
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
