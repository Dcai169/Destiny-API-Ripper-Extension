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
const defaultPreferences = require('./defaultPreferences');
const createItemTile = require('./itemTile.js').createItemTile;
const addItemToContainer = require('./itemTile.js').addItemToContainer;
const execute = require('./extractor.js');
// const evaluateReplace = require('./evaluateReplace.js');

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
    // fs.writeFileSync(path.join(process.cwd(), 'user_preferences.json'), JSON.stringify(userPreferences), 'utf8');
}

let destiny1ItemDefinitions = {};
let destiny2ItemDefinitions = {};
let searchDebounceTimeout;
let selectedItems = [];

const baseUrl = 'https://bungie.net';
const apiRoot = baseUrl + '/Platform';

function getDestiny2ItemDefinitions(callback) {
    axios.get(apiRoot + '/Destiny2/Manifest/', { headers: { 'X-API-Key': process.env.API_KEY } })
        .then((res) => {
            axios.get(baseUrl + res.data.Response.jsonWorldComponentContentPaths[userPreferences.locale.value.toLowerCase()].DestinyInventoryItemDefinition)
                .then((res) => {
                    for (let [hash, item] of Object.entries(res.data)) {
                        if (((item) => {
                            let testTypeDisplayName = (item.itemTypeDisplayName ? item.itemTypeDisplayName : '');
                            if (testTypeDisplayName.includes('Defaults')) { return false }
                            if (testTypeDisplayName.includes('Glow')) { return false }
                            if ([2, 21, 22, 24].includes(item.itemType)) { return true }
                            if (item.defaultDamageType > 0) { return true }
                            if (item.itemType === 19 && [20, 21].includes(item.itemSubType)) { return true }
                        })(item)) {
                            destiny2ItemDefinitions[hash] = item;
                        }
                    }
                    sortItemDefinitions(callback);
                });
        });
}

function sortItemDefinitions(callback) {
    let items = [...Object.values(destiny2ItemDefinitions)].sort((a, b) => { return a.index - b.index });
    destiny2ItemDefinitions = new Map();
    items.forEach((item) => {
        destiny2ItemDefinitions.set(item.hash, item);
    });
    callback();
}

function setVisibility(jqueryObj, state) {
    // true -> visible
    // false -> hidden
    jqueryObj.removeClass((state ? 'hidden' : 'p-1')).addClass((state ? 'p-1' : 'hidden'))
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

function loadDestiny2Items() {
    itemContainer.empty();
    queue.empty();
    console.log(`${destiny2ItemDefinitions.size} items indexed.`)
    destiny2ItemDefinitions.forEach((item) => {
        itemContainer.append(createItemTile(item, 2));
    })
    console.log(`${destiny2ItemDefinitions.size} items loaded.`)
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

function updateUIInput(elementId, value) {
    switch (typeof value) {
        case 'string':
            $(`#${elementId}`).val(value);
            break;

        case 'boolean':
            $(`#${elementId}`).prop('checked', !!value);
            break;

        default:
            break;
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
    getDestiny2ItemDefinitions(loadDestiny2Items);
    propogateUserPreferences()
});

// Features implemented in this file
document.getElementById('queue-clear-button').addEventListener('click', () => { [...queue.eq(0).children()].forEach(item => { addItemToContainer($(`#${item.id}`).detach()); }) });
document.getElementById('queue-execute-button').addEventListener('click', executeButtonClickHandler);
document.getElementById('search-box').addEventListener('input', searchBoxInputHandler);
document.getElementById('aggregateOutput').addEventListener('input', () => { updateUserPreference('aggregateOutput', document.getElementById('aggregateOutput').checked) });

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
        loadDestiny2Items();
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
