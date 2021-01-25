const fs = require('fs');
const { execFile } = require('child_process');

let itemContainer = $('#item-container');
let queue = $('#extract-queue');

let outputPath = './output';
let CGTPath = './DestinyColladaGenerator.exe'
let itemDefinitions = JSON.parse(fs.readFileSync('./data/item_definitions.json'));
let searchDebounceTimeout;

// function that finds the closest value in a list of numbers
function closest(searchTarget, targetList) {
    return targetList.reduce((prev, curr) => {
        return (Math.abs(curr - searchTarget) < Math.abs(prev - searchTarget) ? curr : prev);
    });
}

function createItemTile(item) {
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

    if (item.displayProperties.hasIcon) {
        tileRoot.append($('<img></img>', {
            src: `https://bungie.net${item.displayProperties.icon}`,
            referrerpolicy: 'no-referrer',
            crossorigin: 'None'
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

function searchBoxUpdate(event) {
    clearTimeout(searchDebounceTimeout);
    
    searchDebounceTimeout = setTimeout(() => {
        if (event.target.value) {
            itemContainer.eq(0).children().each((_, element) => {
                if ($(`#${element.id}`).attr('name').toLowerCase().includes(event.target.value.toLowerCase())) {
                    $(`#${element.id}`).removeClass('hidden').addClass('p-1');
                } else {
                    $(`#${element.id}`).removeClass('p-1').addClass('hidden');
                }
            });
        } else {
            itemContainer.eq(0).children().each((_, element) => {
                $(`#${element.id}`).removeClass('hidden').addClass('p-1');
            });
        }
    }, 500);
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
    let commandArgs = ['2', '-o', outputPath].concat([...queue.eq(0).children()].map(item => { return item.id }));
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

document.getElementById('queue-clear-button').addEventListener('click', clearQueue);
document.getElementById('queue-execute-button').addEventListener('click', executeQueue);
document.getElementById('search-box').addEventListener('input', searchBoxUpdate);
