const { execFile } = require('child_process');
const fs = require('fs');
const { resolve } = require('path');
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

            resolve(stdout.split('.').map((v) => { return parseInt(v.trim()) }));
        });
    });
}

function promiseifTruthy(i) {
    return new Promise((resolve, reject) => {
        (!!i ? resolve(true) : reject(false));
    });
}

function promiseReadFile(path) {
    return new Promise((resolve, reject) => {
        let fileText;
        try {
            fileText = fs.readFileSync(path);
        } catch (err) {
            reject(err);
        }
        resolve(fileText);
    });
}

module.exports = { toolVersion }