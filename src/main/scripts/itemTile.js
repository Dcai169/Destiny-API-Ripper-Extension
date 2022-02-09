const { setVisibility } = require('./uiUtils.js');
const log = require('electron-log');

function createItemTile(item, game) {
    let tileRoot = document.createElement('div');
    tileRoot.id = item.hash;

    tileRoot.classList.add('item-tile');
    tileRoot.classList.add('d-flex');
    tileRoot.classList.add('align-items-center');
    tileRoot.classList.add('m-1');

    tileRoot.dataset.game = game;
    tileRoot.onclick = itemTileClickHandler;

    let iconImg = document.createElement('img');
    iconImg.setAttribute('referrerpolicy', 'no-referrer');
    iconImg.setAttribute('crossorigin', 'None');
    iconImg.loading = 'lazy';

    iconImg.style.gridRow = '1';
    iconImg.style.gridColumn = '1';

    // Image div (Icon & Season Badge)
    let iconDiv = document.createElement('div');
    iconDiv.style.display = 'grid';
    iconDiv.style.position = 'relative';

    // Item text (Name & Type)
    let textDiv = document.createElement('div');
    textDiv.classList.add('tile-text');
    textDiv.classList.add('d-inline-flex');
    textDiv.classList.add('px-2');

    let textContainer = document.createElement('div');
    let titleText = document.createElement('p');
    titleText.classList.add('item-name');
    titleText.classList.add('m-0');

    let typeText = document.createElement('p');
    typeText.classList.add('m-0');

    if (game === '2') {
        tileRoot.style.backgroundColor = `var(--${tierNumberToRarityName(item.inventory.tierType)}-color)`;

        tileRoot.dataset.index = item.index;
        tileRoot.dataset.rarity = item.inventory.tierType;
        tileRoot.dataset.itemcategories = item.itemCategoryHashes.map(distinguishGrenadeLauncherHash).map(itemCategoryHashToName).join(' ').trim();
        tileRoot.setAttribute('name', item.displayProperties.name);

        if (!tileRoot.dataset.itemcategories) {
            tileRoot.dataset.itemcategories = 'armorOrnament';
        }

        switch (item?.classType) {
            case 0:
                tileRoot.dataset.class = 'titan';
                break;

            case 1:
                tileRoot.dataset.class = 'hunter';
                break;

            case 2:
                tileRoot.dataset.class = 'warlock';
                break;

            default:
                if (item?.plug?.plugCategoryIdentifier.split('_')[2]) { tileRoot.dataset.class = item?.plug?.plugCategoryIdentifier.split('_')[2] }
                break;
        }

        iconImg.src = `https://bungie.net${item.displayProperties.icon}`;

        if (item.iconWatermark) {
            let watermarkImg = document.createElement('img');
            watermarkImg.src = `https://bungie.net${item.iconWatermark}`;
            watermarkImg.setAttribute('referrerpolicy', 'no-referrer');
            watermarkImg.setAttribute('crossorigin', 'None');
            watermarkImg.loading = 'lazy';

            watermarkImg.style.gridRow = '1';
            watermarkImg.style.gridColumn = '1';
            watermarkImg.style.zIndex = '1';

            iconDiv.appendChild(watermarkImg);
        }

        titleText.innerHTML = `<b class='m-0'>${item.displayProperties.name}</b>`;
        titleText.style.color = (item.inventory.tierType <= 2 ? 'black' : 'white');

        typeText.innerHTML = `<i class='fs-5 item-type'>${item.itemTypeDisplayName}</i>`;
        typeText.style.color = (item.inventory.tierType <= 2 ? '#707070' : '#DDD');
    } else if (game === '1') {
        tileRoot.style.backgroundColor = `var(--${tierNumberToRarityName(item?.tierType)}-color)`;
        tileRoot.dataset.itemcategories = item.itemCategoryHashes.map(itemCategoryHashToName).join(' ').trim();

        tileRoot.dataset.index = item.index;
        tileRoot.dataset.rarity = item.tierType;

        tileRoot.setAttribute('name', item?.itemName ?? 'Classified');

        iconImg.src = `https://bungie.net${(item.icon ? item.icon : '/img/misc/missing_icon.png')}`;

        titleText.innerHTML = `<b class='m-0'>${(item?.itemName ?? `#${item.hash}`)}</b>`;
        titleText.style.color = (item.tierType <= 2 ? 'black' : 'white');

        typeText.innerHTML = `<i class='fs-5 item-type'>${item.itemTypeName}</i>`;
        typeText.style.color = (item.tierType <= 2 ? '#707070' : '#DDD');
    }

    iconDiv.appendChild(iconImg);

    textContainer.appendChild(titleText);
    textContainer.appendChild(typeText);
    textDiv.appendChild(textContainer);

    tileRoot.appendChild(iconDiv);
    tileRoot.appendChild(textDiv);

    return tileRoot;
}

