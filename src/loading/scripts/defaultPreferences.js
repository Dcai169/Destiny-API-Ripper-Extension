const fs = require('fs');
const path = require('path');
const { downloadAndExtractTool } = require('./githubReleaseDler.js');

function useDefault(key) {
    userPreferences[key].value = userPreferences[key].defaultValue;
}

module.exports = {
    "outputPath": {
        value: '',
        defaultValue: '',
        ifUndefined: (key) => {
            let defaultPath = path.join(process.cwd(), 'output');
            try {
                fs.mkdirSync(defaultPath);
            } catch (error) {
                // Let the error go wild and free
            }
            userPreferences[key].value = defaultPath;
        }
    },
    "toolPath": {
        value: '',
        defaultValue: '',
        ifUndefined: () => {
            try {
                fs.mkdirSync(path.join(process.cwd(), 'bin'));
            } catch (error) {
                // Let the error go wild and free
            }
                downloadAndExtractTool(path.join(process.cwd(), 'bin'))
                .then((info) => {
                    console.log(path.join(path.parse(info.get('Path')).dir, fs.readdirSync(path.parse(info.get('Path')).dir, { withFileTypes: true }).filter((i) => { return i.isFile() && i.name.split('.').reverse()[0] === 'exe' })[0].name))
                    userPreferences['toolPath'].value = path.join(path.parse(info.get('Path')).dir, fs.readdirSync(path.parse(info.get('Path')).dir, { withFileTypes: true }).filter((i) => { return i.isFile() && i.name.split('.').reverse()[0] === 'exe' })[0].name)
                });
        }
    },
    "locale": {
        value: '',
        defaultValue: "en",
        ifUndefined: useDefault
    },
    "aggregateOutput": {
        value: '',
        defaultValue: true,
        ifUndefined: useDefault
    }
}