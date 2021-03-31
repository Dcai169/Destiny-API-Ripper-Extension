const log = require('electron-log');

function searchVisibility(jqueryObj) {
    return jqueryObj.eq(0).attr('name').toLowerCase().includes(document.getElementById('search-box').value.toLowerCase());
}

function filterVisibility(jqueryObj){
    if (jqueryObj.eq(0).parents().attr('id') === 'extract-queue') {
        return true;
    } else {
        return [...document.getElementsByClassName('base-filter')].every((inputElem) => {
            return (jqueryObj.is(inputElem.dataset.selector) ? inputElem.checked : true);
        });
    }
}

function setVisibility(jqueryObj) {
    let state = searchVisibility(jqueryObj) && filterVisibility(jqueryObj);
    jqueryObj.removeClass((state ? 'hidden' : 'm-1')).addClass((state ? 'm-1' : 'hidden'));
}

function updateUIInput(elementId, value) {
    switch (typeof value) {
        case 'string':
            $(`#${elementId}`).val(value);
            break;

        case 'boolean':
            $(`#${elementId}`).prop('checked', !!value);
            break;

        default:
            break;
    }
}

module.exports = { setVisibility, updateUIInput };