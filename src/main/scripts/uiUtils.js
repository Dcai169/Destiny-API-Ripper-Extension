const log = require('electron-log');

function searchVisibility(element) {
    return (document.getElementById('search-box').value.toLowerCase() ? element.getAttribute('name').toLowerCase().includes(document.getElementById('search-box').value.toLowerCase()) : true);
}

function filterVisibility(element) {
    if (element.parentElement.id === 'extract-queue') {
        return true;
    } else {
        return [...document.getElementsByClassName('base-filter')].every((inputElem) => {
            return (element.matches(inputElem.dataset.selector) ? inputElem.checked : true);
        });
    }
}

function setVisibility(element) {
    let visibilityState = searchVisibility(element) && filterVisibility(element);
    element.classList.remove((visibilityState ? 'hidden' : 'm-1'));
    element.classList.add((visibilityState ? 'm-1' : 'hidden'));
}

function updateUIInput(elementId, value) {
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

function uiConsolePrint(text) {
    document.getElementById('console-text').innerText += `${text}\n `;

    if (document.getElementById("console-autoscroll-toggle").checked) {
        document.getElementById('console-container').scrollTop = document.getElementById('console-container').scrollHeight;
    }
}

module.exports = { setVisibility, updateUIInput, uiConsolePrint };