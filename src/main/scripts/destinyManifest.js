const axios = require('axios');

// Read API Key
require('dotenv').config({ path: 'api.env' });

const BASE_URL = 'https://bungie.net';
const DEFAULT_SHADER_HASH = 4248210736; // Default Shader
const DESTINY2_HASH_BLACKLIST = [702981643, 2965439266, 2426387438, 3807544519, 2325217837, 4248210736];

function getDestiny1ItemDefinitions(locale = 'en') {
    return new Promise((resolve, reject) => {
        let destiny1ItemDefinitions = {};
        // Send GET request to manifest server
        axios.get(`https://dare-manifest-server.herokuapp.com/manifest?locale=${locale}`)
            .then((res) => {
                for (const [hash, item] of Object.entries(res.data)) {
                    // Filter items in the manifest
                    if (((item) => {
                        if (item.hash === DEFAULT_SHADER_HASH) { return false }
                        if (item.itemCategoryHashes?.includes(38) && item.itemCategoryHashes?.includes(20)) { return false } // Armor Artifacts
                        if (item.itemCategoryHashes?.includes(1) && item.itemCategoryHashes?.length === 2) { return false } // Reforge Weapon
                        if (item.itemCategoryHashes?.includes(41) && item.itemCategoryHashes?.includes(52)) { return true } // Shaders
                        if (item.itemCategoryHashes?.includes(42) && item.itemCategoryHashes?.includes(52)) { return true } // Ships
                        if ([2, 3].includes(item.itemType)) { return true } // Armor and Weapons
                    })(item)) {
                        destiny1ItemDefinitions[hash] = item;
                    }
                }
                // Sort into a Map Object
                let items = Object.values(destiny1ItemDefinitions);
                destiny1ItemDefinitions = new Map();
                items.forEach((item) => {
                    destiny1ItemDefinitions.set(item.hash, item);
                });
                resolve(destiny1ItemDefinitions);
            }).catch(reject);
    });
}

function getDestiny2ItemDefinitions(locale = 'en') {
    return new Promise((resolve, reject) => {
        let destiny2ItemDefinitions = {};
        // Send GET request to manifest server
        axios.get(BASE_URL + '/Platform/Destiny2/Manifest/', { headers: { 'X-API-Key': process.env.API_KEY } })
            .then((res) => {
                // Send GET for item definitions
                axios.get(BASE_URL + res.data.Response.jsonWorldComponentContentPaths[locale].DestinyInventoryItemDefinition)
                    .then((res) => {
                        for (let [hash, item] of Object.entries(res.data)) {
                            if (((item) => {
                                if (DESTINY2_HASH_BLACKLIST.includes(item.hash)) { return false }
                                if (!item?.displayProperties.name) { return false }
                                if (item.itemCategoryHashes?.includes(3109687656)) { return false } // Mods
                                if (item.itemCategoryHashes?.some((itemCategoryHash) => { return [1, 20, 39, 41, 42, 43, 55, 1742617626, 3124752623].includes(itemCategoryHash) })) { return true } // Armor, weapons, shaders, ships, ghost shells, and sparrows
                            })(item)) {
                                destiny2ItemDefinitions[hash] = item;
                            }
                        }
                        // Sort into a Map object
                        let items = Object.values(destiny2ItemDefinitions).sort((a, b) => { return a.index - b.index });
                        destiny2ItemDefinitions = new Map();
                        items.forEach((item) => {
                            destiny2ItemDefinitions.set(item.hash, item);
                        });
                        resolve(destiny2ItemDefinitions);
                    }).catch(reject);
            }).catch(reject);
    });
}

module.exports = { getDestiny1ItemDefinitions, getDestiny2ItemDefinitions };