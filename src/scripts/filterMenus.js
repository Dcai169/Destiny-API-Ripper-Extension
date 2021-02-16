const { setVisibility } = require('./uiUtils.js');

function getFilterState() {
    let binState = '';
    [...document.getElementsByClassName('base-filter')].forEach((inputElem) => {
        binState += (inputElem.checked ? '1' : '0');
    });

    return binState.padStart(32, '0');
}

function setFilterState(binState) {
    [...document.getElementsByClassName('base-filter')].forEach((inputElem) => {
        inputElem.checked = (binState.charAt(31 - parseInt(inputElem.dataset.index)) === '1' ? true : false);
        updateItems(inputElem);
    });
    updateCompositeCheckboxes(getFilterState());
}

function updateItems(inputElem) {
    setVisibility($(`#item-container ${inputElem.dataset.selector}`), inputElem.checked);
}

function updateCompositeCheckboxes(binState) {
    switch (parseInt(binState.slice(0, 5), 2)) { // Rarities
        case 31:
            document.getElementById('filter-rarity').indeterminate = false;
            document.getElementById('filter-rarity').checked = true;
            break;

        case 0:
            document.getElementById('filter-rarity').indeterminate = false;
            document.getElementById('filter-rarity').checked = false;
            break;

        default:
            document.getElementById('filter-rarity').checked = true;
            document.getElementById('filter-rarity').indeterminate = true;
            break;
    }

    switch (parseInt(binState.slice(5), 2)) { // Item Types
        case 134217727:
            document.getElementById('filter-type').indeterminate = false;
            document.getElementById('filter-type').checked = true;
            break;

        case 0:
            document.getElementById('filter-type').indeterminate = false;
            document.getElementById('filter-type').checked = false;
            break;

        default:
            document.getElementById('filter-type').checked = true;
            document.getElementById('filter-type').indeterminate = true;
            break;
    }

    switch (parseInt(binState.slice(5, 11), 2)) { // Armor
        case 63:
            document.getElementById('filter-armor').indeterminate = false;
            document.getElementById('filter-armor').checked = true;
            break;

        case 0:
            document.getElementById('filter-armor').indeterminate = false;
            document.getElementById('filter-armor').checked = false;
            break;

        default:
            document.getElementById('filter-armor').checked = true;
            document.getElementById('filter-armor').indeterminate = true;
            break;
    }

    switch (parseInt(binState.slice(11, 27), 2)) { // Weapons
        case 65535:
            document.getElementById('filter-weapons').indeterminate = false;
            document.getElementById('filter-weapons').checked = true;
            break;

        case 0:
            document.getElementById('filter-weapons').indeterminate = false;
            document.getElementById('filter-weapons').checked = false;
            break;

        default:
            document.getElementById('filter-weapons').checked = true;
            document.getElementById('filter-weapons').indeterminate = true;
            break;
    }

    switch (parseInt(binState.slice(11, 18), 2)) { // Primary Weapons
        case 127:
            document.getElementById('filter-primary').indeterminate = false;
            document.getElementById('filter-primary').checked = true;
            break;

        case 0:
            document.getElementById('filter-primary').indeterminate = false;
            document.getElementById('filter-primary').checked = false;
            break;

        default:
            document.getElementById('filter-primary').checked = true;
            document.getElementById('filter-primary').indeterminate = true;
            break;
    }

    switch (parseInt(binState.slice(18, 22), 2)) { // Secondary Weapons
        case 15:
            document.getElementById('filter-secondary').indeterminate = false;
            document.getElementById('filter-secondary').checked = true;
            break;

        case 0:
            document.getElementById('filter-secondary').indeterminate = false;
            document.getElementById('filter-secondary').checked = false;
            break;

        default:
            document.getElementById('filter-secondary').checked = true;
            document.getElementById('filter-secondary').indeterminate = true;
            break;
    }

    switch (parseInt(binState.slice(22, 27), 2)) { // Heavy Weapons
        case 31:
            document.getElementById('filter-heavy').indeterminate = false;
            document.getElementById('filter-heavy').checked = true;
            break;

        case 0:
            document.getElementById('filter-heavy').indeterminate = false;
            document.getElementById('filter-heavy').checked = false;
            break;

        default:
            document.getElementById('filter-heavy').checked = true;
            document.getElementById('filter-heavy').indeterminate = true;
            break;
    }

    switch (parseInt(binState.slice(28, 31), 2)) { // Equipment
        case 7:
            document.getElementById('filter-equipment').indeterminate = false;
            document.getElementById('filter-equipment').checked = true;
            break;

        case 0:
            document.getElementById('filter-equipment').indeterminate = false;
            document.getElementById('filter-equipment').checked = false;
            break;

        default:
            document.getElementById('filter-equipment').checked = true;
            document.getElementById('filter-equipment').indeterminate = true;
            break;
    }
}

function baseFilterClickHandler(event) {
    updateItems(event.target);
    updateCompositeCheckboxes(getFilterState());
}

function compositeFilterClickHandler(event) {
    setFilterState([...getFilterState().padStart(32, '0')].reverse().fill((event.target.checked ? '1' : '0'), event.target.dataset.indexstart, event.target.dataset.indexend).reverse().join(''));
}

module.exports = { baseFilterClickHandler, compositeFilterClickHandler, updateItems };
