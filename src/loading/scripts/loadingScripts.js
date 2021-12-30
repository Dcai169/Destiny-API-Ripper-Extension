const axios = require('axios');
const path = require('path');
const { is } = require('electron-util');
const fs = require('fs');
const sevenBin = require('7zip-bin');
const { extractFull } = require('node-7z');
const { execFile } = require('child_process');

async function getReleaseAsset(repo, tag='latest') {
    // Get releases
    return new Promise((resolve, reject) => {
        axios.get(`https://api.github.com/repos/${repo}/releases`)
            .then((res) => {
                if (tag === 'latest') {
                    res.data[0].assets.forEach((asset) => {
                        if (asset.name.toLowerCase().includes((is.macos ? 'osx' : process.platform.substring(0, 3)))) {
                            resolve(asset);
                        }
                    });
                } else {
                    res.data.forEach(release => {
                        if (release.tag_name === tag) {
                            release.assets.forEach((asset) => {
                                if (asset.name.toLowerCase().includes((is.macos ? 'osx' : process.platform.substring(0, 3)))) {
                                    resolve(asset);
                                }
                            });
                        }
                    });
                }
            }).catch(reject);
    });
}

async function extract7zip(archivePath, progressCallback=() => {}) {
    return new Promise((resolve, reject) => {
        const extractorStream = extractFull(archivePath, path.parse(archivePath).dir, { $bin: sevenBin.path7za, recursive: true });

        extractorStream.on('progress', progressCallback);
        extractorStream.on('error', reject);
        extractorStream.on('end', () => { resolve(extractorStream.info) });
    });
}

async function getDCGVersion(dcgPath) {
    return new Promise((resolve, reject) => {
        try {
            execFile(dcgPath, ['--version'], (_, stdout, stderr) => {
                if (stderr) { reject(stderr) }
                resolve(stdout.trim());
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

module.exports = { extract7zip, getReleaseAsset, getDCGVersion, findExecutable };