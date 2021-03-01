const { execFile } = require('child_process');
// Basically promisifying some callback-based functions.

function toolVersion(toolPath) {
    return new Promise((resolve, reject) => {
        let child = execFile(toolPath, ['--version'], (err, stdout, stderr) => {
            // if (err) {
            //     reject(err);
            //     return;
            // }

            if (stderr) {
                reject(stderr);
                return;
            }

            resolve(stdout);
        });
    });
}

module.exports = { toolVersion }