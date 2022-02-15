const axios = require('axios');

// Read API Key
require('dotenv').config({ path: 'api.env' });

const BASE_URL = 'https://bungie.net';
const DEFAULT_SHADER_HASH = 4248210736; // Default Shader
const DESTINY2_HASH_BLACKLIST = [702981643, 2965439266, 2426387438, 3807544519, 2325217837, 4248210736];
const DESTINY2_HASH_WHITELIST = [
    2899766705, 648507367, 1364005110, 997252576, 2731019523, 
    765924941, 3933597171, 1844055850, 2359657268, 1436723983, 
    673268892, 2226216068, 2969943001, 20603181, 3971164198
];

function getDestiny1ItemDefinitions(locale = 'en') {
    return new Promise((resolve, reject) => {
        let d1ItemDefinitions = {};
        // Send GET request to manifest server
        axios.get(`https://dare-manifest-server.herokuapp.com/manifest?locale=${locale}`)
            .then((res) => {
                for (const [hash, item] of Object.entries(res.data)) {
                    // Filter items in the manifest
                    if (((item) => {
                        if (item.hash === DEFAULT_SHADER_HASH) { return false }
                        if (!item?.itemName) { return false }
                        if (item.itemCategoryHashes?.includes(1) && item.itemCategoryHashes?.length === 2) { return false } // Reforge Weapon
                        if (item.itemCategoryHashes?.some((itemCategoryHash) => { return [15, 38, 51].includes(itemCategoryHash) })) { return false } // Blueprints and artifacts
                        if (item.itemCategoryHashes?.some((itemCategoryHash) => { return [1, 20, 39, 41, 42, 43, 55].includes(itemCategoryHash) })) { return true } // Armor, weapons, shaders, ships, ghost shells, and sparrows
                    })(item)) {
                        d1ItemDefinitions[hash] = item;
                    }
                }
                // Sort into a Map Object
                let items = Object.values(d1ItemDefinitions);
                d1ItemDefinitions = new Map();
                items.forEach((item) => {
                    d1ItemDefinitions.set(item.hash, item);
                });
                resolve(d1ItemDefinitions);
            }).catch(reject);
    });
}

function getDestiny2ItemDefinitions(locale = 'en') {
    return new Promise((resolve, reject) => {
        let d2ItemDefinitions = {};
        // Send GET request to manifest server
        axios.get(BASE_URL + '/Platform/Destiny2/Manifest/', { headers: { 'X-API-Key': process.env.API_KEY } })
            .then((res) => {
                // Send GET for item definitions
                axios.get(BASE_URL + res.data.Response.jsonWorldComponentContentPaths[locale].DestinyInventoryItemDefinition)
                    .then((res) => {
                        for (let [hash, item] of Object.entries(res.data)) {
                            if (((item) => {
                                if (DESTINY2_HASH_WHITELIST.includes(item.hash)) { return true }
                                if (DESTINY2_HASH_BLACKLIST.includes(item.hash)) { return false }
                                if (!item?.displayProperties.name) { return false }
                                if (item.itemCategoryHashes?.includes(3109687656)) { return false } // Mods
                                if (item.itemCategoryHashes?.includes(20) && !(item.index >= 8110)) { return false } // Armor 1.0
                                if (item?.traitIds?.includes("item_type.ornament.armor")) { return true } // Ornaments
                                if (item.itemCategoryHashes?.some((itemCategoryHash) => { return [1, 20, 39, 41, 42, 43, 55, 1742617626, 3124752623].includes(itemCategoryHash) })) { return true } // Armor, weapons, shaders, ships, ghost shells, and sparrows
                            })(item)) {
                                d2ItemDefinitions[hash] = item;
                            }
                        }
                        // Sort into a Map object
                        let items = Object.values(d2ItemDefinitions).sort((a, b) => { return a.index - b.index });
                        d2ItemDefinitions = new Map();
                        items.forEach((item) => {
                            d2ItemDefinitions.set(item.hash, item);
                        });
                        resolve(d2ItemDefinitions);
                    }).catch(reject);
            }).catch(reject);
    });
}

module.exports = { getDestiny1ItemDefinitions, getDestiny2ItemDefinitions };