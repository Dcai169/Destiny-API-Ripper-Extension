const { api, is } = require('electron-util');
const Store = require('electron-store');
const fs = require('fs');
const path = require('path');
const { downloadAndExtractTool } = require('./loading/scripts/githubReleaseDler.js');

let schema = {
    "outputPath": {
        type: 'string',
        default: (() => {
            let defaultPath = path.join(api.app.getPath('documents'), 'DARE_Output');
            try {
                fs.mkdirSync(defaultPath);
            } catch (err) {
                if (err.errno === -17) {
                    return defaultPath;
                } else {
                    throw err;
                }
            }
            console.log('d0');
        })()
    },
    "toolPath": {
        type: 'string',
        default: (() => {
            let toolPath;
            try {
                fs.mkdirSync(path.join(api.app.getPath('userData'), 'bin'));
            } catch (err) {
                if (err.errno !== -17) {
                    throw err;
                }
            } finally {
                // downloadAndExtractTool(path.join(api.app.getPath('userData'), 'bin'))
                //     .then((info) => {
                //         return path.join(path.parse(info.get('Path')).dir, fs.readdirSync(path.parse(info.get('Path')).dir, { withFileTypes: true }).filter((i) => {return i.isFile() && (is.windows ? i.name.split('.').reverse()[0] === 'exe' : true)})[0].name);
                //     })
                //     .catch((err) => { throw err });
            }
            console.log('d1');
        })()
    },
    "locale": {
        type: 'string',
        enum: ['de', 'en', 'es', 'es-mx', 'fr', 'it', 'ja', 'ka', 'pl', 'pt-br', 'ru', 'zh-cht', 'zh-chs'],
        default: 'en'
    },
    "aggregateOutput": {
        type: 'boolean',
        default: true
    },
    "autoUpdateTool": {
        type: 'boolean',
        default: true
    }
}

const store = new Store({ schema });

module.exports = { userPreferences: store };
