module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated 4 usa react-native-worklets/plugin (deve ser o ÚLTIMO)
      'react-native-worklets/plugin',
    ],
  };
};
