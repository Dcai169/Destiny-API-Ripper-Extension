const axios = require('axios');
const dler = require('nodejs-file-downloader');
const path = require('path');
const fs = require('fs');
const sevenBin = require('7zip-bin');
const { extractFull } = require('node-7z');

async function getReleaseAsset() {
    // Get releases
    return new Promise((resolve, reject) => {
        axios.get('https://api.github.com/repos/TiredHobgoblin/Destiny-Collada-Generator/releases')
            .then((res) => {
                res.data[0].assets.forEach((i) => {
                    if (i.name.toLowerCase().includes((process.platform === 'darwin' ? 'osx' : process.platform.substring(0, 3)))) {
                        resolve(i);
                    }
                });
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
    return new Promise((resolve, reject) => {
        getReleaseAsset()
            .then((res) => {
                new dler({
                    url: res.browser_download_url,
                    directory: dlPath,
                    cloneFiles: false
                }).download()
                    .then(() => {
                        extract7zip(path.join(dlPath, fs.readdirSync(dlPath, { withFileTypes: true }).filter((i) => { return i.isFile() && i.name.split('.').reverse()[0] === '7z' })[0].name))
                            .then(resolve)
                            .catch(reject);
                    })
                    .catch(reject);
            })
            .catch(reject);
    });
}

module.exports = { downloadAndExtractTool, getReleaseAsset };