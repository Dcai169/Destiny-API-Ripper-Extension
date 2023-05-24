const path = require('node:path');
const {spawnSync} = require('node:child_process');
const packageJson = require('./package.json');

module.exports = {
  // eslint-disable-next-line camelcase
  make_targets: {
    win32: [
      'zip',
    ],
    darwin: [
      'dmg',
      'zip',
    ],
    linux: [
      'deb',
      'rpm',
    ],
  },
  packagerConfig: {
    packageManager: 'npm',
    executableName: 'destiny-api-ripper-extension',
    icon: 'src/styles/icons/icon_outline',
    overwrite: true,
    asar: {
      unpackDir: 'node_modules/7zip-bin',
    },
    ignore: [
      '.git',
      '.vscode',
      '.idea',
      'src/extraResources',
    ],
    extraResource: [
      'src/extraResources/Destiny 1 Item Definition',
    ],
  },
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: [
        'win32',
        'darwin',
      ],
      config: {
        name: 'destiny-api-ripper-extension',
      },
    },
    {
      name: '@electron-forge/maker-deb',
      platforms: [
        'linux',
      ],
      config: {
        name: 'destiny-api-ripper-extension',
        maintainer: 'Daniel Cai',
        homepage: 'https://github.com/Dcai169/Destiny-API-Ripper-Extension',
      },
    },
  ],
  hooks: {
    async prePackage(forgeConfig, platform) {
      if (platform === 'win32') {
        spawnSync('powershell.exe',
          ['Get-ChildItem -Directory ./out | Where-Object -FilterScript {$_.name -match "win32"} | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue']);
      } else {
        spawnSync('find', ['out', '-maxdepth', '1', '-name', '*' + platform + '*', '-type', 'd', '-exec', 'rm', '-rf', '{}', ';']);
      }
    },
    async postPackage(forgeConfig, options) {
      const oldPath = options.outputPaths[0];
      if (options.platform === 'win32') {
        const newName = oldPath.split('\\\\').pop().replaceAll(' ', '.') + '-' + packageJson.version;
        spawnSync('powershell.exe', [`Rename-Item '${oldPath}' '${newName}'`]);
      } else {
        const newPath = path.join(path.resolve(oldPath, '../'), oldPath
          .replace(/\/$/, '')
          .split('/')
          .pop()
          .replaceAll(' ', '.') + '-' + packageJson.version);
        spawnSync('mv', [oldPath, newPath]);
        spawnSync('find', [newPath, '-name', '7za', '-o', '-name', '7x.sh', '-exec', 'chmod', '+x', '{}', ';']);
      }
    },
  },
};
