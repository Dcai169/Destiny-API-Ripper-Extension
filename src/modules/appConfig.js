const store = require('electron-store');

const schema = {
  outputPath: {
    type: 'string',
    default: '',
  },
  dcgPath: {
    type: 'string',
    default: '',
  },
  locale: {
    type: 'string',
    enum: ['de', 'en', 'es', 'es-mx', 'fr', 'it', 'ja', 'ko', 'pl', 'pt-br', 'ru', 'zh-chs', 'zh-cht'],
    default: 'en',
  },
  aggregateOutput: {
    type: 'boolean',
    default: true,
  },
  mdePath: {
    type: 'string',
    default: '',
  },
  pkgPath: {
    type: 'string',
    default: '',
  },
  ripHDTextures: {
    type: 'boolean',
    default: false,
  },
  ripShaders: {
    type: 'boolean',
    default: false,
  },
  blenderConnector: {
    type: 'boolean',
    default: false,
  },
  loadThumbnails: {
    type: 'boolean',
    default: true,
  },
  d2ManifestVersionOnLastStartup: {
    type: 'string',
    default: '',
  },
};

// eslint-disable-next-line new-cap
module.exports = {appConfig: new store({schema})};
