require('dotenv').config({ path: 'api.env' });

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { ipcRenderer } = require('electron');
const os = require('os');

let itemContainer = $('#item-container');
let queue = $('#extract-queue');

let userPreferences;
try {
    userPreferences = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'user_preferences.json'), 'utf-8'));
} catch (error) {
    // default preferences
    userPreferences = {
        "outputPath": null,
        "toolPath": null,
        "locale": "en"
    };
    fs.writeFileSync(path.join(process.cwd(), 'user_preferences.json'), JSON.stringify(userPreferences), 'utf8');
}

if (!userPreferences.toolPath) {
    alert('Please select your Destiny Collada Generator executable. Must be at least version 1.5.1.');
    ipcRenderer.send('selectToolPath');
}

if (!userPreferences.outputPath) {
    let defaultPath = path.join(process.cwd(), 'output');
    if (defaultPath) {
        fs.mkdirSync(defaultPath);
    }
    userPreferences.outputPath = defaultPath
}

let destiny1ItemDefinitions = {};
let destiny2ItemDefinitions = {};
let searchDebounceTimeout;

const baseUrl = 'https://bungie.net';
const apiRoot = baseUrl + '/Platform';

function itemFilter(item) {
    let testTypeDisplayName = (item.itemTypeDisplayName ? item.itemTypeDisplayName : '');
    if (testTypeDisplayName.includes('Defaults')) { return false }
    if (testTypeDisplayName.includes('Glow')) { return false }
    if ([2, 22, 24].includes(item.itemType)) { return true }
    if (item.defaultDamageType > 0) { return true }
    if (item.itemType === 19 && [20, 21].includes(item.itemSubType)) { return true }
}

