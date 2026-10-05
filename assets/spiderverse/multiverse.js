// Universe roster and pure helpers for the multiverse hero (spiderverse.jsx).
// Plain JS so node --test can exercise the rotation logic without Babel.
(function (root, factory) {
  var api = factory();
  root.Multiverse = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  // Order alternates dark and light worlds so consecutive cuts read as jumps.
  // `label` is for screen readers only; `tone` tells the nav whether it sits
  // over a light or dark backdrop.
  var UNIVERSES = [
    { id: 'miles', label: 'Comic print', tone: 'dark' },
    { id: 'gwen', label: 'Watercolour', tone: 'light' },
    { id: 'punk', label: 'Punk collage', tone: 'dark' },
    { id: 'peni', label: 'Manga', tone: 'light' },
    { id: 'dunhuang', label: 'Dunhuang mural', tone: 'light' },
    { id: 'toon', label: 'Rubber-hose cartoon', tone: 'light' }
  ];
  var HOLD_MS = 6000;
  var GLITCH_MS = 460;

  // ?uv=gwen pins a universe (and pauses the rotation).
  function indexFromQuery(search) {
    var m = /[?&]uv=([^&#]+)/.exec(search || '');
    if (!m) return -1;
    var key = decodeURIComponent(m[1]).toLowerCase();
    for (var i = 0; i < UNIVERSES.length; i++) {
      if (UNIVERSES[i].id === key) return i;
    }
    return -1;
  }

  function initCycle(search) {
    var pinned = indexFromQuery(search);
    return { index: pinned < 0 ? 0 : pinned, prev: -1, glitching: false, paused: pinned >= 0 };
  }

  function jump(state, index) {
    return { index: index, prev: state.index, glitching: true, paused: state.paused };
  }

  // tick: timer fired · go: visitor picked a universe · settle: the glitch cut
  // finished · toggle: pause / resume the rotation.
  function cycleReducer(state, action) {
    switch (action.type) {
      case 'tick':
        return state.paused ? state : jump(state, (state.index + 1) % UNIVERSES.length);
      case 'go':
        return action.index === state.index ? state : jump(state, action.index);
      case 'settle':
        return state.glitching ? { index: state.index, prev: -1, glitching: false, paused: state.paused } : state;
      case 'toggle':
        return { index: state.index, prev: state.prev, glitching: state.glitching, paused: !state.paused };
      default:
        return state;
    }
  }

  // Projective transform that maps a w x h box onto a quad given as
  // [top-left, top-right, bottom-right, bottom-left] (Heckbert's
  // square-to-quad), as the 16 column-major values of a CSS matrix3d. Used to
  // paint the Miles tag onto the brick wall in the video.
  function quadMatrix(w, h, quad) {
    var x0 = quad[0][0], y0 = quad[0][1], x1 = quad[1][0], y1 = quad[1][1];
    var x2 = quad[2][0], y2 = quad[2][1], x3 = quad[3][0], y3 = quad[3][1];
    var sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
    var dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
    var det = dx1 * dy2 - dx2 * dy1;
    var g = (sx * dy2 - dx2 * sy) / det, k = (dx1 * sy - sx * dy1) / det;
    var a = x1 - x0 + g * x1, b = x3 - x0 + k * x3, d = y1 - y0 + g * y1, e = y3 - y0 + k * y3;
    return [a / w, d / w, 0, g / w, b / h, e / h, 0, k / h, 0, 0, 1, 0, x0, y0, 0, 1];
  }

  return {
    UNIVERSES: UNIVERSES,
    HOLD_MS: HOLD_MS,
    GLITCH_MS: GLITCH_MS,
    indexFromQuery: indexFromQuery,
    initCycle: initCycle,
    cycleReducer: cycleReducer,
    quadMatrix: quadMatrix
  };
});
