const fs = require('node:fs');
const process = require('node:process');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {ipcRenderer} = require('electron');
const axios = require('axios');
const {path7za} = require('7zip-bin');
const {appConfig} = require('./modules/appConfig.js');

window.addEventListener('load', async () => {
  let packagePath;
  let latestAsset;
  let binPath;
  const messageElement = document.querySelector('#message');
  const progressBarElement = document.querySelector('#progress-bar');
  const progressTextElement = document.querySelector('#progress-text');
  let platformKeyword;
  switch (process.platform) {
    case 'win32': {
      platformKeyword = 'Win64';
      break;
    }

    case 'linux': {
      platformKeyword = 'Linux64';
      break;
    }

    case 'darwin': {
      platformKeyword = 'OSX64';
      break;
    }

    default:
  }

  function printMessage(message) {
    const textElement = document.createElement('span');
    textElement.textContent = message;
    messageElement.appendChild(textElement);

    if (document.getElementById('auto-scroll').checked) {
      messageElement.scrollTop = messageElement.scrollHeight;
    }
  }

  // Download
  printMessage('Getting release asset...');
  try {
    let response = await axios.get('https://api.github.com/repos/TiredHobgoblin/Destiny-Collada-Generator/releases');
    loop1:
      for (const release of response.data) {
        if (!release.draft && !release.prerelease) {
          for (const asset of release.assets) {
            if (asset.name.includes(platformKeyword)) {
              latestAsset = asset;
              break loop1;
            }
          }
        }
      }

    if (!latestAsset) {
      printMessage('Failed to get the latest release asset! Unexpected Github API response.');
      return;
    }

    const packageUrl = latestAsset.browser_download_url;
    const userDataPath = await ipcRenderer.invoke('getPath', 'userData');
    binPath = path.join(userDataPath, 'bin');
    packagePath = path.join(binPath, latestAsset.name);
    fs.rmSync(binPath, {recursive: true, force: true});
    fs.mkdirSync(binPath);
    printMessage('Downloading: ' + packageUrl);
    response = await axios.get(packageUrl, {
      responseType: 'arraybuffer',
      onDownloadProgress(progressEvent) {
        progressTextElement.textContent = progressEvent.loaded + '/' + progressEvent.total + ' bytes downloaded.';
        progressBarElement.style.width = String(progressEvent.loaded / progressEvent.total * 100) + '%';
      },
    });
    fs.writeFileSync(packagePath, new Uint8Array(response.data));
  } catch (error) {
    printMessage('Failed to download DCG! Error message: ' + error.message);
    return;
  }

  // Un7zip
  printMessage('Extracting downloaded archive...');
  const destinationDir = path.join(binPath, path.parse(latestAsset.name).name);
  const extension = platformKeyword === 'Win64' ? '.exe' : '';
  const pathToExe = path.join(destinationDir, latestAsset.name.replace('-' + platformKeyword + '-Unpacked.7z', extension));
  const actual7zaPath = await ipcRenderer.invoke('isPackaged') ? path7za.replace('app.asar', 'app.asar.unpacked') : path7za;
  const child = spawn(actual7zaPath, ['x', '-o*', packagePath], {cwd: binPath});
  child.stdout.on('data', chunk => {
    printMessage('7za(stdout): ' + chunk);
  });
  child.stderr.on('data', chunk => {
    printMessage('7za(stderr): ' + chunk);
  });
  child.on('close', code => {
    if (code === 0) {
      appConfig.set('dcgPath', pathToExe);
      printMessage('DCG has been successfully extracted. New path is set to: ' + pathToExe);
      try {
        fs.rmSync(packagePath, {force: true});
        printMessage('No longer needed archive has been deleted.');
      } catch (error) {
        printMessage('Failed to delete no longer needed archive: ' + packagePath);
        printMessage('Error message: ' + error.message);
      }

      if (platformKeyword !== 'Win64') {
        const child = spawn('chmod', ['+x', pathToExe]);
        child.on('close', code => {
          if (code !== 0) {
            printMessage('Failed to add execute bit to DCG! Check if it can be launched. Chmod exited with code ' + code + '.');
          }
        });
      }
    } else {
      printMessage('Failed to extract DCG! 7za exited with code ' + code + '.');
    }

    printMessage('All actions done. You can safely close this window.');
  });
}, false);
