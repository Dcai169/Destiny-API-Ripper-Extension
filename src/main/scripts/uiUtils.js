const log = require('electron-log');

function elementNameIncludes(jqueryObj, inString) {
    return jqueryObj.eq(0).attr('name').toLowerCase().includes(inString.toLowerCase());
}

function calcFilterVisibility(jqueryObj){
    return [...document.getElementsByClassName('base-filter')].every((inputElem) => {
        return jqueryObj.is(inputElem.dataset.selector);
    });
}

function setVisibility(jqueryObj, state) {
    // log.debug(calcFilterVisibility(jqueryObj));

    // let state = (
    //     document.getElementById('search-box').value ? 
    //     elementNameIncludes(jqueryObj, document.getElementById('search-box').value) && calcFilterVisibility(jqueryObj) : 
    //     calcFilterVisibility(jqueryObj)
    // );

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