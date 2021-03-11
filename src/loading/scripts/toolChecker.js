const { execFile } = require('child_process');
// Basically promisifying some callback-based functions.

let stdOut;
let stdErr;

function toolVersion(toolPath) {
    return new Promise((resolve, reject) => {
        execFile(toolPath, ['--version'], (_, stdout, stderr) => {
            stdOut = stdout;
            stdErr = stderr;
        }).on('exit', () => {
            if (stdErr) {
                reject(stdErr);
            }

            if (stdOut) {
                resolve(stdOut);
            }

            if (!stdOut && !stdErr) {
                reject(null);
            }
        });
    });
}

module.exports = { toolVersion }