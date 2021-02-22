const axios = require('axios');
const dler = require('nodejs-file-downloader');
const path = require('path');
const fs = require('fs');
const sevenBin = require('7zip-bin');
const { extractFull } = require('node-7z');

async function getDownloadUrl() {
    // Get releases
    return new Promise((resolve, reject) => {
        axios.get('https://api.github.com/repos/TiredHobgoblin/Destiny-Collada-Generator/releases')
            .then((res) => {
                // This is broken and idk why
                // Determine which release to use
                // let targetRelease = 0;
                // if (!acceptPrerelease) {
                //     res.data.some((v, i) => { targetRelease = i; return !v.prerelease; });
                // }
                // get asset definitions

                axios.get(res.data[0].assets_url).then((res) => {
                    res.data.forEach((i) => {
                        if (i.name.toLowerCase().includes((process.platform === 'darwin' ? 'osx' : process.platform.substring(0, 3)))) {
                            resolve(i.browser_download_url);
                        }
                    });
                }).catch(reject);
            }).catch(reject);
    });
}

async function extract7zip(archivePath) {
    return new Promise((resolve, reject) => {
        const extractorStream = extractFull(archivePath, path.parse(archivePath).dir, { $bin: sevenBin.path7za, recursive: true });

        extractorStream.on('progress', (progress) => { });
        extractorStream.on('error', reject);
        extractorStream.on('end', (info) => { resolve(extractorStream.info) });
    });
}

function downloadAndExtractTool(dlPath) {
    return new Promise(async (resolve, reject) => {
        new dler({
            url: await getDownloadUrl(), 
            directory: dlPath,
            cloneFiles: false
        }).download()
            .then(() => {
                extract7zip(path.join(dlPath, fs.readdirSync(dlPath, { withFileTypes: true }).filter((i) => { return i.isFile() && i.name.split('.').reverse()[0] === '7z' })[0].name))
                    .then(resolve)
                    .catch(reject);
            })
            .catch(reject);
    });
}

module.exports = { downloadAndExtractTool };