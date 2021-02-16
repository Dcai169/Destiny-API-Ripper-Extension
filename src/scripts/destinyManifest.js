const axios = require('axios');

const baseUrl = 'https://bungie.net';
const blacklistedDestiny1Hashes = [4248210736]; // Default Shader
const blacklistedDestiny2Hashes = [4248210736, 2426387438, 2931483505, 1959648454, 702981643, 2325217837] + // Default Shader
    [2965439266, 4236468733, 2699000684, 1702504372, 3344732822, 2912265353, 4143534670, 873770815, 3367964921, 4089988225, 811724212, 3054638345, 463166592, 3507818312, 3835954362, 1339405989] + // Solstice Glows
    [3807544519, 834178986, 839740147, 577345565, 574694085, 2039333456, 60802325, 3031612900, 2449203932, 242730894, 3735037521, 558870048, 2419910641, 2552954151, 2251060291, 3692806198]; // More Glows

function getDestiny1ItemDefinitions(locale='en') {
    return new Promise((resolve, reject) => {
        let destiny1ItemDefinitions = {};
        // Send GET request to manifest server
        axios.get(`https://dare-manifest-server.herokuapp.com/manifest?locale=${locale}`)
            .then((res) => {
                for (const [hash, item] of Object.entries(res.data)) {
                    // Filter items in the manifest
                    if (((item) => {
                        if (blacklistedDestiny1Hashes.includes(item.hash)) { return false }
                        if (arrayEquals(item.itemCategoryHashes, [23, 38, 20])) { return false } // Hunter Artifacts
                        if (arrayEquals(item.itemCategoryHashes, [22, 38, 20])) { return false } // Titan Artifacts
                        if (arrayEquals(item.itemCategoryHashes, [21, 38, 20])) { return false } // Warlock Artifacts
                        if (item.itemCategoryHashes && item.itemCategoryHashes.includes(1) && item.itemCategoryHashes.length === 2) { return false } // Reforge Weapon
                        if (arrayEquals(item.itemCategoryHashes, [41, 52])) { return true } // Shaders
                        if (arrayEquals(item.itemCategoryHashes, [42, 52])) { return true } // Ships
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

function getDestiny2ItemDefinitions(locale='en') {
    return new Promise((resolve, reject) => {
        let destiny2ItemDefinitions = {};
        // Send GET request to manifest server
        axios.get(baseUrl + '/Platform/Destiny2/Manifest/', { headers: { 'X-API-Key': process.env.API_KEY } })
            .then((res) => {
                // Send GET for item definitions
                axios.get(baseUrl + res.data.Response.jsonWorldComponentContentPaths[locale].DestinyInventoryItemDefinition)
                    .then((res) => {
                        for (let [hash, item] of Object.entries(res.data)) {
                            if (((item) => {
                                if (blacklistedDestiny2Hashes.includes(item.hash)) { return false }
                                if ([2, 21, 22, 24].includes(item.itemType)) { return true } // Armor, Ships, Sparrows, Ghost Shells
                                if (item.defaultDamageType > 0) { return true } // Weapons
                                if (item.itemType === 19 && [20, 21].includes(item.itemSubType)) { return true } // Ornaments
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

function arrayEquals(a, b) {
    return Array.isArray(a) && Array.isArray(b) && // both are Arrays
        a.length === b.length && // Same length
        a.every((val, index) => val === b[index]); // each value is the same
}

module.exports = { getDestiny1ItemDefinitions, getDestiny2ItemDefinitions };