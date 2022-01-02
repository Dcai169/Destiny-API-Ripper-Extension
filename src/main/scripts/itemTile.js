const { setVisibility } = require('./uiUtils.js');
const log = require('electron-log');

function createItemTile(item, game) {
    let tileRoot;
    if (game === '2') {
        tileRoot = document.createElement('div');
        tileRoot.id = item.hash;

        tileRoot.style.backgroundColor = `var(--${tierNumberToRarityName(item.inventory.tierType)}-color)`;

        tileRoot.classList.add('item-tile');
        tileRoot.classList.add('d-flex');
        tileRoot.classList.add('align-items-center');
        tileRoot.classList.add('m-1');

        tileRoot.dataset.index = item.index;
        tileRoot.dataset.rarity = item.inventory.tierType;
        tileRoot.dataset.itemcategories = item.itemCategoryHashes.join(' ');

        tileRoot.onclick = itemTileClickHandler;
        tileRoot.setAttribute('name', item.displayProperties.name);

        // Image div (Icon & Season Badge)
        let iconDiv = document.createElement('div');
        iconDiv.style.display = 'grid';
        iconDiv.style.position = 'relative';

        let iconImg = document.createElement('img');
        iconImg.src = `https://bungie.net${item.displayProperties.icon}`;
        iconImg.setAttribute('referrerpolicy', 'no-referrer');
        iconImg.setAttribute('crossorigin', 'None');
        iconImg.loading = 'lazy';

        iconImg.style.gridRow = '1';
        iconImg.style.gridColumn = '1';

        iconDiv.appendChild(iconImg);

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

        // Item text (Name & Type)
        let textDiv = document.createElement('div');
        textDiv.classList.add('tile-text');
        textDiv.classList.add('d-inline-flex');
        textDiv.classList.add('px-2');

        let textContainer = document.createElement('div');
        let titleText = document.createElement('p');
        titleText.classList.add('m-0');
        titleText.innerHTML = `<b class='m-0'>${item.displayProperties.name}</b>`;
        titleText.style.color = (item.inventory.tierType <= 2 ? 'black' : 'white');

        let typeText = document.createElement('p');
        typeText.classList.add('m-0');
        typeText.innerHTML = `<i class='fs-5 item-type'>${item.itemTypeDisplayName}</i>`;
        typeText.style.color = (item.inventory.tierType <= 2 ? '#707070' : '#DDD');

        textContainer.appendChild(titleText);
        textContainer.appendChild(typeText);
        textDiv.appendChild(textContainer);

        tileRoot.appendChild(iconDiv);
        tileRoot.appendChild(textDiv);
    } else if (game === '1') {
        tileRoot = document.createElement('div');
        tileRoot.id = item.hash;

        tileRoot.style.backgroundColor = `var(--${tierNumberToRarityName(item?.inventory.tierType)}-color)`;

        tileRoot.classList.add('item-tile');
        tileRoot.classList.add('d-flex');
        tileRoot.classList.add('align-items-center');
        tileRoot.classList.add('m-1');

        tileRoot.dataset.index = item.index;
        tileRoot.dataset.rarity = item.inventory.tierType;

        tileRoot.onclick = itemTileClickHandler;
        tileRoot.setAttribute('name', item?.itemName ?? 'Classified');

        // Image div (Icon & Season Badge)
        let iconDiv = document.createElement('div');
        iconDiv.style.display = 'grid';
        iconDiv.style.position = 'relative';

        let iconImg = document.createElement('img');
        iconImg.src = `https://bungie.net${(item.icon ? item.icon : '/img/misc/missing_icon.png')}`;
        iconImg.setAttribute('referrerpolicy', 'no-referrer');
        iconImg.setAttribute('crossorigin', 'None');
        iconImg.loading = 'lazy';

        iconImg.style.gridRow = '1';
        iconImg.style.gridColumn = '1';

        iconDiv.appendChild(iconImg);

        // Item text (Name & Type)
        let textDiv = document.createElement('div');
        textDiv.classList.add('tile-text');
        textDiv.classList.add('d-inline-flex');
        textDiv.classList.add('px-2');

        let textContainer = document.createElement('div');
        let titleText = document.createElement('p');
        titleText.classList.add('m-0');
        titleText.innerHTML = `<b class='m-0'>${(item?.itemName ?? `#${item.hash}`)}</b>`;
        titleText.style.color = (item.inventory.tierType <= 2 ? 'black' : 'white');

        let typeText = document.createElement('p');
        typeText.classList.add('m-0');
        typeText.innerHTML = `<i class='fs-5 item-type'>${item.itemTypeName}</i>`;
        typeText.style.color = (item.tierType <= 2 ? '#707070' : '#DDD');

        textContainer.appendChild(titleText);
        textContainer.appendChild(typeText);
        textDiv.appendChild(textContainer);

        tileRoot.appendChild(iconDiv);
        tileRoot.appendChild(textDiv);
    }

    return tileRoot;
}

function itemTileClickHandler(event) {
    let clicked = event.currentTarget;
    switch (clicked.parentElement.id) {
        case 'item-container':
            log.silly(`${clicked.id} added to queue`);
            queue.append(clicked);
            break;

        case 'extract-queue':
            setVisibility(clicked);
            log.silly(`${clicked.id} returned to container`);
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

// function that finds the closest value in a list of numbers
function closest(searchTarget, targetList) {
    return targetList.reduce((prev, curr) => {
        return (Math.abs(curr - searchTarget) < Math.abs(prev - searchTarget) ? curr : prev);
    });
}

module.exports = { createItemTile, addItemToContainer };