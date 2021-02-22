// Read API Key
require('dotenv').config({ path: 'api.env' });

// Module imports
const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');
// const os = require('os');

// Script imports
const { getDestiny1ItemDefinitions, getDestiny2ItemDefinitions } = require('./scripts/destinyManifest.js.js');
const { createItemTile, addItemToContainer } = require('./scripts/itemTile.js.js');
const { setVisibility, updateUIInput } = require('./scripts/uiUtils.js');
const { executeButtonClickHandler } = require('./scripts/toolWrapper.js');
const { baseFilterClickHandler, compositeFilterClickHandler, updateItems } = require('./scripts/filterMenus.js.js');

// Document Objects
let itemContainer = $('#item-container');
let queue = $('#extract-queue');
let gameSelector = document.getElementById('gameSelector');

// Load user preferences
let userPreferences;

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
    console.log('Container cleared.');
    itemContainer.empty();
    console.log('Queue cleared.');
    queue.empty();

    console.log(`${itemMap.size} items indexed.`);
    itemMap.forEach((item) => {
        itemContainer.append(createItemTile(item, gameSelector.value));
    });
    console.log(`${itemMap.size} items loaded.`);
}

function searchBoxInputHandler(event) {
    clearTimeout(searchDebounceTimeout);

    searchDebounceTimeout = setTimeout(() => {
        if (event.target.value) {
            itemContainer.eq(0).children().each((_, element) => {
                let item = $(`#${element.id}`);
                if (item.hasClass('m-1') && item.attr('name').toLowerCase().includes(event.target.value.toLowerCase())) {
                    setVisibility(item, true);
                } else {
                    setVisibility(item, false);
                }
            });
        } else {
            [...document.getElementsByClassName('base-filter')].forEach(updateItems);
        }
    }, 500);
}

function gameSelectorChangeListener(){
    if (itemMap[gameSelector.value].items) {
        loadItems(itemMap[gameSelector.value].items);
    } else {
        itemMap[gameSelector.value].get(locale).then((res) => {
            itemMap[gameSelector.value].items = res;
            loadItems(res);
        });
    }
}

function propogateUserPreferences(key) {
    if (key) {
        updateUIInput(key, userPreferences[key].value);
    } else {
        for (const [key, property] of Object.entries(userPreferences)) {
            updateUIInput(key, property.value);
        }
    }
    fs.writeFileSync(path.join(process.cwd(), 'user_preferences.json'), JSON.stringify(userPreferences), 'utf8');
}

function updateUserPreference(key, value) {
    if (userPreferences[key].value !== value) {
        userPreferences[key].value = value;
        propogateUserPreferences(key);
    }
}

function notImplemented() {
    alert('This feature has not been implemented yet.');
}

window.addEventListener('DOMContentLoaded', (event) => {
    let locale = userPreferences.locale.value.toLowerCase();
    if (!itemMap[gameSelector.value].items) {
        itemMap[gameSelector.value].get(locale).then((res) => {
            itemMap[gameSelector.value].items = res;
            loadItems(res);
        });
    }
    propogateUserPreferences();
});

// Navbar items
gameSelector.addEventListener('change', gameSelectorChangeListener);
[...document.getElementsByClassName('base-filter')].forEach((element) => { element.addEventListener('click', baseFilterClickHandler) });
[...document.getElementsByClassName('composite-filter')].forEach((element) => { element.addEventListener('click', compositeFilterClickHandler) });
document.getElementById('queue-clear-button').addEventListener('click', () => { [...queue.eq(0).children()].forEach(item => { addItemToContainer($(`#${item.id}`).detach()); }); console.log('Queue cleared.'); });
document.getElementById('queue-execute-button').addEventListener('click', executeButtonClickHandler);
document.getElementById('search-box').addEventListener('input', searchBoxInputHandler);

// Console
document.getElementById('console-clear').addEventListener('click', () => { document.getElementById('console-text').textContent = '' });
document.getElementById('console-save').addEventListener('click', notImplemented);

// Settings modal
document.getElementById('outputPath').addEventListener('click', () => { ipcRenderer.send('selectOutputPath') });
document.getElementById('toolPath').addEventListener('click', () => { ipcRenderer.send('selectToolPath') });
document.getElementById('open-output').addEventListener('click', () => { ipcRenderer.send('openExplorer', [userPreferences.outputPath.value]) })
document.getElementById('aggregateOutput').addEventListener('input', () => { updateUserPreference('aggregateOutput', document.getElementById('aggregateOutput').checked) });
document.getElementById('locale').addEventListener('change', () => {
    reloadRequired = true;
    $('#modal-close-button').text('Reload');
    updateUserPreference('locale', document.getElementById('locale').value);
});
document.getElementById('modal-close-button').addEventListener('click', () => {
    if (reloadRequired) {
        document.location.reload();
        reloadRequired = false;
    }
});

ipcRenderer.on('selectOutputPath-reply', (_, args) => {
    if (args) {
        updateUserPreference('outputPath', args[0]);
    }
});

ipcRenderer.on('selectToolPath-reply', (_, args) => {
    if (args) {
        updateUserPreference('toolPath', args[0]);
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
