// Read API Key
require('dotenv').config({ path: 'api.env' });

// Module imports
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { ipcRenderer } = require('electron');
// const os = require('os');

// Script imports
const defaultPreferences = require('./scripts/defaultPreferences');
const { createItemTile, addItemToContainer } = require('./scripts/itemTile.js');
const { setVisibility, updateUIInput } = require('./scripts/uiUtils.js');
const execute = require('./scripts/extractor.js');

let itemContainer = $('#item-container');
let queue = $('#extract-queue');
let gameSelector = document.getElementById('gameSelector');

let userPreferences;
try {
    userPreferences = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'user_preferences.json'), 'utf-8'));
} catch (error) {
    // default preferences
    userPreferences = defaultPreferences;
    for (const [key, property] of Object.entries(userPreferences)) {
        property.ifUndefined(key);

    }
    propogateUserPreferences();
}

let destiny1ItemDefinitions = {};
let destiny2ItemDefinitions = {};
let searchDebounceTimeout;
let selectedItems = [];
let reloadRequired = false;

const baseUrl = 'https://bungie.net';
const apiRoot = baseUrl + '/Platform';
const blacklistedHashes = [4248210736] +
    [2965439266, 4236468733, 2699000684, 1702504372, 3344732822, 2912265353, 4143534670, 873770815, 3367964921, 4089988225, 811724212, 3054638345, 463166592, 3507818312, 3835954362, 1339405989] + // Solstice Glows
    [3807544519, 834178986, 839740147, 577345565, 574694085, 2039333456, 60802325, 3031612900, 2449203932, 242730894, 3735037521, 558870048, 2419910641, 2552954151, 2251060291, 3692806198]; // More Glows

function getDestiny2ItemDefinitions(callback) {
    axios.get(apiRoot + '/Destiny2/Manifest/', { headers: { 'X-API-Key': process.env.API_KEY } })
        .then((res) => {
            axios.get(baseUrl + res.data.Response.jsonWorldComponentContentPaths[userPreferences.locale.value.toLowerCase()].DestinyInventoryItemDefinition)
                .then((res) => {
                    for (let [hash, item] of Object.entries(res.data)) {
                        if (((item) => {
                            if (blacklistedHashes.includes(item.hash)) { return false }
                            if ([2, 21, 22, 24].includes(item.itemType)) { return true }
                            if (item.defaultDamageType > 0) { return true }
                            if (item.itemType === 19 && [20, 21].includes(item.itemSubType)) { return true }
                        })(item)) {
                            destiny2ItemDefinitions[hash] = item;
                        }
                    }
                    destiny2ItemDefinitions = new Map();
                    [...Object.values(destiny2ItemDefinitions)].sort((a, b) => { return a.index - b.index }).forEach((item) => {
                        destiny2ItemDefinitions.set(item.hash, item);
                    });
                    callback();
                });
        });
}

function searchBoxInputHandler(event) {
    clearTimeout(searchDebounceTimeout);

    searchDebounceTimeout = setTimeout(() => {
        if (event.target.value) {
            itemContainer.eq(0).children().each((_, element) => {
                let item = $(`#${element.id}`)
                if (item.attr('name').toLowerCase().includes(event.target.value.toLowerCase())) {
                    setVisibility(item, true);
                } else {
                    setVisibility(item, false);
                }
            });
        } else {
            itemContainer.eq(0).children().each((_, element) => {
                setVisibility($(`#${element.id}`), true);
            });
        }
    }, 500);
}

function loadItems() {
    itemContainer.empty();
    queue.empty();
    if (gameSelector.value === '2') {
        console.log(`${destiny2ItemDefinitions.size} items indexed.`)
        destiny2ItemDefinitions.forEach((item) => {
            itemContainer.append(createItemTile(item, 2));
        });
        console.log(`${destiny2ItemDefinitions.size} items loaded.`)
    } else if (gameSelector.value === '1') {
        console.log('Destiny 1 support is not yet implemented');
    }
}

function executeButtonClickHandler() {
    if (navigator.onLine) {
        let itemHashes = [...queue.eq(0).children()].map(item => { return item.id });
        console.log(`Hashes: ${itemHashes}`);

        execute(gameSelector.value, itemHashes);
    } else {
        console.log('No internet connection detected');
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
    getDestiny2ItemDefinitions(loadItems);
    propogateUserPreferences()
});

// Features implemented in this file
document.getElementById('queue-clear-button').addEventListener('click', () => { [...queue.eq(0).children()].forEach(item => { addItemToContainer($(`#${item.id}`).detach()); }) });
document.getElementById('queue-execute-button').addEventListener('click', executeButtonClickHandler);
document.getElementById('search-box').addEventListener('input', searchBoxInputHandler);
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

// Features implemented using IPCs
document.getElementById('outputPath').addEventListener('click', () => { ipcRenderer.send('selectOutputPath') });
document.getElementById('toolPath').addEventListener('click', () => { ipcRenderer.send('selectToolPath') });
document.getElementById('open-output').addEventListener('click', () => { ipcRenderer.send('openExplorer', [userPreferences.outputPath.value]) })

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

// Not implemented
document.getElementById('sort-rules-button').addEventListener('click', notImplemented);
document.getElementById('filter-button').addEventListener('click', notImplemented);
