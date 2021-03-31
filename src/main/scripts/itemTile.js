const { setVisibility } = require('./uiUtils.js');
const evaluateReplace = require('./evaluateReplace.js')
const log = require('electron-log');

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
            'data-vdeterminers': JSON.stringify(calcFilters(item)),
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

function calcFilters(itemObj) {
    let filters = [];
    let ammoType = evaluateReplace(itemObj?.equippingBlock?.ammoType, {replacement: '0'});
    let itemClass

    switch (itemObj.tierType) {
        case 6:
            filters.push('filter-exotic');
            break;

        case 5:
            filters.push('filter-legendary');
            break;

        case 4:
            filters.push('filter-rare');
            break;

        case 3:
            filters.push('filter-uncommon');
            break;

        case 2:
            filters.push('filter-common');
            break;

        default:
            break;
    }

    switch (itemObj.itemType) {
        case 3:
            switch (itemObj.itemSubType) {
                case 6:
                    filters.push('filter-autoRifle');
                    break;
        
                case 14:
                    filters.push('filter-scoutRifle');
                    break;
        
                case 13:
                    filters.push('filter-pulseRifle');
                    break;
        
                case 9:
                    filters.push('filter-handCannon');
                    break;
        
                case 24:
                    filters.push('filter-submachineGun');
                    break;
        
                case 17:
                    filters.push('filter-sidearm');
                    break;
        
                case 31:
                    filters.push('filter-bow');
                    break;
        
                case 7:
                    filters.push('filter-shotgun');
                    break;
        
                case 11:
                    filters.push('filter-fusionRifle');
                    break;
        
                case 12:
                    filters.push('filter-sniperRifle');
                    break;
        
                case 18:
                    filters.push('filter-sword');
                    break;
        
                case 23:
                    if (ammoType === 3) {
                        filters.push('filter-breachGrenadeLauncher');
                    } else if (ammoType === 2){
                        filters.push('filter-heavyGrenadeLauncher');
                    }
                    break;
                
                case 10:
                    filters.push('filter-rocketLauncher');
                    break;
        
                case 22:
                    filters.push('filter-linearFusionRifle');
                    break;
        
                case 8:
                    filters.push('filter-machineGun');
                    break;
            
                default:
                    break;
            }
            break;
        
        case 19:
            if (itemObj.itemSubType === 20) {
                filters.push('filters-shaders');  
            } else {
                if (itemObj.classType === 3) {
                    filters.push('filter-weaponOrnament');
                }
            }
            
            break;


        case 21:
            filters.push('filter-ships');
            break;            

        case 22:
            filters.push('filter-sparrows');
            break;

        default:
            break;
    }

    

    return filters;
}

function itemTileClickHandler(event) {
    let clicked = $(event.currentTarget);
    switch ($(event.currentTarget).eq(0).parents().attr('id')) {
        case 'item-container':
            log.silly(`${clicked.eq(0).attr('id')} added to queue`);
            queue.append(clicked.detach());
            break;

        case 'extract-queue':
            setVisibility(clicked);
            log.silly(`${clicked.eq(0).attr('id')} returned to container`);
            addItemToContainer(clicked.detach());
            break;
    
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