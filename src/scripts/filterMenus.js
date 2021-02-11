function convertBase(num, fromBase, toBase) {
    return parseInt(String(num), fromBase).toString(toBase);
}

function calcFilterState(){
    let binString = '';
    [...document.getElementsByClassName('base-filter')].forEach((inputElem) => {
        binString += (inputElem.checked ? '1' : '0');
    });

    return convertBase(binString, 2, 16).padStart(8, '0');
}

function updateCompositeCheckboxes() {
    let binaryState = convertBase(calcFilterState(), 16, 2);
    switch (parseInt(binaryState.slice(0, 5), 2)) { // Rarities
        case 31:
            
            break;

        case 0:
            
            break;
    
        default:

            break;
    }

    switch (parseInt(binaryState.splice(5), 2)) { // Item Types
        case 134217727:
            
            break;
        
        case 0:

            break;
    
        default:

            break;
    }

    switch (parseInt(binaryState.slice(5, 11), 2)) { // Armor
        case 63:
            
            break;

        case 0:

            break;
    
        default:

            break;
    }

    switch (parseInt(binaryState.slice(11, 27), 2)) {
        case 65535:
            
            break;
    
        case 0:

            break;

        default:

            break;
    }

    switch (parseInt(binaryState.slice(11, 17), 2)) { // Primary Weapons
        case 63:
            
            break;
    
        case 0: 

            break;

        default:

            break;
    }

    switch (parseInt(binaryState.slice(17, 22), 2)) { // Secondary Weapons
        case 31:
            
            break;
    
        case 0:
            
            break;
        
        default:

            break;
    }
    
    switch (parseInt(binaryState.slice(22, 27), 2)) { // Heavy Weapons
        case 31:
            
            break;
    
        case 0:

            break;

        default:

            break;
    }

    switch (parseInt(binaryState.slice(27, 30), 2)) { // Equipment
        case 7:
            
            break;
        
        case 0:

            break;

        default:
            
            break;
    }
}

function baseFilterClickHandler(event) {
    console.log(calcFilterState());
}

module.exports = baseFilterClickHandler;
