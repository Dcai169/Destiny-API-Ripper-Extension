const { setVisibility } = require('./uiUtils.js');
const log = require('electron-log');

function updateItemVisibilityFromInputElem(inputElem) {
    [...document.querySelectorAll(`#item-container .item-tile${(inputElem.dataset.selector ?? '')}`)].forEach((item) => {
        setVisibility(item, inputElem.checked);
    });
}

function rarityFilterClickHandler(event) {
    updateItemVisibilityFromInputElem(event.target)
}

function typeFilterClickHandler(event) {
    updateItemVisibilityFromInputElem(event.target);
    updateDependentCheckboxes(document.getElementById(event.target.dataset.influence));
}

function dependentFilterClickHandler(event) {
    [...document.querySelectorAll(`[data-influence=${event.target.id}]`)].forEach((inputElem) => {
        inputElem.checked = event.target.checked;
    });
}

function updateDependentCheckboxes(dependentInputElem) {
    // This predicate gets all the checkboxes that the dependentInputElem depends on, and checks if they are all the same
    if ([...document.querySelectorAll(`[data-influence=${dependentInputElem.id}]`)].map((baseInputElem) => { return baseInputElem.checked }).every((state, _, arr) => { return state === arr[0]})) {
        dependentInputElem.checked = document.querySelector(`[data-influence=${dependentInputElem.id}]`).checked;
        dependentInputElem.indeterminate = false;
    } else {
        dependentInputElem.checked = false;
        dependentInputElem.indeterminate = true;
    }
}

module.exports = { typeFilterClickHandler, dependentFilterClickHandler, rarityFilterClickHandler, updateItemVisibilityFromInputElem };
