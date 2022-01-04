const log = require('electron-log');
const searchBoxElem = document.getElementById('search-box');

function getSearchVisibility(element) {
    if (!searchBoxElem.value) return true;
    return element.getAttribute('name').toLowerCase().includes(searchBoxElem.value.toLowerCase());
}

function getTypeFilterVisibility(element) {
    return !element.dataset.itemcategories.split(' ').some((itemCategory) => {
        return !document.getElementById(`filter-${itemCategory}`).checked;
    });
}

function getRarityFilterVisibility(element) {
    switch (element.dataset.rarity) {
        case '6':
            return document.getElementById('filter-exotic').checked;

        case '5':
            return document.getElementById('filter-legendary').checked;

        case '4':
            return document.getElementById('filter-rare').checked;

        case '3':
            return document.getElementById('filter-uncommon').checked;

        case '2':
            return document.getElementById('filter-common').checked;

        default:
            return true;
    }
}

function calcVisibilityState(element) {
    return getSearchVisibility(element) && getTypeFilterVisibility(element) && getRarityFilterVisibility(element);
}

function setVisibility(element, visibilityState=calcVisibilityState(element)) {
    element.classList.remove((visibilityState ? 'hidden' : 'm-1'));
    element.classList.add((visibilityState ? 'm-1' : 'hidden'));
}

function setInputElemValue(elementId, value) {
    // log.silly(`Setting #${elementId} to '${value}'`);
    switch (typeof value) {
        case 'string':
            document.getElementById(elementId).value = value;
            break;

        case 'boolean':
            document.getElementById(elementId).value = !!value;
            break;

        default:
            break;
    }
}

function printConsole(text, type='log') {
    let textElem = document.createElement('span');
    textElem.innerText = text;
    textElem.classList.add(`console-${type}`);

    document.getElementById('console-text').appendChild(textElem);
    document.getElementById('console-text').appendChild(document.createElement('br'));

    if (document.getElementById("console-autoscroll-toggle").checked) {
        document.getElementById('console-container').scrollTop = document.getElementById('console-container').scrollHeight;
    }
}

module.exports = { setVisibility, setInputElemValue, printConsole };