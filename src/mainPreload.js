const {ipcRenderer} = require('electron');
const path = require('node:path');
const {promises: fsp} = require('node:fs');
const process = require('node:process');
const {spawn} = require('node:child_process');
const log = require('electron-log');
const {getDestiny1ItemsMetadata, getDestiny2ItemsMetadata} = require('./modules/destinyManifest.js');
const {appConfig} = require('./modules/appConfig.js');

window.addEventListener('load', () => {
// Document Objects
  const itemContainerElement = document.getElementById('item-container');
  const queueContainerElement = document.getElementById('queue-container');
  const gameSelectorElement = document.getElementById('game-selector');
  const searchBoxElement = document.getElementById('search-box');

  // eslint-disable-next-line unicorn/prevent-abbreviations
  let tempDir;
  let searchTimeout;
  let previousSearch = '';
  const metadataStorage = {
    1: {
      holder: null,
      displayLanguage: null,
    },
    2: {
      holder: null,
      displayLanguage: null,
    },
  };
  const itemCategoryHashToName = {
    45: 'helmet',
    46: 'gauntlets',
    47: 'chest',
    48: 'legs',
    49: 'class',
    1742617626: 'armorOrnament',
    21: 'warlockArmor',
    22: 'titanArmor',
    23: 'hunterArmor',
    5: 'autoRifle',
    8: 'scoutRifle',
    7: 'pulseRifle',
    6: 'handCannon',
    3954685534: 'submachineGun',
    14: 'sidearm',
    3317538576: 'bow',
    11: 'shotgun',
    9: 'fusionRifle',
    10: 'sniperRifle',
    2489664120: 'traceRifle',
    54: 'sword',
    13: 'rocketLauncher',
    1504945536: 'linearFusionRifle',
    12: 'machineGun',
    3124752623: 'weaponOrnament',
    42: 'ships',
    43: 'sparrows',
    39: 'ghostShells',
    41: 'shaders',
    153950757: 'grenadeLauncher',
    55: 'masks',
    3871742104: 'glaive',
  };

  function ifRarityVisible(element) {
    switch (element.dataset.rarity) {
      case '6': {
        return document.getElementById('filter-exotic').checked;
      }

      case '5': {
        return document.getElementById('filter-legendary').checked;
      }

      case '4': {
        return document.getElementById('filter-rare').checked;
      }

      case '3': {
        return document.getElementById('filter-uncommon').checked;
      }

      case '2': {
        return document.getElementById('filter-common').checked;
      }

      default: {
        return true;
      }
    }
  }

  function ifMatchesSearch(element) {
    if (!searchBoxElement.value) {
      return true;
    }

    return element.getAttribute('name').toLowerCase().includes(searchBoxElement.value.toLowerCase());
  }

  function ifAllCategoriesVisible(element) {
    // Bungie assign "fusion rifle" tag to linear fusion rifles on manifest version 115494.23.05.03.1901-1-bnet.50027
    let result;
    let isFusionRifleVisible;
    let isLinearFusionRifleVisible;
    for (const itemCategory of element.dataset.itemcategories.split(' ')) {
      result = document.getElementById(`filter-${itemCategory}`).checked;
      if (itemCategory === 'fusionRifle') {
        isFusionRifleVisible = result;
      } else if (itemCategory === 'linearFusionRifle') {
        isLinearFusionRifleVisible = result;
      } else if (!result) {
        break;
      }
    }

    // Ignore "fusion rifle" tag for linear fusion rifles
    return !isFusionRifleVisible && isLinearFusionRifleVisible ? true : result;
  }

  function updateVisibility(element, setToVisible) {
    if (setToVisible === undefined) {
      setToVisible = ifMatchesSearch(element) && ifAllCategoriesVisible(element) && ifRarityVisible(element);
    }

    element.classList.remove(setToVisible ? 'hidden' : 'm-1');
    element.classList.add(setToVisible ? 'm-1' : 'hidden');
  }

  function updateItemsVisibilityOnFilterChange(filterElement) {
    [...document.querySelectorAll(`#item-container .item-tile${filterElement.dataset.selector ?? ''}`)].forEach(nodeList => {
      updateVisibility(nodeList);
    });
  }

  function printStatus(text, type = 'log') {
    const textElement = document.createElement('span');
    textElement.textContent = text;
    textElement.classList.add(`status-${type}`);

    document.getElementById('status-text').appendChild(textElement);
    document.getElementById('status-text').appendChild(document.createElement('br'));

    if (document.getElementById('toggle-status-autoscroll').checked) {
      document.getElementById('status-container').scrollTop = document.getElementById('status-container').scrollHeight;
    }
  }

  function printInfo(text) {
    log.info(text);
    printStatus(text, 'log');
  }

  function printWarn(text) {
    log.warn(text);
    printStatus(text, 'warn');
  }

  function printError(text) {
    log.error(text);
    printStatus(text, 'error');
  }

  function replaceBackslashes(path) {
    return path?.replaceAll('\\', '/');
  }

  function printExitCode(softwareName, code = 0) {
    printInfo(softwareName + ` exited with code ${code}`, (code) ? 'error' : 'log');
  }

  async function currDirPath(outputPath) {
    let currDirName;
    let lastDirCreationTime;
    const f = await fsp.readdir(outputPath, {withFileTypes: true});
    const dirs = f.filter(f => f.isDirectory());
    const dirCount = dirs.length;
    for (const [index, dir] of dirs.entries()) {
      const stats = await fsp.stat(path.join(outputPath, dir.name));
      const currDirCreationTime = stats.birthtimeMs;
      if (!currDirName) {
        currDirName = dir.name;
        lastDirCreationTime = currDirCreationTime;
      } else if (currDirCreationTime > lastDirCreationTime) {
        currDirName = dir.name;
        lastDirCreationTime = currDirCreationTime;
      }

      if (index === dirCount - 1) {
        return path.join(outputPath, currDirName);
      }
    }
  }

  async function dispatchImportRequest() {
    if (appConfig.get('blenderConnector')) {
      log.verbose('Dispatching import request to Blender');
      await fetch('http://localhost:41786', {
        method: 'HEAD',
        headers: {'X-Content-Path': await currDirPath(appConfig.get('outputPath'))},
      });
    }
  }

  function printSubprocessMessages(softwareName, streamName, chunk) {
    switch (streamName) {
      case 'stdout': {
        printInfo(softwareName + '(stdout): ' + chunk);
        break;
      }

      case 'stderr': {
        printError(softwareName + '(stderr): ' + chunk);
        break;
      }

      default: {
        printError('Unexpected stream name when trying to display messages of subprocess "' + softwareName + '"!');
      }
    }
  }

  function runDCG(exeArgs) {
    return new Promise((resolve, reject) => {
      const child = spawn(appConfig.get('dcgPath'), exeArgs);
      child.stdout.on('data', chunk => {
        printSubprocessMessages('DCG', 'stdout', chunk);
      });
      child.stderr.on('data', chunk => {
        printSubprocessMessages('DCG', 'stderr', chunk);
      });
      child.on('exit', code => {
        if (code === 0) {
          printExitCode('DCG', code);
          resolve();
        } else {
          printExitCode('DCG', code);
          reject();
        }
      });
    });
  }

  function ripFromAPI(hashes, gameGeneration = '2') {
    return new Promise((resolve, reject) => {
      // DestinyColladaGenerator.exe <GAME> -o <OUTPUT PATH> [<HASHES>]
      runDCG([gameGeneration, '-o', appConfig.get('outputPath')].concat(hashes))
        .then(() => {
          resolve();
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  async function ripAllFromAPI(items, gameGeneration = '2') {
    while (items.length > 0) {
      await ripFromAPI([items.pop().hash], gameGeneration);
    }
  }

  function runMDE(item, outputPath) {
    return new Promise((resolve, reject) => {
      // MontevenDynamicExtractor.exe -p <PACKAGE PATH> -o <OUTPUT PATH> -n <ITEM NAME> -t -h <HASH>
      const exeArgs = ['--pkgspath', replaceBackslashes(appConfig.get('pkgPath')), '--outputpath', replaceBackslashes(outputPath)]
        // If the item's class is not null, add it to the name, then replace all the spaces with underscores
        .concat((item.shader ? [] : ['--filename', `${(item.class ? `${item.class}_` : '')}${item.name.toLowerCase()}`.replaceAll(/[ -]/g, '_')]))
        // If the item is a shader, use the '-h' flag, otherwise use the '-a' flag
        .concat(['--textures', (item.shader ? '--shader' : '--api'), item.hash]);
      const child = spawn(appConfig.get('mdePath'), exeArgs, {cwd: path.parse(appConfig.get('mdePath')).dir});
      child.stdout.on('data', chunk => {
        printSubprocessMessages('MDE', 'stdout', chunk);
      });
      child.stderr.on('data', chunk => {
        printSubprocessMessages('MDE', 'stderr', chunk);
      });
      child.on('exit', code => {
        if (code === 0) {
          printExitCode('MDE', code);
          resolve();
        } else {
          printExitCode('MDE', code);
          reject();
        }
      });
    });
  }

  async function runMDEAll(items, outputPath) {
    while (items.length > 0) {
      await runMDE(items.pop(), outputPath);
    }
  }

  function convertShaderJson(shaderPath, name) {
    return new Promise((resolve, reject) => {
      // DestinyColladaGenerator.exe -s <SHADER JSON PATH> <OUTPUT PATH> <ITEM NAME>
      runDCG(['-s', shaderPath, appConfig.get('outputPath'), name])
        .then(() => {
          resolve();
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  async function ripShader(shader) {
    const workingDir = await fsp.mkdtemp(path.join(tempDir, `${shader.name}-`));
    await runMDE(shader, workingDir);
    printInfo('Converting shader.json to python script(s)...');
    await convertShaderJson(path.join(workingDir, `${shader.hash}`, 'shader.json'), shader.name);
  }

  async function ripAllShaders(shaders) {
    while (shaders.length > 0) {
      await ripShader(shaders.pop());
    }
  }

  async function ripAll(gameGeneration, items) {
    const _3dItems = [];
    const d2Shaders = [];

    items.forEach(item => {
      if (item.shader && item.gameGeneration === '2') {
        d2Shaders.push(item);
      } else {
        _3dItems.push(item);
      }
    });

    // Extract 3D items
    // Check platform in case the user modified config.json outside of DARE
    if (process.platform === 'win32' && appConfig.get('ripHDTextures') && gameGeneration === '2' && _3dItems.length > 0) {
      printInfo('Ripping HD textures...');
      if (appConfig.get('aggregateOutput')) {
        await ripFromAPI(_3dItems.map(item => item.hash), gameGeneration);
        const hdtPath = path.join((await currDirPath(appConfig.get('outputPath'))), 'HD_Textures');
        await fsp.mkdir(hdtPath);
        await runMDEAll(_3dItems, hdtPath);
        await dispatchImportRequest();
      } else {
        for (const item of _3dItems) {
          await ripFromAPI([item.hash], gameGeneration);
          const hdtPath = path.join((await currDirPath(appConfig.get('outputPath'))), 'HD_Textures');
          await fsp.mkdir(hdtPath);
          await runMDE(item, hdtPath);
          await dispatchImportRequest();
        }
      }
    } else if (_3dItems.length > 0) {
      // Skip HD textures
      printInfo('Ripping API textures...');
      if (appConfig.get('aggregateOutput')) {
        await ripFromAPI(_3dItems.map(item => item.hash), gameGeneration);
        await dispatchImportRequest();
      } else {
        await ripAllFromAPI(_3dItems, gameGeneration);
        await dispatchImportRequest();
      }
    } else {
      // printInfo('No 3D models found in queue');
    }

    if (appConfig.get('ripShaders')) {
      if (d2Shaders.length > 0) {
        // Extract shaders
        // Generate shader.json using MDE and save output to temp directory
        printInfo('Ripping shader(s)...');
        await ripAllShaders(d2Shaders);
        await dispatchImportRequest;
      } else {
        // printInfo('No shaders found in queue');
      }
    } else {
      printInfo('Shader ripping is disabled');
    }
  }

  function startRippingHandler() {
    printWarn('Starting rip(s). This could take a while...');
    // Check if Output path is configured
    if (!appConfig.get('outputPath')) {
      printError('Output path is not configured! Aborting...');
      return;
    }

    // Check if DCG is configured
    if (!appConfig.get('dcgPath')) {
      printError('Destiny Collada Generator is not configured! Aborting...');
      return;
    }

    // If on Windows, check Rip HD Textures and Rip shaders flags
    if (process.platform === 'win32' && (appConfig.get('ripHDTextures') || appConfig.get('ripShaders'))) {
      // When applicable, check if MDE is configured
      if (!appConfig.get('mdePath')) {
        printError('Monteven Dynamic Extractor is not configured! Aborting...');
        return;
      }

      // When applicable, check if Destiny 2 packages is configured
      if (!appConfig.get('pkgPath')) {
        printError('Destiny 2 Packages is not configured! Aborting...');
        return;
      }
    }

    // Check if ripping queue is empty
    if ([...queueContainerElement.children].length === 0) {
      printError('No items in queue');
      return;
    }

    const items = [...queueContainerElement.children].map(item =>
      ({
        hash: item.id,
        name: item.getAttribute('name'),
        shader: item.dataset.itemcategories.includes('shader'),
        class: item.dataset?.class || null,
        gameGeneration: item.dataset.gameGeneration,
      }),
    );
    printInfo(`Hash(es): ${items.map(item => item.hash).join(' ')}`);
    // Disable start ripping button
    document.getElementById('start-ripping-button').setAttribute('disabled', 'disabled');
    ripAll(gameSelectorElement.value, items).then(() => {
      printWarn('All rip(s) done.');
      // Enable start ripping button
      document.getElementById('start-ripping-button').removeAttribute('disabled');
    }).catch(error => {
      // Enable start ripping button
      printError('Ripping failed! Error message: ' + error.message);
      document.getElementById('start-ripping-button').removeAttribute('disabled');
    });
  }

  function updateCategoryFilterCheckbox(categoryFilterElement) {
    // Check if this category is partially filtered and update its checked state
    if ([...document.querySelectorAll(`[data-influence=${categoryFilterElement.id}]`)]
      .map(itemFilterElement => itemFilterElement.checked)
      .every((state, _, array) => state === array[0])) {
      categoryFilterElement.checked = document.querySelector(`[data-influence=${categoryFilterElement.id}]`).checked;
      categoryFilterElement.indeterminate = false;
    } else {
      categoryFilterElement.checked = false;
      categoryFilterElement.indeterminate = true;
    }
  }

  // Find the neighboring element index in items container
  // TODO: this only works when sorting tiles by index; refactor if other sorts are implemented
  function closestIndex(searchTarget, targetList) {
    return targetList.reduce((previous, curr) => Math.abs(curr - searchTarget) < Math.abs(previous - searchTarget) ? curr : previous);
  }

  function tierNumberToRarityName(tierNumber) {
    switch (tierNumber) {
      case 6: {
        return 'exotic';
      }

      case 5: {
        return 'legendary';
      }

      case 4: {
        return 'rare';
      }

      case 3: {
        return 'uncommon';
      }

      case 2: {
        return 'common';
      }

      default: {
        printError('Unexpected item tier number when trying to convert it to name: ' + tierNumber + '!');
      }
    }
  }

  function newItemTile(item, gameGeneration, loadThumbnail) {
    const tileRoot = document.createElement('div');
    tileRoot.id = item.hash;

    tileRoot.classList.add('item-tile');
    tileRoot.classList.add('d-flex');
    tileRoot.classList.add('align-items-center');
    tileRoot.classList.add('m-1');

    tileRoot.dataset.gameGeneration = gameGeneration;
    tileRoot.addEventListener('click', itemTileClickHandler);

    const iconImg = document.createElement('img');
    iconImg.setAttribute('referrerpolicy', 'no-referrer');
    iconImg.setAttribute('crossorigin', 'None');
    iconImg.loading = 'lazy';

    iconImg.style.gridRow = '1';
    iconImg.style.gridColumn = '1';

    // Image div (Icon & Season Badge)
    const iconDiv = document.createElement('div');
    iconDiv.style.display = 'grid';
    iconDiv.style.position = 'relative';

    // Item text (Name & Type)
    const textDiv = document.createElement('div');
    textDiv.classList.add('tile-text');
    textDiv.classList.add('d-inline-flex');
    textDiv.classList.add('px-2');

    const textContainer = document.createElement('div');
    const titleText = document.createElement('p');
    titleText.classList.add('item-name');
    titleText.classList.add('m-0');

    const typeText = document.createElement('p');
    typeText.classList.add('m-0');

    if (gameGeneration === '2') {
      tileRoot.style.backgroundColor = `var(--${tierNumberToRarityName(item.inventory.tierType)}-color)`;

      tileRoot.dataset.index = item.index;
      tileRoot.dataset.rarity = item.inventory.tierType;
      tileRoot.dataset.itemcategories = item.itemCategoryHashes
        .map((hash, ..._) => itemCategoryHashToName[hash]).join(' ').trim();
      tileRoot.setAttribute('name', item.displayProperties.name);

      if (!tileRoot.dataset.itemcategories) {
        tileRoot.dataset.itemcategories = 'armorOrnament';
      }

      switch (item?.classType) {
        case 0: {
          tileRoot.dataset.itemcategories += ' titanArmor';
          break;
        }

        case 1: {
          tileRoot.dataset.itemcategories += ' hunterArmor';
          break;
        }

        case 2: {
          tileRoot.dataset.itemcategories += ' warlockArmor';
          break;
        }

        default: {
          if (item?.plug?.plugCategoryIdentifier.split('_')[2]) {
            tileRoot.dataset.class = item?.plug?.plugCategoryIdentifier.split('_')[2];
          }
        }
      }

      iconImg.src = `https://bungie.net${item.displayProperties.icon}`;

      if (item.iconWatermark) {
        const watermarkImg = document.createElement('img');
        watermarkImg.src = `https://bungie.net${item.iconWatermark}`;
        watermarkImg.setAttribute('referrerpolicy', 'no-referrer');
        watermarkImg.setAttribute('crossorigin', 'None');
        watermarkImg.loading = 'lazy';

        watermarkImg.style.gridRow = '1';
        watermarkImg.style.gridColumn = '1';
        watermarkImg.style.zIndex = '1';

        iconDiv.appendChild(watermarkImg);
      }

      titleText.innerHTML = `<b class='m-0'>${item.displayProperties.name}</b>`;
      titleText.style.color = (item.inventory.tierType <= 2 ? 'black' : 'white');

      typeText.innerHTML = `<i class='fs-5 item-type'>${item.itemTypeDisplayName}</i>`;
      typeText.style.color = (item.inventory.tierType <= 2 ? '#707070' : '#DDD');
    } else if (gameGeneration === '1') {
      tileRoot.style.backgroundColor = `var(--${tierNumberToRarityName(item?.tierType)}-color)`;
      tileRoot.dataset.itemcategories = item.itemCategoryHashes.map((hash, ..._) => itemCategoryHashToName[hash]).join(' ').trim();

      tileRoot.dataset.index = item.hash;
      tileRoot.dataset.rarity = item.tierType;

      tileRoot.setAttribute('name', item?.itemName ?? 'Classified');

      iconImg.src = `https://bungie.net${item.icon ?? '/img/misc/missing_icon.png'}`;

      titleText.innerHTML = `<b class='m-0'>${item?.itemName ?? `#${item.hash}`}</b>`;
      titleText.style.color = (item.tierType <= 2 ? 'black' : 'white');

      typeText.innerHTML = `<i class='fs-5 item-type'>${item.itemTypeName}</i>`;
      typeText.style.color = (item.tierType <= 2 ? '#707070' : '#DDD');
    }

    iconDiv.appendChild(iconImg);

    textContainer.appendChild(titleText);
    textContainer.appendChild(typeText);
    textDiv.appendChild(textContainer);

    if (loadThumbnail) {
      tileRoot.appendChild(iconDiv);
    }

    tileRoot.appendChild(textDiv);

    return tileRoot;
  }

  function moveItemBackToContainer(item) {
    const allIndices = Array.from(itemContainerElement.children).map(item => Number(item.dataset.index));
    const itemIndex = item.dataset.index;
    const neighborIndex = closestIndex(itemIndex, allIndices);
    if (itemIndex < neighborIndex) {
      document.querySelector(`[data-index='${neighborIndex}']`).before(item);
    } else {
      document.querySelector(`[data-index='${neighborIndex}']`).after(item);
    }

    updateVisibility(item);
  }

  function generateTiles(itemsMetadata) {
    itemContainerElement.innerHTML = '';
    queueContainerElement.innerHTML = '';
    const loadThumbnail = appConfig.get('loadThumbnails');

    itemsMetadata.forEach(item => {
      itemContainerElement.append(newItemTile(item, gameSelectorElement.value, loadThumbnail));
    });
    printInfo(`${itemsMetadata.size} items loaded.`);
  }

  async function initializeTiles() {
    const locale = appConfig.get('locale').toLowerCase();
    const gameGeneration = gameSelectorElement.value;
    printStatus(`Loading Destiny ${gameGeneration} items with locale ${locale}`);
    switch (gameGeneration) {
      case '1': {
        let d1Locale = locale;
        if (locale === 'es-mx') {
          d1Locale = 'es';
          printWarn('Destiny 1 is not available in "es-mx", showing "es" instead.');
        }

        if (!['en', 'fr', 'es', 'de', 'it', 'ja', 'pt-br'].includes(locale)) {
          d1Locale = 'en';
          printWarn('Destiny 1 is not available in "' + locale + '", showing "en" instead.');
        }

        metadataStorage[1].displayLanguage = d1Locale;
        try {
          metadataStorage[gameGeneration].holder = await getDestiny1ItemsMetadata(d1Locale);
          generateTiles(metadataStorage[gameGeneration].holder);
        } catch (error) {
          printError('Unable to load Destiny 1 item definitions. Error message: ' + error.message);
        }

        break;
      }

      case '2': {
        metadataStorage[2].displayLanguage = locale;
        try {
          metadataStorage[gameGeneration].holder = await getDestiny2ItemsMetadata(locale);
          generateTiles(metadataStorage[gameGeneration].holder);
        } catch (error) {
          if (error.message === "Request failed with status code 500") {
            printError('Unable to load Destiny 2 item definitions. It seems the API is down, try again later.')
          } else {
            printError('Unable to load Destiny 2 item definitions. Error message: ' + error.message);
          }
        }

        break;
      }

      default: {
        printError('Unexpected game generation when trying to load item definitions: ' + gameGeneration + '!');
      }
    }
  }

  function itemTileClickHandler(event) {
    const item = event.currentTarget;
    switch (item.parentElement.id) {
      case 'item-container': {
        // Moves item to queue
        queueContainerElement.append(item);
        break;
      }

      case 'queue-container': {
        moveItemBackToContainer(item);
        break;
      }

      default: {
        printError('"itemTileClickHandler()" called unexpectedly by: ' + event + '!');
      }
    }
  }

  function searchBoxInputHandler() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const search = searchBoxElement.value;
      const diff = search.length - previousSearch.length;

      if (search === '') {
        [...document.getElementById('item-container').children].forEach(item => {
          // This loop is super slow
          updateVisibility(item);
        });
        previousSearch = '';
      } else if (diff > 0) {
        [...document.querySelectorAll('#item-container .m-1')].forEach(item => {
          updateVisibility(item);
        });
        previousSearch = search;
      } else if (diff < 0) {
        [...document.querySelectorAll('#item-container .hidden')].forEach(item => {
          updateVisibility(item);
        });
        previousSearch = search;
      }
    }, 500);
  }

  function gameSelectorChangeHandler() {
    searchBoxElement.value = '';
    if (metadataStorage[gameSelectorElement.value].holder && metadataStorage[gameSelectorElement.value].displayLanguage === appConfig.get('locale')) {
      generateTiles(metadataStorage[gameSelectorElement.value].holder);
    } else {
      initializeTiles().then();
    }
  }

  function dropdownToggleHandler(event) {
    const ulElement = event.target.nextElementSibling;
    if (ulElement.classList.contains('show')) {
      ulElement.classList.remove('show');
      ulElement.removeAttribute('x-placement');
    } else {
      ulElement.classList.add('show');
      ulElement.setAttribute('x-placement', 'bottom-start');
    }
  }

  ipcRenderer.invoke('getAppVersion').then(async response => {
    printInfo('DARE v' + response);
    if (!appConfig.get('outputPath')) {
      // Set default output directory
      const defaultOutputPath = path.join(await ipcRenderer.invoke('getPath', 'documents'), 'DARE Output');
      printWarn(`Output path is not configured. Defaulting to ${defaultOutputPath} `);
      try {
        await fsp.mkdir(defaultOutputPath, {recursive: true});
        appConfig.set('outputPath', defaultOutputPath);
        printInfo('Successfully created output directory.');
      } catch (error) {
        printError('Failed to create output directory. Error message: ' + error.message);
      }
    }

    // Load items on startup
    await initializeTiles();

    if (!appConfig.get('dcgPath')) {
      const choice = await ipcRenderer.invoke('confirmDCGDownload');
      if (choice) {
        ipcRenderer.send('createDCGWindow');
      }
    }
  });

  // Recreate working directory in temp
  ipcRenderer.invoke('getPath', 'temp').then(async response => {
    tempDir = path.join(response, 'destiny-api-ripper-extension');
    try {
      await fsp.rm(tempDir, {force: true, recursive: true});
    } catch (error) {
      printError('Failed to delete working directory "' + tempDir + '". Error message: ' + error.message);
    }

    try {
      await fsp.mkdir(tempDir, {recursive: true});
    } catch (error) {
      printError('Failed to create working directory "' + tempDir + '". Error message: ' + error.message);
    }
  });

  // Navbar items
  gameSelectorElement.addEventListener('change', gameSelectorChangeHandler);
  document.getElementById('sort-dropdown-button').addEventListener('click', dropdownToggleHandler);
  document.getElementById('rarity-dropdown-button').addEventListener('click', dropdownToggleHandler);
  document.getElementById('type-dropdown-button').addEventListener('click', dropdownToggleHandler);
  [...document.getElementsByClassName('rarity-filter')].forEach(element => {
    element.addEventListener('click', event => {
      updateItemsVisibilityOnFilterChange(event.target);
    });
  });
  [...document.getElementsByClassName('item-filter')].forEach(element => {
    element.addEventListener('click', event => {
      updateItemsVisibilityOnFilterChange(event.target);
      if (event.target.dataset.influence) {
        updateCategoryFilterCheckbox(document.getElementById(event.target.dataset.influence));
      }
    });
  });
  [...document.getElementsByClassName('category-filter')].forEach(element => {
    element.addEventListener('click', event => {
      [...document.querySelectorAll(`[data-influence=${event.target.id}]`)].forEach(element => {
        element.checked = event.target.checked;
        updateItemsVisibilityOnFilterChange(element);
      });
    });
  });
  [...document.getElementsByClassName('armor-class-filter')].forEach(element => {
    element.addEventListener('click', event => {
      updateItemsVisibilityOnFilterChange(event.target);
    });
  });
  document.getElementById('clear-queue-button').addEventListener('click', () => {
    [...queueContainerElement.children].forEach(item => {
      moveItemBackToContainer(item);
    });
  });
  document.getElementById('start-ripping-button').addEventListener('click', startRippingHandler);
  document.getElementById('open-output-button').addEventListener('click', () => {
    const path = appConfig.get('outputPath');
    if (path) {
      ipcRenderer.send('openExplorer', path);
    } else {
      printError('Output path is not configured!');
    }
  });
  document.getElementById('search-box').addEventListener('input', searchBoxInputHandler);
  document.getElementById('settings-button').addEventListener('click', () => {
    ipcRenderer.send('createSettingsWindow');
  });
  // Status window
  document.getElementById('clear-status').addEventListener('click', () => {
    document.getElementById('status-text').innerHTML = '';
  });
  // Keyboard shortcuts
  ipcRenderer.on('reload', (_, args) => {
    if (args) {
      initializeTiles().then();
    }
  });
  ipcRenderer.on('force-reload', (_, args) => {
    if (args) {
      document.location.reload();
    }
  });
}, false);
