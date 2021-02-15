// Read API Key
require('dotenv').config({ path: 'api.env' });

// Module imports
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');
// const os = require('os');

// Script imports
const defaultPreferences = require('./scripts/defaultPreferences');
const { createItemTile, addItemToContainer } = require('./scripts/itemTile.js');
const { setVisibility, updateUIInput } = require('./scripts/uiUtils.js');
const { executeButtonClickHandler } = require('./scripts/extractor.js');
const { baseFilterClickHandler, compositeFilterClickHandler, updateItems } = require('./scripts/filterMenus.js');

// Document Objects
let itemContainer = $('#item-container');
let queue = $('#extract-queue');
let gameSelector = document.getElementById('gameSelector');
let uiConsole = document.getElementById('console-text');

// Load user preferences
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
let reloadRequired = false;

const baseUrl = 'https://bungie.net';
const apiRoot = baseUrl + '/Platform';
const blacklistedDestiny1Hashes = [4248210736]; // Default Shader
const blacklistedDestiny2Hashes = [4248210736, 2426387438, 2931483505, 1959648454, 702981643, 2325217837] + // Default Shader
    [2965439266, 4236468733, 2699000684, 1702504372, 3344732822, 2912265353, 4143534670, 873770815, 3367964921, 4089988225, 811724212, 3054638345, 463166592, 3507818312, 3835954362, 1339405989] + // Solstice Glows
    [3807544519, 834178986, 839740147, 577345565, 574694085, 2039333456, 60802325, 3031612900, 2449203932, 242730894, 3735037521, 558870048, 2419910641, 2552954151, 2251060291, 3692806198]; // More Glows

function getDestiny1ItemDefinitions(callback = () => { }) {
    axios.get(`https://dare-manifest-server.herokuapp.com/manifest?locale=${userPreferences.locale.value}`)
        .then((res) => {
            for (const [hash, item] of Object.entries(res.data)) {
                if (((item) => {
                    if (blacklistedDestiny1Hashes.includes(item.hash)) { return false }
                    if (arrayEquals(item.itemCategoryHashes, [23, 38, 20])) { return false } // Hunter Artifacts
                    if (arrayEquals(item.itemCategoryHashes, [22, 38, 20])) { return false } // Titan Artifacts
                    if (arrayEquals(item.itemCategoryHashes, [21, 38, 20])) { return false } // Warlock Artifacts
                    if (item.itemCategoryHashes && item.itemCategoryHashes.includes(1) && item.itemCategoryHashes.length === 2) { return false } // Reforge Weapon
                    if (arrayEquals(item.itemCategoryHashes, [41, 52])) { return true } // Shaders
                    if (arrayEquals(item.itemCategoryHashes, [42, 52])) { return true } // Ships
                    if ([2, 3].includes(item.itemType)) { return true } // Armor and Weapons
                })(item)) {
                    destiny1ItemDefinitions[hash] = item;
                }
            }
            let items = Object.values(destiny1ItemDefinitions);
            destiny1ItemDefinitions = new Map();
            items.forEach((item) => {
                destiny1ItemDefinitions.set(item.hash, item);
            });
            callback();
        });
}

function getDestiny2ItemDefinitions(callback = () => { }) {
    axios.get(apiRoot + '/Destiny2/Manifest/', { headers: { 'X-API-Key': process.env.API_KEY } })
        .then((res) => {
            axios.get(baseUrl + res.data.Response.jsonWorldComponentContentPaths[userPreferences.locale.value.toLowerCase()].DestinyInventoryItemDefinition)
                .then((res) => {
                    for (let [hash, item] of Object.entries(res.data)) {
                        if (((item) => {
                            if (blacklistedDestiny2Hashes.includes(item.hash)) { return false }
                            if ([2, 21, 22, 24].includes(item.itemType)) { return true } // Armor, Ships, Sparrows, Ghost Shells
                            if (item.defaultDamageType > 0) { return true } // Weapons
                            if (item.itemType === 19 && [20, 21].includes(item.itemSubType)) { return true } // Ornaments
                        })(item)) {
                            destiny2ItemDefinitions[hash] = item;
                        }
                    }
                    // Sort into a Map object
                    let items = Object.values(destiny2ItemDefinitions).sort((a, b) => { return a.index - b.index });
                    destiny2ItemDefinitions = new Map();
                    items.forEach((item) => {
                        destiny2ItemDefinitions.set(item.hash, item);
                    });
                    callback();
                });
        });
}

function loadItems() {
    console.log('Container cleared.');
    itemContainer.empty();
    console.log('Queue cleared.');
    queue.empty();
    if (gameSelector.value === '2') {
        console.log(`${destiny2ItemDefinitions.size} items indexed.`);
        destiny2ItemDefinitions.forEach((item) => {
            itemContainer.append(createItemTile(item, '2'));
        });
        console.log(`${destiny2ItemDefinitions.size} items loaded.`);
    } else if (gameSelector.value === '1') {
        console.log(`${destiny1ItemDefinitions.size} items indexed.`);
        destiny1ItemDefinitions.forEach((item) => {
            itemContainer.append(createItemTile(item, '1'));
        });
        console.log(`${destiny2ItemDefinitions.size} items loaded.`);
    }
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

function arrayEquals(a, b) {
    return Array.isArray(a) && Array.isArray(b) && // both are Arrays
        a.length === b.length && // Same length
        a.every((val, index) => val === b[index]); // each value is the same
}

function notImplemented() {
    alert('This feature has not been implemented yet.');
}

window.addEventListener('DOMContentLoaded', (event) => {
    if (gameSelector.value === '2') {
        getDestiny2ItemDefinitions(loadItems);
        getDestiny1ItemDefinitions();
    } else {
        getDestiny1ItemDefinitions(loadItems);
        getDestiny2ItemDefinitions();
    }

    propogateUserPreferences()
});

// Navbar items
gameSelector.addEventListener('change', loadItems);
[...document.getElementsByClassName('base-filter')].forEach((element) => {element.addEventListener('click', baseFilterClickHandler)});
[...document.getElementsByClassName('composite-filter')].forEach((element) => {element.addEventListener('click', compositeFilterClickHandler)});
document.getElementById('queue-clear-button').addEventListener('click', () => { [...queue.eq(0).children()].forEach(item => { addItemToContainer($(`#${item.id}`).detach()); }); console.log('Queue cleared.'); });
document.getElementById('queue-execute-button').addEventListener('click', executeButtonClickHandler);
document.getElementById('search-box').addEventListener('input', searchBoxInputHandler);

// Console
document.getElementById('console-clear').addEventListener('click', () => {uiConsole.textContent = ''});
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
