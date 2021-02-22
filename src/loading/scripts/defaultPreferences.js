const fs = require('fs');
const path = require('path');
const { downloadAndExtractTool } = require('./githubReleaseDler.js');

let defaultPreferences = {
    "outputPath": {
        value: '',
        ifUndefined: (key) => {
            let defaultPath = path.join(process.cwd(), 'output');
            try {
                fs.mkdirSync(defaultPath);
            } catch (error) {
                // Let the error go wild and free
            }
            defaultPreferences.outputPath.value = defaultPath;
            return Promise.resolve(defaultPath);
        }
    },
    "toolPath": {
        value: '',
        ifUndefined: () => {
            return new Promise((resolve, reject) => {
                try {
                    fs.mkdirSync(path.join(process.cwd(), 'bin'));
                } catch (error) {
                    // Let the error go wild and free
                }
                downloadAndExtractTool(path.join(process.cwd(), 'bin'))
                    .then((info) => {
                        defaultPreferences.toolPath.value = path.join(path.parse(info.get('Path')).dir, fs.readdirSync(path.parse(info.get('Path')).dir, { withFileTypes: true }).filter((i) => { return i.isFile() && i.name.split('.').reverse()[0] === (process.platform === 'win32' ? 'exe' : '') })[0].name)
                        return resolve(defaultPreferences.toolPath.value);
                    })
                    .catch(reject);
            });
            
        }
    },
    "locale": {
        value: 'en',
        ifUndefined: () => { return Promise.resolve('en'); }
    },
    "aggregateOutput": {
        value: true,
        ifUndefined: () => { return Promise.resolve(true); }
    }
}

module.exports = { defaultPreferences };
