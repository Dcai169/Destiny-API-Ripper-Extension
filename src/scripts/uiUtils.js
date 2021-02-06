function setVisibility(jqueryObj, state) {
    // true -> visible
    // false -> hidden
    jqueryObj.removeClass((state ? 'hidden' : 'p-1')).addClass((state ? 'p-1' : 'hidden'))
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

module.exports = {setVisibility, updateUIInput};