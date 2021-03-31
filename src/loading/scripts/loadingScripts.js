const axios = require('axios');
const path = require('path');
const { is } = require('electron-util');
const fs = require('fs');
const sevenBin = require('7zip-bin');
const { extractFull } = require('node-7z');
const { execFile } = require('child_process');

async function getReleaseAsset() {
    // Get releases
    return new Promise((resolve, reject) => {
        axios.get('https://api.github.com/repos/TiredHobgoblin/Destiny-Collada-Generator/releases')
            .then((res) => {
                res.data[0].assets.forEach((i) => {
                    if (i.name.toLowerCase().includes((is.macos ? 'osx' : process.platform.substring(0, 3)))) {
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
        extractorStream.on('end', () => { resolve(extractorStream.info) });
    });
}

function toolVersion(toolPath) {
    return new Promise((resolve, reject) => {
        try {
            execFile(toolPath, ['--version'], (_, stdout, stderr) => {
                resolve({stdout, stderr});
            });
        } catch (err) {
            reject(err);
        }
    });
}

function findExecutable(binPath) {
    for (const file of fs.readdirSync(binPath, { withFileTypes: true })) {
        if (file.isFile() && (is.windows ? file.name.split('.').pop() === 'exe' : (file.name.includes('-v') && file.name.split('.').length === 1))) {
            return file;
        }
    }
}

module.exports = { extract7zip, getReleaseAsset, toolVersion, findExecutable };