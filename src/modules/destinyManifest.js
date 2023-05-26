const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const process = require('node:process');
const {ipcRenderer} = require('electron');
const axios = require('axios');
const {appConfig} = require('./appConfig.js');
require('dotenv').config();

const DEFAULT_SHADER_HASH = 4248210736; // Default Shader
const DESTINY2_HASH_BLACKLIST = new Set([702981643, 2965439266, 2426387438, 3807544519, 2325217837, 4248210736]);
const DESTINY2_HASH_WHITELIST = new Set([
  2899766705, 648507367, 1364005110, 997252576, 2731019523,
  765924941, 3933597171, 1844055850, 2359657268, 1436723983,
  673268892, 2226216068, 2969943001, 20603181, 3971164198,
]);

async function getDestiny1ItemsMetadata(locale = 'en') {
  const gzPath = await ipcRenderer.invoke('isPackaged') ? path.join(process.resourcesPath, 'Destiny 1 Item Definition', locale + '.json.gz') : path.join(__dirname, '../extraResources/Destiny 1 Item Definition', locale + '.json.gz');
  const jsonFile = zlib.gunzipSync(fs.readFileSync(gzPath));
  const d1ItemsMetadata = new Map();
  for (const [hash, item] of Object.entries(JSON.parse(jsonFile.toString()))) {
    // Filter items in the manifest
    if ((item => {
      if (item.hash === DEFAULT_SHADER_HASH) {
        return false;
      }

      if (!item?.itemName) {
        return false;
      }

      // Reforge Weapon
      if (item.itemCategoryHashes?.includes(1) && item.itemCategoryHashes?.length === 2) {
        return false;
      }

      // Blueprints and artifacts
      if (item.itemCategoryHashes?.some(itemCategoryHash => [15, 38, 51].includes(itemCategoryHash))) {
        return false;
      }

      // Armor, weapons, shaders, ships, ghost shells, and sparrows
      if (item.itemCategoryHashes?.some(itemCategoryHash => [1, 20, 39, 41, 42, 43, 55].includes(itemCategoryHash))) {
        return true;
      }
    })(item)) {
      d1ItemsMetadata.set(hash, item);
    }
  }

  return d1ItemsMetadata;
}

async function reDownloadGzippedJson(URL, currDir, jsonFilename, deleteAllLocales) {
  const downloadIndicator = path.join(currDir, 'download_in_progress');
  if (deleteAllLocales) {
    fs.rmSync(path.resolve(currDir, '..'), {force: true, recursive: true});
  } else {
    fs.rmSync(currDir, {force: true, recursive: true});
  }

  fs.mkdirSync(currDir, {recursive: true});
  fs.writeFileSync(downloadIndicator, '');
  const response = await axios.get(URL, {responseType: 'arraybuffer'});
  fs.writeFileSync(path.join(currDir, jsonFilename + '.gz'), zlib.gzipSync(response.data));
  fs.rmSync(downloadIndicator);
}

async function loadGzippedD2Json(path) {
  const jsonFile = zlib.gunzipSync(fs.readFileSync(path));
  let d2ItemsMetadata = {};
  for (const [hash, item] of Object.entries(JSON.parse(jsonFile.toString()))) {
    if ((item => {
      if (DESTINY2_HASH_WHITELIST.has(item.hash)) {
        return true;
      }

      if (DESTINY2_HASH_BLACKLIST.has(item.hash)) {
        return false;
      }

      if (!item?.displayProperties.name) {
        return false;
      }

      // Mods
      if (item.itemCategoryHashes?.includes(3109687656)) {
        return false;
      }

      // Armor 1.0
      if (item.itemCategoryHashes?.includes(20) && !(item.index >= 8110)) {
        return false;
      }

      // Ornaments
      if (item?.traitIds?.includes('item_type.ornament.armor') || item?.traitIds?.includes('item.ornament.armor')) {
        return true;
      }

      // Armor, weapons, shaders, ships, ghost shells, and sparrows
      if (item.itemCategoryHashes?.some(itemCategoryHash => [1, 20, 39, 41, 42, 43, 55, 1742617626, 3124752623].includes(itemCategoryHash))) {
        return true;
      }
    })(item)) {
      d2ItemsMetadata[hash] = item;
    }
  }

  // Sort into a Map object
  const items = Object.values(d2ItemsMetadata).sort((a, b) => a.index - b.index);
  d2ItemsMetadata = new Map();
  items.forEach(item => {
    d2ItemsMetadata.set(item.hash, item);
  });
  return d2ItemsMetadata;
}

async function getDestiny2ItemsMetadata(locale = 'en') {
  const BASE_URL = 'https://bungie.net';
  const d2Manifest = await axios.get(BASE_URL + '/Platform/Destiny2/Manifest/', {headers: {'X-API-Key': process.env.API_KEY}});
  const d2ManifestVersion = d2Manifest.data.Response.version;
  const d2ItemDefinitionURL = BASE_URL + d2Manifest.data.Response.jsonWorldComponentContentPaths[locale].DestinyInventoryItemDefinition;
  const jsonFilename = new URL(d2ItemDefinitionURL).pathname.split('/').at(-1);
  const currDir = path.join(await ipcRenderer.invoke('getPath', 'userData'), 'Destiny 2 Item Definitions', locale);
  const fullPathToGzippedJson = path.join(currDir, jsonFilename + '.gz');
  if (fs.existsSync(path.join(currDir, 'download_in_progress'))) {
    // Previous download didn't finish. Delete the incomplete file and re-download.
    await reDownloadGzippedJson(d2ItemDefinitionURL, currDir, jsonFilename);
    appConfig.set('d2ManifestVersionOnLastStartup', d2ManifestVersion);
    return loadGzippedD2Json(fullPathToGzippedJson);
  }

  if (appConfig.get('d2ManifestVersionOnLastStartup') === d2ManifestVersion) {
    // No manifest change since last launch.
    if (!fs.existsSync(fullPathToGzippedJson)) {
      // But current language version is missing.
      await reDownloadGzippedJson(d2ItemDefinitionURL, currDir, jsonFilename);
    }

    return loadGzippedD2Json(fullPathToGzippedJson);
  }

  // New manifest or first launch. Delete possible old files and re-download.
  await reDownloadGzippedJson(d2ItemDefinitionURL, currDir, jsonFilename, true);
  appConfig.set('d2ManifestVersionOnLastStartup', d2ManifestVersion);
  return loadGzippedD2Json(fullPathToGzippedJson);
}

module.exports = {getDestiny1ItemsMetadata, getDestiny2ItemsMetadata};
