const log = require('electron-log');

function getSearchVisibility(element) {
    return (document.getElementById('search-box').value.toLowerCase() ? element.getAttribute('name').toLowerCase().includes(document.getElementById('search-box').value.toLowerCase()) : true);
}

function getFilterVisibility(element) {
    if (element.parentElement.id === 'extract-queue') {
        return true;
    } else {
        return [...document.getElementsByClassName('base-filter')].every((inputElem) => {
            return (element.matches(inputElem.dataset.selector) ? inputElem.checked : true);
        });
    }
}

function setVisibility(element) {
    let visibilityState = getSearchVisibility(element) && getFilterVisibility(element);
    element.classList.remove((visibilityState ? 'hidden' : 'm-1'));
    element.classList.add((visibilityState ? 'm-1' : 'hidden'));
}

function setInputElemValue(elementId, value) {
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

function printConsoleOutput(text) {
    document.getElementById('console-text').innerText += `${text}\n `;

    if (document.getElementById("console-autoscroll-toggle").checked) {
        document.getElementById('console-container').scrollTop = document.getElementById('console-container').scrollHeight;
    }
}

module.exports = { setVisibility, setInputElemValue, printConsoleOutput };