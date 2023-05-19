const process = require('node:process');
const {ipcRenderer} = require('electron');
const {appConfig} = require('./modules/appConfig.js');

window.addEventListener('load', () => {
  if (process.platform === 'win32' && process.arch === 'x64') {
    document.getElementById('mde-settings').classList.remove('hidden');
  }

  function settingRequiresReload() {
    ipcRenderer.send('setShouldReloadItems', true);
  }

  function setInputElementValue(elementId, value) {
    const inputElement = document.getElementById(elementId);
    switch (inputElement?.getAttribute('type')) {
      case 'text':
      case 'select': {
        inputElement.value = value;
        break;
      }

      case 'checkbox': {
        inputElement.checked = Boolean(value);
        break;
      }

      default:
    }
  }

  // Load settings
  for (const [key, value] of appConfig) {
    setInputElementValue(key, value);
  }

  [...document.getElementsByClassName('settings-checkbox')].forEach(inputElement => {
    inputElement.addEventListener('input', () => {
      appConfig.set(inputElement.id, inputElement.checked);
    });
  });
  document.getElementById('loadThumbnails').addEventListener('click', event => {
    appConfig.set(event.target.id, event.target.checked);
    settingRequiresReload();
  });
  document.getElementById('locale').addEventListener('change', event => {
    appConfig.set(event.target.id, event.target.value);
    settingRequiresReload();
  });
  for (const id of ['outputPath', 'dcgPath', 'mdePath', 'pkgPath']) {
    document.getElementById(id).addEventListener('click', event => {
      const dialogTitle = 'Select ' + event.target.previousElementSibling.textContent;
      ipcRenderer.invoke('getNewPathForSettings', dialogTitle, dialogTitle.includes('Directory')).then(response => {
        if (response) {
          appConfig.set(id, response);
          document.getElementById(id).value = response;
        }
      });
    });
  }
}, false);
