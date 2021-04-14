import * as axios from 'axios';
import * as path from 'path';
import { is } from 'electron-util';
import * as fs from 'fs';
import * as sevenBin from '7zip-bin';
import { extractFull } from 'node-7z';
import { execFile } from 'child_process';

import { GitHubAsset } from '../types/github';

export async function getReleaseAsset(): Promise<GitHubAsset | Error> {
    // Get releases
    return new Promise((resolve, reject) => {
        axios.default.get('https://api.github.com/repos/TiredHobgoblin/Destiny-Collada-Generator/releases')
            .then((res) => {
                res.data[0].assets.forEach((i: GitHubAsset) => {
                    if (i.name.toLowerCase().includes((is.macos ? 'osx' : process.platform.substring(0, 3)))) {
                        resolve(i);
                    }
                });
            }).catch(reject);
    });
}

export async function extract7zip(archivePath: string): Promise<Map<string, string> | Error> {
    return new Promise((resolve, reject) => {
        const extractorStream = extractFull(archivePath, path.parse(archivePath).dir, { $bin: sevenBin.path7za, recursive: true });

        extractorStream.on('progress', (progress) => { });
        extractorStream.on('error', reject);
        extractorStream.on('end', () => { resolve(extractorStream.info) });
    });
}

export function toolVersion(toolPath: string): Promise<{ stdout: string, stderr: string }> {
    return new Promise((resolve, reject) => {
        try {
            execFile(toolPath, ['--version'], (_, stdout, stderr) => {
                resolve({ stdout, stderr });
            });
        } catch (err) {
            reject(err);
        }
    });
}

export function findExecutable(binPath: string): fs.Dirent {
    for (const file of fs.readdirSync(binPath, { withFileTypes: true })) {
        if (file.isFile() && (is.windows ? file.name.split('.').pop() === 'exe' : (file.name.includes('-v') && file.name.split('.').length === 1))) {
            return file;
        }
    }
    return new fs.Dirent();
}