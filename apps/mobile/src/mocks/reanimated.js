'use strict';
// Mock react-native-reanimated — zero dependências externas, compatível com RN Web
let noop = function() {};
let identity = function(x) { return x; };

let makeAnim = function() {
  let a = { build: function() { return function() { return {}; }; } };
  let chain = function() { return a; };
  a.duration = chain; a.delay = chain; a.springify = chain;
  a.damping = chain; a.stiffness = chain; a.mass = chain;
  a.easing = chain; a.withInitialValues = chain;
  return a;
};

// Passthrough components (funções, não strings — para compatibilidade com RN Web)
function AnimView(p) { return p.children || null; }
function AnimText(p) { return p.children || null; }
function AnimImage(p) { return null; }
function AnimScroll(p) { return p.children || null; }
let createAnimatedComponent = function(C) { return C; };

module.exports = {
  __esModule: true,
  default: {
    View: AnimView, Text: AnimText, Image: AnimImage,
    ScrollView: AnimScroll, FlatList: AnimScroll,
    createAnimatedComponent: createAnimatedComponent,
  },
  View: AnimView, Text: AnimText, Image: AnimImage,
  ScrollView: AnimScroll, FlatList: AnimScroll,
  createAnimatedComponent: createAnimatedComponent,
  useSharedValue: function(v) { return { value: v }; },
  useAnimatedStyle: function(fn) { try { return fn(); } catch(e) { return {}; } },
  useDerivedValue: function(fn) { return { value: null }; },
  useAnimatedScrollHandler: function() { return noop; },
  useAnimatedGestureHandler: function() { return noop; },
  useAnimatedRef: function() { return { current: null }; },
  useAnimatedReaction: noop,
  useFrameCallback: noop,
  withTiming: function(v) { return v; },
  withSpring: function(v) { return v; },
  withDelay: function(_, v) { return v; },
  withSequence: function() { return arguments[arguments.length - 1]; },
  withRepeat: function(v) { return v; },
  cancelAnimation: noop,
  runOnJS: identity,
  runOnUI: identity,
  interpolate: function(v, i, o) { return o[0] || 0; },
  interpolateColor: function(v, i, o) { return o[0] || '#000'; },
  Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  Easing: { linear: identity, ease: identity, bezier: function() { return identity; }, in: identity, out: identity, inOut: identity },
  FadeIn: makeAnim(), FadeOut: makeAnim(), FadeInDown: makeAnim(), FadeInUp: makeAnim(),
  FadeOutDown: makeAnim(), FadeOutUp: makeAnim(), SlideInDown: makeAnim(), SlideInUp: makeAnim(),
  SlideOutDown: makeAnim(), SlideOutUp: makeAnim(), ZoomIn: makeAnim(), ZoomOut: makeAnim(),
  BounceIn: makeAnim(), BounceOut: makeAnim(), Layout: makeAnim(), LinearTransition: makeAnim(),
  FlipInEasyX: makeAnim(), FlipOutEasyX: makeAnim(), LightSpeedInRight: makeAnim(), LightSpeedOutRight: makeAnim(),
};
