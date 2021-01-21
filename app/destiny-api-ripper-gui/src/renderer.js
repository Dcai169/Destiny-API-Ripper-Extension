let fs = require('fs');

let itemContainer = $('#item-container');
let queue = $('#extract-queue');
let queueButtons = $('#queue-buttons');

items = JSON.parse(fs.readFileSync('./data/item_definitions.json'));

function createItemTile(item) {
    let tileRoot = $('<div></div>', {
        class: 'item-tile container p-1', 
        id: item.hash
    });
    tileRoot.append($('<img></img>', {
        src: `https://bungie.net${item.displayProperties.icon}`,
        referrerpolicy: 'no-referrer',
        crossorigin: 'None'
    }));
    tileRoot.append($('<div></div>'))
    tileRoot.append($(`<h6></h6>`, {
        text: (item.displayProperties.name ? item.displayProperties.name : undefined),
        class: 'm-0'
    }));
    tileRoot.append($(`<small></small>`, {
        text: (item.itemTypeAndTierDisplayName ? item.itemTypeAndTierDisplayName : undefined),
        class: 'fst-italic'
    }));
    return tileRoot;
}

window.addEventListener('DOMContentLoaded', (event) => {
    console.log(`${items.length} items indexed.`)
    items.forEach(item => {
        itemContainer.append(createItemTile(item))
    });
});