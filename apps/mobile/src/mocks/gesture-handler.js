'use strict';
// Mock react-native-gesture-handler — zero dependências, componentes como funções
var noop = function() {};

// Wrapper que só renderiza children (funciona sem import React no React 17+)
function passthrough(props) { return props.children || null; }
function passtouchable(props) { return props.children || null; }

module.exports = {
  __esModule: true,
  GestureHandlerRootView: passthrough,
  GestureDetector: function(props) { return props.children || null; },
  Gesture: {
    Tap: function() {
      var g = {};
      var chain = function() { return g; };
      g.onEnd = chain; g.onBegin = chain; g.numberOfTaps = chain; g.maxDuration = chain; g.onStart = chain;
      return g;
    },
    Pan: function() {
      var g = {};
      var chain = function() { return g; };
      g.onUpdate = chain; g.onEnd = chain; g.onBegin = chain; g.minDistance = chain; g.activeOffsetX = chain;
      return g;
    },
    Pinch: function() { return {}; },
    Rotation: function() { return {}; },
    Race: function() { return arguments[0]; },
    Simultaneous: function() { return arguments[0]; },
    Exclusive: function() { return arguments[0]; },
  },
  PanGestureHandler: passthrough,
  TapGestureHandler: passthrough,
  PinchGestureHandler: passthrough,
  RotationGestureHandler: passthrough,
  LongPressGestureHandler: passthrough,
  FlingGestureHandler: passthrough,
  NativeViewGestureHandler: passthrough,
  RawButton: passtouchable,
  BaseButton: passtouchable,
  RectButton: passtouchable,
  BorderlessButton: passtouchable,
  Swipeable: passthrough,
  DrawerLayout: passthrough,
  ScrollView: passthrough,
  FlatList: passthrough,
  State: { UNDETERMINED: 0, FAILED: 1, BEGAN: 2, CANCELLED: 3, ACTIVE: 4, END: 5 },
  Directions: { RIGHT: 1, LEFT: 2, UP: 4, DOWN: 8 },
  TouchableOpacity: passtouchable,
  TouchableHighlight: passtouchable,
  TouchableNativeFeedback: passthrough,
  useGestureHandler: function() { return {}; },
};
