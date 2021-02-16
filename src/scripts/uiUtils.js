function setVisibility(jqueryObj, state) {
    // true -> visible
    // false -> hidden
    jqueryObj.removeClass((state ? 'hidden' : 'm-1')).addClass((state ? 'm-1' : 'hidden'))
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