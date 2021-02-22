const fs = require('fs');
const path = require('path');
const { downloadAndExtractTool } = require('./githubReleaseDler.js');

function useDefault(key) {
    userPreferences[key].value = userPreferences[key].defaultValue;
}

module.exports = {
    "outputPath": {
        value: null,
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
        value: null,
        defaultValue: '',
        ifUndefined: () => {
            fs.mkdirSync(path.join(process.cwd(), 'bin'));
            downloadAndExtractTool(path.join(process.cwd(), 'bin'));
        }
    },
    "locale": {
        value: null,
        defaultValue: "en",
        ifUndefined: useDefault
    },
    "aggregateOutput": {
        value: null,
        defaultValue: true,
        ifUndefined: useDefault
    }
}