'use strict';
// Mock expo-av para web
const noop = async () => {};
const Audio = {
  requestPermissionsAsync: async () => ({ status: 'denied', granted: false }),
  setAudioModeAsync: noop,
  Recording: class MockRecording {
    async prepareToRecordAsync() {}
    async startAsync() {}
    async stopAndUnloadAsync() {}
    getURI() { return null; }
  },
  Sound: { createAsync: async () => ({ sound: { playAsync: noop, stopAsync: noop, unloadAsync: noop, setVolumeAsync: noop } }) },
};
Audio.Recording.RECORDING_OPTIONS_PRESET_HIGH_QUALITY = {};
Audio.Recording.RECORDING_OPTIONS_PRESET_LOW_QUALITY = {};
const Video = () => null;
module.exports = { __esModule: true, Audio, Video, AVPlaybackStatus: {}, InterruptionModeIOS: { DoNotMix: 0 }, InterruptionModeAndroid: { DoNotMix: 1 } };