function itemTileClickHandler(event) {
    let clicked = event.currentTarget;
    switch (clicked.parentElement.id) {
        case 'item-container':
            // log.debug(`${clicked.id} added to queue`);
            queue.append(clicked);
            break;

        case 'extract-queue':
            setVisibility(clicked);
            // log.debug(`${clicked.id} returned to container`);
            addItemToContainer(clicked);
            break;

        default:
            break;
    }
}

function addItemToContainer(item) {
    let containerContents = Array.from(itemContainer.children).map(item => { return item.dataset.index });
    let itemIndex = item.dataset.index;

    if (itemIndex < Math.min(...containerContents)) {
        document.querySelector(`[data-index='${closest(itemIndex, containerContents)}']`).before(item);
    } else {
        document.querySelector(`[data-index='${closest(itemIndex, containerContents)}']`).after(item);
    }

    setVisibility(item);
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

function distinguishGrenadeLauncherHash(itemCategoryHash, _, categoryHashArr) {
    if (itemCategoryHash === 153950757 && categoryHashArr.includes(4)) {
        return 153950761;
    } else {
        return itemCategoryHash;
    }
}

function itemCategoryHashToName(hash) {
    switch (hash) {
        case 45:
            return 'helmet';

        case 46:
            return 'gauntlets';

        case 47:
            return 'chest';

        case 48:
            return 'legs';

        case 49:
            return 'class';

        case 1742617626:
            return 'armorOrnament';

        // case 22:
        //     return 'titanArmor';

        // case 23:
        //     return 'hunterArmor';

        // case 21:
        //     return 'warlockArmor';

        case 5:
            return 'autoRifle';

        case 8:
            return 'scoutRifle';

        case 7:
            return 'pulseRifle';

        case 6:
            return 'handCannon';

        case 3954685534:
            return 'submachineGun';

        case 14:
            return 'sidearm';

        case 3317538576:
            return 'bow';

        case 11:
            return 'shotgun';

        case 9:
            return 'fusionRifle';

        case 10:
            return 'sniperRifle';

        case 2489664120:
            return 'traceRifle';

        case 54:
            return 'sword';

        case 13:
            return 'rocketLauncher';

        case 1504945536:
            return 'linearFusionRifle';

        case 12:
            return 'machineGun';

        case 3124752623:
            return 'weaponOrnament';

        case 42:
            return 'ships';

        case 43:
            return 'sparrows';

        case 39:
            return 'ghostShells';

        case 41:
            return 'shaders';

        case 153950757:
            return 'breachGrenadeLauncher';

        case 153950761:
            return 'heavyGrenadeLauncher';

        case 55:
            return 'masks';

        default:
            return '';
    }
}

// function that finds the closest value in a list of numbers
function closest(searchTarget, targetList) {
    return targetList.reduce((prev, curr) => {
        return (Math.abs(curr - searchTarget) < Math.abs(prev - searchTarget) ? curr : prev);
    });
}

module.exports = { createItemTile, addItemToContainer };