function createItemTile(item, game) {
    let tileRoot;
    if (game === '2') {
        tileRoot = $('<div></div>', {
            class: 'item-tile d-flex align-items-center p-1',
            style: 'position: relative;',
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
        textContainer.append($(`<h6></h6>`, {
            text: (item.displayProperties.name ? item.displayProperties.name : `#${item.hash}`),
            class: 'm-0',
            style: `color: var(--${hashToRarityName(item.inventory.tierTypeHash)}-color)`
        }));
        textContainer.append($('<i></i>', {
            text: (item.itemTypeDisplayName ? item.itemTypeDisplayName : undefined),
            class: 'fs-5 item-type',
            // style: 'font-size: 110%'
        }));
    
        textDiv.append(textContainer);
        tileRoot.append(imgDiv);
        tileRoot.append(textDiv);
    } else if (game === '1') {
        tileRoot = $('<div></div>', {
            class: 'item-tile d-flex align-items-center p-1',
            style: 'position: relative;',
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
        textContainer.append($(`<h6></h6>`, {
            text: (item.itemName ? item.itemName : `#${item.hash}`),
            class: 'm-0',
            style: `color: var(--${tierNumberToRarityName(item.tierType)}-color)`
        }));
        textContainer.append($('<i></i>', {
            text: (item.itemTypeName ? item.itemTypeName : undefined),
            class: 'fs-5 item-type',
            // style: 'font-size: 110%'
        }));
    
        textDiv.append(textContainer);
        tileRoot.append(imgDiv);
        tileRoot.append(textDiv);
    }

    return tileRoot;
}

function itemTileClickHandler(event) {
    let tileLocation = $(event.currentTarget).eq(0).parents().attr('id');
    if (tileLocation === 'item-container') {
        console.log(`${$(event.currentTarget).eq(0).attr('id')} added to queue.`);
        queue.append($(event.currentTarget).detach());
    } else if (tileLocation === 'extract-queue') {
        console.log(`${$(event.currentTarget).eq(0).attr('id')} returned to container.`);
        addItemToContainer($(event.currentTarget).detach());
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