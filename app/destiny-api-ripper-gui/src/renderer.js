const fs = require('fs');
const { execFile } = require('child_process');
const { error } = require('console');
const { stdout } = require('process');

let itemContainer = $('#item-container');
let queue = $('#extract-queue');

let outputPath = './output';
let CGTPath = './DestinyColladaGenerator.exe'
let itemDefinitions = JSON.parse(fs.readFileSync('./data/item_definitions.json'));

function createItemTile(item) {
    let tileRoot = $('<div></div>', {
        class: 'item-tile d-flex align-items-center p-1 rounded',
        id: item.hash,
        'data-index': item.index,
        on: {
            click: itemTileClickHandler
        }
    });

    if (item.displayProperties.hasIcon) {
        tileRoot.append($('<img></img>', {
            src: `https://bungie.net${item.displayProperties.icon}`,
            referrerpolicy: 'no-referrer',
            crossorigin: 'None'
        }));
    }

    let textDiv = $('<div></div>', {
        class: 'tile-text d-inline-flex p-2'
    })

    let textContainer = $('<div></div>', {});

    textContainer.append($(`<h6></h6>`, {
        text: (item.displayProperties.name ? item.displayProperties.name : undefined),
        class: 'm-0'
    }));

    textContainer.append($(`<small></small>`, {
        text: (item.itemTypeAndTierDisplayName ? item.itemTypeAndTierDisplayName : undefined),
        class: 'fst-italic'
    }));

    textDiv.append(textContainer);
    tileRoot.append(textDiv);

    return tileRoot;
}

function itemTileClickHandler(event) {
    // itemTile.detach()
    if ($(event.currentTarget).parents()[0].id == 'item-container') {
        queue.append($(event.currentTarget).detach());
    } else if ($(event.currentTarget).parents()[0].id == 'extract-queue') {
        //TODO: Put the item back in the correct spot
        itemContainer.append($(event.currentTarget).detach());
    }
}

function searchBoxUpdate(event) {
    let searchQuery = event.target.value;
    console.log(searchQuery);
}

function loadItems() {
    itemContainer.empty();
    queue.empty();
    console.log(`${itemDefinitions.length} items indexed.`)
    itemDefinitions.forEach(item => {
        itemContainer.append(createItemTile(item));
    });
    console.log(`${itemDefinitions.length} items loaded.`)
}

function executeQueue() {
    // DestinyColladaGenerator.exe [<GAME>] [-o <OUTPUTPATH>] [<HASHES>]
    let commandArgs = ['2', '-o', outputPath].concat([...queue[0].children].map(item => { return item.id }));
    let child = execFile(CGTPath, commandArgs, (err, stdout, stderr) => {
        if (err) {
            throw err;
        }
        console.log(stdout);
        console.err(stderr);
    });
}

window.addEventListener('DOMContentLoaded', (event) => {
    loadItems();
});

document.getElementById('queue-clear-button').addEventListener('click', loadItems);
document.getElementById('queue-execute-button').addEventListener('click', executeQueue);
document.getElementById('search-box').addEventListener('input', searchBoxUpdate);
