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
            alert('Please select your Destiny Collada Generator executable. Must be at least version 1.5.1.');
            ipcRenderer.send('selectToolPath');
        }
    },
    "locale": {
        value: null,
        defaultValue: "en",
        ifUndefined: (key) => {
            userPreferences[key].value = userPreferences[key].defaultValue;
        }
    },
    "aggregateOutput": {
        value: null,
        defaultValue: true,
        ifUndefined: (key) => {
            userPreferences[key].value = userPreferences[key].defaultValue;
        }
    }
}