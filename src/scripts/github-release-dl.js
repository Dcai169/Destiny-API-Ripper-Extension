const axios = require('axios');
const fs = require('fs');
const sevenBin = require('7zip-bin');
const { extractFull } = require('node-7z');

function getDownloadUrl(acceptPrerelease=false) {
    // Get releases
    axios.get('https://api.github.com/repos/TiredHobgoblin/Destiny-Collada-Generator/releases').then((res) => {
        // determine which release to use
        let targetRelease = 0;
        if (!acceptPrerelease) {
            res.data.some((v, i) => { targetRelease = i; return !v.prerelease; });
        }
        // get asset definitions
        axios.get(res.data[targetRelease].assets_url).then((res) => {
            for (const i of res.data) {
                if (i.name.toLowerCase().includes((process.platform === 'darwin' ? 'osx' : process.platform.substring(0, 3)))) {
                    return i.browser_download_url;
                }
            }
        });
    });
}

async function downloadFile(dlUrl, dlPath) {
    const writer = fs.createWriteStream(dlPath);
    const response = await axios({
        url: dlUrl,
        method: 'GET',
        responseType: 'stream'
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve)
        writer.on('error', reject)
    });
}

function extract7zip(archivePath) {
    const extractorStream = extractFull(archivePath, path.parse(archivePath).dir, {$bin: sevenBin.path7za, recursive: true})
}

// downloadFile(downloadUrl, path.join(dlPath, path.parse(downloadUrl).base)).then(() => {});