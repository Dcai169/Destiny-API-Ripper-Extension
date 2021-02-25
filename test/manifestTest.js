const assert = require('assert');
const { getDestiny1ItemDefinitions, getDestiny2ItemDefinitions } = require('../src/main/scripts/destinyManifest.js');

describe('destinyManifest.js', () => {
    describe('getDestiny1ItemDefinitions', () => {
        it('should not reject', () => {
            return getDestiny1ItemDefinitions();
        }); 
    });

    describe('getDestiny2ItemDefinitions', () => {
        it('should not reject', () => {
            return getDestiny2ItemDefinitions();
        });
    });
});