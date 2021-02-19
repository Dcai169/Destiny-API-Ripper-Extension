const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sevenBin = require('7zip-bin');
const { extractFull } = require('node-7z');

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

function downloadAndExtract(dlPath, acceptPrerelease) {
    // Get releases
    axios.get('https://api.github.com/repos/TiredHobgoblin/Destiny-Collada-Generator/releases').then((res) => {
        // determine which release to use
        let targetRelease = 0;
        if (!acceptPrerelease) {
            res.data.some((v, i) => { targetRelease = i; return !v.prerelease; });
        }
        // get asset definitions
        axios.get(res.data[targetRelease].assets_url).then((res) => {
            let downloadUrl = (() => {
                for (const i of res.data) {
                    if (i.name.toLowerCase().includes((process.platform === 'darwin' ? 'osx' : process.platform.substring(0, 3)))) {
                        return i.browser_download_url;
                    }
                }
            })();
            downloadFile(downloadUrl, path.join(dlPath, path.parse(downloadUrl).base)).then(() => {
                
            });
        });
    });
}