function getDestiny2ItemDefinitions(callback) {
    axios.get(apiRoot + '/Destiny2/Manifest/', { headers: { 'X-API-Key': process.env.API_KEY } })
        .then((res) => {
            axios.get(baseUrl + res.data.Response.jsonWorldComponentContentPaths[userPreferences.locale].DestinyInventoryItemDefinition)
                .then((res) => {
                    for (let [hash, item] of Object.entries(res.data)) {
                        if (itemFilter(item)) {
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
        // console.log(item.displayProperties.name)
    });
    callback();
}

// function that finds the closest value in a list of numbers
function closest(searchTarget, targetList) {
    return targetList.reduce((prev, curr) => {
        return (Math.abs(curr - searchTarget) < Math.abs(prev - searchTarget) ? curr : prev);
    });
}

function createItemTile(item, game) {
    let tileRoot = $('<div></div>', {
        class: 'item-tile d-flex align-items-center p-1',
        // style: 'content-visibility: visible;',
        id: item.hash,
        'data-index': item.index,
        name: (item.displayProperties.name ? item.displayProperties.name : 'Classified'),
        on: {
            click: itemTileClickHandler
        }
    });

    let imgDiv = $('<div></div>', {
        style: 'display: grid; position: relative;'
    });

    imgDiv.append($('<img></img>', {
        src: `https://bungie.net${item.displayProperties.icon}`,
        referrerpolicy: 'no-referrer',
        crossorigin: 'None',
        loading: 'lazy',
        style: 'grid-row: 1; grid-column: 1;'
    }));

    if (item.iconWatermark) {
        imgDiv.append($('<img></img>', {
            src: `https://bungie.net${item.iconWatermark}`,
            referrerpolicy: 'no-referrer',
            crossorigin: 'None',
            loading: 'lazy',
            style: 'grid-row: 1; grid-column: 1; z-index: 1;'
        }));
    }

    let textDiv = $('<div></div>', {
        class: 'tile-text d-inline-flex px-2'
    });

    let textContainer = $('<div></div>', {});
    textContainer.append($(`<h6></h6>`, {
        text: (item.displayProperties.name ? item.displayProperties.name : undefined),
        class: 'm-0',
        style: `color: var(--${item.inventory.tierTypeName.toLowerCase()}-color)`
    }));
    textContainer.append($(`<i></i>`, {
        text: (item.itemTypeDisplayName ? item.itemTypeDisplayName : undefined),
        class: 'fs-5 item-type',
        // style: 'font-size: 110%'
    }));

    textDiv.append(textContainer);
    tileRoot.append(imgDiv);
    tileRoot.append(textDiv);

    return tileRoot;
}

function addItemToContainer(item) {
    let containerContents = [...itemContainer.eq(0).children()].map(item => { return item.dataset.index });
    if (item.data('index') < Math.min(...containerContents)) {
        $(`[data-index='${closest(item.data('index'), containerContents)}']`).before(item);
    } else {
        $(`[data-index='${closest(item.data('index'), containerContents)}']`).after(item);
    }
}

function clearQueue() {
    [...queue.eq(0).children()].forEach(item => { addItemToContainer($(`#${item.id}`).detach()); });
}

function itemTileClickHandler(event) {
    let tileLocation = $(event.currentTarget).eq(0).parents().attr('id');
    if (tileLocation === 'item-container') {
        queue.append($(event.currentTarget).detach());
    } else if (tileLocation === 'extract-queue') {
        //TODO: Put the item back in the correct spot
        addItemToContainer($(event.currentTarget).detach());
    }
}

function setVisibility(jqueryObj, state) {
    // true -> visible
    // false -> hidden
    jqueryObj.removeClass((state ? 'hidden' : 'p-1')).addClass((state ? 'p-1' : 'hidden'))
}

function searchBoxUpdate(event) {
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
    console.log(`${destiny2ItemDefinitions.size} items indexed.`)
    destiny2ItemDefinitions.forEach((item) => {
        itemContainer.append(createItemTile(item, 2));
    })
    console.log(`${destiny2ItemDefinitions.size} items loaded.`)
}

function executeQueue() {
    // DestinyColladaGenerator.exe [<GAME>] [-o <OUTPUTPATH>] [<HASHES>]
    let itemHashes = [...queue.eq(0).children()].map(item => { return item.id });
    let commandArgs = ['2', '-o', userPreferences.outputPath].concat(itemHashes);
    console.log(`Hashes: ${itemHashes}`);
    setVisibility($('#loading-indicator'), true);
    let child = execFile(userPreferences.toolPath, commandArgs, (err, stdout, stderr) => {
        if (err) {
            throw err;
        }
        // console.log(stdout);
        // console.log(stderr);

    });
    console.log(child);
    child.stdout.on('data', (data) => { console.log(`stdout: ${data}`) });
    child.stderr.on('data', (data) => { console.log(`stderr: ${data}`) });
    child.on('exit', (code) => { setVisibility($('#loading-indicator'), false); });
}

function propogateUserPreferences() {
    $('#outputPath').val(userPreferences.outputPath);
    $('#toolPath').val(userPreferences.toolPath);

    fs.writeFileSync(path.join(process.cwd(), 'user_preferences.json'), JSON.stringify(userPreferences), 'utf8');
}

function updateUserPreference(key, value) {
    if (userPreferences[key] !== value) {
        userPreferences[key] = value;
        propogateUserPreferences();
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
document.getElementById('queue-clear-button').addEventListener('click', clearQueue);
document.getElementById('queue-execute-button').addEventListener('click', executeQueue);
document.getElementById('search-box').addEventListener('input', searchBoxUpdate);

// Features implemented using IPCs
document.getElementById('outputPath').addEventListener('click', () => { ipcRenderer.send('selectOutputPath') });
document.getElementById('toolPath').addEventListener('click', () => { ipcRenderer.send('selectToolPath') });

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

// Not implemented
document.getElementById('sort-rules-button').addEventListener('click', notImplemented);
document.getElementById('filter-button').addEventListener('click', notImplemented);
document.getElementById('queue-add-button').addEventListener('click', notImplemented)
