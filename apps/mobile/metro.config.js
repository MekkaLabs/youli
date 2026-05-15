const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const ROOT = path.resolve(__dirname, '../../');
const LOCAL = path.resolve(__dirname, 'node_modules');

// ─── BlockList: impede Metro de usar react-native da raiz (versão errada) ────
const rootRN  = path.resolve(ROOT, 'node_modules/react-native');
const rootReact = path.resolve(ROOT, 'node_modules/react');

// Escapa barras para usar em RegExp
const esc = (p) => p.replace(/[/\\]/g, '[/\\\\]');

// Merge com o blockList já definido pelo Expo (ex: .expo/types)
const existingBlockList = Array.isArray(config.resolver.blockList)
  ? config.resolver.blockList
  : config.resolver.blockList
    ? [config.resolver.blockList]
    : [];

config.resolver.blockList = [
  ...existingBlockList,
  new RegExp(`^${esc(rootRN)}[/\\\\].*`),
  new RegExp(`^${esc(rootReact)}[/\\\\].*`),
];

// ─── Mocks para plataforma web ────────────────────────────────────────────────
const WEB_MOCKS = {
  'react-native-reanimated':                   path.resolve(__dirname, 'src/mocks/reanimated.js'),
  'react-native-worklets':                     path.resolve(__dirname, 'src/mocks/worklets.js'),
  'react-native-gesture-handler':              path.resolve(__dirname, 'src/mocks/gesture-handler.js'),
  'react-native-svg':                          path.resolve(__dirname, 'src/mocks/svg.js'),
  '@react-native-async-storage/async-storage': path.resolve(__dirname, 'src/mocks/async-storage.js'),
  'expo-av':                                   path.resolve(__dirname, 'src/mocks/expo-av.js'),
  'expo-notifications':                        path.resolve(__dirname, 'src/mocks/expo-notifications.js'),
};

config.resolver.resolveRequest = function (context, moduleName, platform) {
  // Web mocks
  if (platform === 'web' && Object.prototype.hasOwnProperty.call(WEB_MOCKS, moduleName)) {
    return { filePath: WEB_MOCKS[moduleName], type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
