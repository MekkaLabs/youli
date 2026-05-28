'use strict';
// Mock react-native-svg — zero dependências externas
let noop = function() { return null; };
module.exports = {
  __esModule: true, default: 'div', Svg: 'div',
  Circle: noop, Rect: noop, Path: noop, Line: noop, Polygon: noop, Polyline: noop, Ellipse: noop,
  Text: 'span', TSpan: 'span', G: 'div', Defs: noop, LinearGradient: noop, RadialGradient: noop,
  Stop: noop, ClipPath: noop, Mask: noop, Pattern: noop, Use: noop, Symbol: noop, Image: noop, ForeignObject: 'div',
};
