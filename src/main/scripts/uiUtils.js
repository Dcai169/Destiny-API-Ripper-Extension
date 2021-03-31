const log = require('electron-log');

function elementNameIncludes(element, inString) {
    return element.eq(0).attr('name').toLowerCase().includes(inString.toLowerCase());
}

function calcFilterVisibility(element){
    return [...document.getElementsByClassName('base-filter')].every((inputElem) => {
        return element.is(inputElem.dataset.selector);
    });
}

function setVisibility(jqueryObj) {
    log.debug(calcFilterVisibility(jqueryObj));

    let state = (
        document.getElementById('search-box').value ? 
        jqueryObj.hasClass('m-1') && elementNameIncludes(jqueryObj, document.getElementById('search-box').value.toLowerCase()) && calcFilterVisibility(jqueryObj) : 
        jqueryObj.hasClass('m-1') && calcFilterVisibility(jqueryObj)
    );

    if (jqueryObj.hasClass((state ? 'hidden' : 'm-1'))) {
        jqueryObj.removeClass((state ? 'hidden' : 'm-1')).addClass((state ? 'm-1' : 'hidden'));
    }
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