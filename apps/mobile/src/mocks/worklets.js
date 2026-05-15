'use strict';
// Mock react-native-worklets para web — worklets rodam no JS thread no web
var noop = function() {};
var identity = function(x) { return x; };

module.exports = {
  __esModule: true,
  useWorkletCallback: function(fn) { return fn; },
  createWorklet: identity,
  runOnUI: identity,
  runOnJS: identity,
  makeShareableCloneRecursive: identity,
  makeShareable: identity,
  isWorklet: function() { return false; },
  defaultContext: {},
  WorkletsModule: {},
};
