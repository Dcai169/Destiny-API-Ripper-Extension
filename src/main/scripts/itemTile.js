const { setVisibility } = require('./uiUtils.js');

function createItemTile(item, game) {
    let tileRoot;
    if (game === '2') {
        tileRoot = $('<div></div>', {
            class: 'item-tile d-flex align-items-center m-1',
            style: `position: relative; background-color: var(--${hashToRarityName(item.inventory.tierTypeHash)}-color)`,
            id: item.hash,
            name: (item.displayProperties.name ? item.displayProperties.name : 'Classified'),
            'data-index': item.index,
            'data-rarity': item.inventory.tierType,
            'data-itemtype': (item.itemSubType ? item.itemSubType : item.itemType),
            'data-ammotype': (item.hasOwnProperty('equippingBlock') && item.equippingBlock.hasOwnProperty('ammoType') ? item.equippingBlock.ammoType : '0'),
            on: {
                click: itemTileClickHandler
            }
        });

        // Image div (Icon & Season Badge)
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

        // Item text (Name & Type)
        let textDiv = $('<div></div>', {
            class: 'tile-text d-inline-flex px-2'
        });

        let textContainer = $('<div></div>', {});
        textContainer.append($('<p></p>', { class: 'm-0' }).append($(`<b></b>`, {
            text: (item.displayProperties.name ? item.displayProperties.name : `#${item.hash}`),
            style: `color: ${(item.inventory.tierType <= 2 ? 'black' : 'white')}`
        })));
        textContainer.append($('<p></p>', { class: 'm-0' }).append($('<i></i>', {
            text: (item.itemTypeDisplayName ? item.itemTypeDisplayName : undefined),
            class: 'fs-5 item-type',
            style: `color: ${(item.inventory.tierType <= 2 ? '#707070' : '#DDD')}`
        })));

        textDiv.append(textContainer);
        tileRoot.append(imgDiv);
        tileRoot.append(textDiv);
    } else if (game === '1') {
        tileRoot = $('<div></div>', {
            class: 'item-tile d-flex align-items-center m-1',
            style: `position: relative; background-color: var(--${tierNumberToRarityName(item.tierType)}-color)`,
            id: item.hash,
            name: (item.itemName ? item.itemName : 'Classified'),
            'data-index': item.hash,
            'data-rarity': item.tierType,
            'data-itemtype': (item.itemSubType ? item.itemSubType : item.itemType),
            on: {
                click: itemTileClickHandler
            }
        });

        // Image div (Icon & Season Badge)
        let imgDiv = $('<div></div>', {
            style: 'display: grid; position: relative;'
        });

        imgDiv.append($('<img></img>', {
            src: `https://bungie.net${(item.icon ? item.icon : '/img/misc/missing_icon.png')}`,
            referrerpolicy: 'no-referrer',
            crossorigin: 'None',
            loading: 'lazy',
            style: 'grid-row: 1; grid-column: 1;'
        }));

        // Item text (Name & Type)
        let textDiv = $('<div></div>', {
            class: 'tile-text d-inline-flex px-2'
        });

        let textContainer = $('<div></div>', {});
        textContainer.append($('<p></p>', { class: 'm-0' }).append($(`<b></b>`, {
            text: (item.itemName ? item.itemName : `#${item.hash}`),
            class: 'm-0',
            style: `color: ${(item.tierType <= 2 ? 'black' : 'white')}`
        })));
        textContainer.append($('<p></p>', { class: 'm-0' }).append($('<i></i>', {
            text: (item.itemTypeName ? item.itemTypeName : undefined),
            class: 'fs-5 item-type',
            style: `color: ${(item.tierType <= 2 ? '#707070' : '#DDD')}`
        })));

        textDiv.append(textContainer);
        tileRoot.append(imgDiv);
        tileRoot.append(textDiv);
    }

    return tileRoot;
}

function itemTileClickHandler(event) {
    let clicked = $(event.currentTarget);
    switch ($(event.currentTarget).eq(0).parents().attr('id')) {
        case 'item-container':
            console.log(`${clicked.eq(0).attr('id')} added to queue.`);
            queue.append(clicked.detach());
            break;

        case 'extract-queue':
            setVisibility(clicked, clicked.eq(0).attr('name').toLowerCase().includes(document.getElementById('search-box').value.toLowerCase()));
            console.log(`${clicked.eq(0).attr('id')} returned to container.`);
            addItemToContainer(clicked.detach());
    
        default:
            break;
    }
}

function addItemToContainer(item) {
    let containerContents = [...itemContainer.eq(0).children()].map(item => { return item.dataset.index });
    if (item.data('index') < Math.min(...containerContents)) {
        $(`[data-index='${closest(item.data('index'), containerContents)}']`).before(item);
    } else {
        $(`[data-index='${closest(item.data('index'), containerContents)}']`).after(item);
    }
}

function hashToRarityName(hash) {
    switch (hash) {
        case 2759499571:
            return 'exotic';

        case 4008398120:
            return 'legendary';

        case 2127292149:
            return 'rare';

        case 2395677314:
            return 'uncommon';

        case 3340296461:
            return 'common';

        default:
            break;
    }
}

function tierNumberToRarityName(tierType) {
    switch (tierType) {
        case 6:
            return 'exotic';

        case 5:
            return 'legendary';

        case 4:
            return 'rare';

        case 3:
            return 'uncommon';

        case 2:
            return 'common';

        default:
            break;
    }
}

// function that finds the closest value in a list of numbers
function closest(searchTarget, targetList) {
    return targetList.reduce((prev, curr) => {
        return (Math.abs(curr - searchTarget) < Math.abs(prev - searchTarget) ? curr : prev);
    });
}

module.exports = { createItemTile, addItemToContainer };