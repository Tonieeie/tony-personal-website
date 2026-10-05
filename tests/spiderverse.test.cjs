const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const GlitchRift = require('../assets/spiderverse/rift.js');
const Multiverse = require('../assets/spiderverse/multiverse.js');

// Records every drawing call so paint functions can run without a canvas.
function mockContext() {
  const calls = [];
  const gradient = { addColorStop() {} };
  return new Proxy({ calls }, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'createRadialGradient' || key === 'createLinearGradient') return () => gradient;
      return (...args) => { calls.push(key); };
    },
    set(target, key, value) { target[key] = value; return true; }
  });
}

test('mulberry32 is deterministic and stays in [0, 1)', () => {
  const a = GlitchRift.mulberry32(42), b = GlitchRift.mulberry32(42);
  for (let i = 0; i < 200; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
});

test('riftBlob breathes within its lobe + jitter envelope', () => {
  const opts = { cx: 50, cy: 40, r: 20, n: 32, lobes: 0.14, jitter: 0.05 };
  for (let t = 0; t < 5; t += 0.37) {
    const pts = GlitchRift.riftBlob(GlitchRift.mulberry32(7), { ...opts, t });
    assert.equal(pts.length, 32);
    for (const [x, y] of pts) {
      const d = Math.hypot(x - 50, y - 40);
      assert.ok(d >= 20 * 0.81 - 1e-9 && d <= 20 * 1.19 + 1e-9, `radius ${d} out of envelope`);
    }
  }
  assert.deepEqual(
    GlitchRift.riftBlob(GlitchRift.mulberry32(3), opts),
    GlitchRift.riftBlob(GlitchRift.mulberry32(3), opts)
  );
});

test('paintRift and paintGlitchBars draw without a real canvas', () => {
  const state = { intensity: 1.5, coreScale: 0.3, phase: 1, tearing: true, specks: [{ a: 0, d: 1.3, s: 1, v: 0.05, ink: 2 }] };
  const ctx = mockContext();
  GlitchRift.paintRift(ctx, GlitchRift.mulberry32(1), 300, 300, 12, state);
  assert.ok(ctx.calls.filter(c => c === 'fill').length >= 4, 'plates + core are filled');
  assert.ok(ctx.calls.includes('clip'));
  const bars = mockContext();
  GlitchRift.paintGlitchBars(bars, GlitchRift.mulberry32(2), 1280, 800, 14);
  assert.ok(bars.calls.filter(c => c === 'fillRect').length >= 14);
});

test('glitch atlas ships next to the renderer, one tile per universe', () => {
  const atlas = path.join(root, 'assets/spiderverse/glitch-atlas.webp');
  assert.ok(fs.existsSync(atlas) && fs.statSync(atlas).size < 200 * 1024, 'atlas present and small');
  const src = read('assets/spiderverse/rift.js');
  assert.match(src, /glitch-atlas\.webp/);
  assert.match(src, /ATLAS_TILES = 6/);
  assert.equal(Multiverse.UNIVERSES.length, 6, 'atlas tiles follow the roster');
  // Without the atlas (as in Node) both painters fall back to flat ink.
  const ctx = mockContext();
  GlitchRift.paintGlitchBars(ctx, GlitchRift.mulberry32(9), 800, 600, 10, { live: true, tiles: [0, 1] });
  assert.ok(ctx.calls.includes('fillRect') && !ctx.calls.includes('drawImage'));
});

test('universe roster: six worlds, Miles first, the cartoon last, 6 s each', () => {
  const { UNIVERSES } = Multiverse;
  assert.deepEqual(UNIVERSES.map(u => u.id), ['miles', 'gwen', 'punk', 'peni', 'dunhuang', 'toon']);
  for (const u of UNIVERSES) {
    assert.ok(u.tone === 'light' || u.tone === 'dark');
    assert.ok(u.label, 'screen-reader label');
  }
  assert.equal(Multiverse.HOLD_MS, 6000);
});

test('?uv= pins a universe by id and pauses rotation', () => {
  assert.equal(Multiverse.indexFromQuery('?uv=gwen'), 1);
  assert.equal(Multiverse.indexFromQuery('?nointro&uv=dunhuang'), 4);
  assert.equal(Multiverse.indexFromQuery('?uv=punk'), 2);
  assert.equal(Multiverse.indexFromQuery('?uv=noir'), -1, 'removed universes no longer resolve');
  assert.equal(Multiverse.indexFromQuery(''), -1);
  assert.deepEqual(Multiverse.initCycle('?uv=peni'), { index: 3, prev: -1, glitching: false, paused: true });
  assert.deepEqual(Multiverse.initCycle(''), { index: 0, prev: -1, glitching: false, paused: false });
});

test('cycle reducer advances, wraps, jumps, settles and pauses', () => {
  const step = Multiverse.cycleReducer;
  let s = Multiverse.initCycle('');
  s = step(s, { type: 'tick' });
  assert.deepEqual(s, { index: 1, prev: 0, glitching: true, paused: false });
  s = step(s, { type: 'settle' });
  assert.deepEqual(s, { index: 1, prev: -1, glitching: false, paused: false });
  assert.equal(step(s, { type: 'settle' }), s, 'settling twice is a no-op');

  const last = { index: 5, prev: -1, glitching: false, paused: false };
  assert.equal(step(last, { type: 'tick' }).index, 0, 'wraps to the first universe');

  const paused = step(s, { type: 'toggle' });
  assert.equal(paused.paused, true);
  assert.equal(step(paused, { type: 'tick' }), paused, 'ticks are ignored while paused');
  const jumped = step(paused, { type: 'go', index: 4 });
  assert.deepEqual(jumped, { index: 4, prev: 1, glitching: true, paused: true }, 'manual jumps work while paused');
  assert.equal(step(jumped, { type: 'go', index: 4 }), jumped, 'jumping to the current universe is a no-op');
});

test('quadMatrix maps the tag box corners onto the wall quad', () => {
  const quad = [[1330, 459], [1700, 323], [1700, 731], [1330, 756]];
  const m = Multiverse.quadMatrix(360, 250, quad);
  assert.equal(m.length, 16);
  // CSS matrix3d is column-major: x' = m0 X + m4 Y + m12, w' = m3 X + m7 Y + m15.
  const project = (X, Y) => {
    const w = m[3] * X + m[7] * Y + m[15];
    return [(m[0] * X + m[4] * Y + m[12]) / w, (m[1] * X + m[5] * Y + m[13]) / w];
  };
  [[0, 0], [360, 0], [360, 250], [0, 250]].forEach(([X, Y], i) => {
    const [x, y] = project(X, Y);
    assert.ok(Math.abs(x - quad[i][0]) < 1e-6 && Math.abs(y - quad[i][1]) < 1e-6, `corner ${i}`);
  });
  const [cx] = project(180, 125);
  assert.ok(cx < 1515, 'perspective: the far (left) half is foreshortened');
});

test('parallax layers declare a depth', () => {
  const jsx = read('assets/spiderverse/spiderverse.jsx');
  const css = read('assets/spiderverse/spiderverse.css');
  assert.match(css, /\.sv-px \{ transform: translate3d\(calc\(var\(--px\) \* var\(--d, 0\)/);
  assert.ok((jsx.match(/sv-px/g) || []).length >= 20, 'layers across the universes are tagged');
  assert.match(jsx, /\(hover: hover\) and \(pointer: fine\)/, 'mouse/trackpad only');
});

test('hero shows no universe labels', () => {
  const jsx = read('assets/spiderverse/spiderverse.jsx');
  assert.ok(!jsx.includes('uv-caption'), 'caption removed');
  assert.ok(!/title={/.test(jsx.slice(jsx.indexOf('function UniverseSwitcher'))), 'no hover tooltips on the dots');
  assert.ok(!/Earth-d/.test(jsx.slice(jsx.indexOf('function UniverseSwitcher'))), 'no Earth numbers in the switcher');
});

test('every universe has scene decor and styles', () => {
  const jsx = read('assets/spiderverse/spiderverse.jsx');
  const css = read('assets/spiderverse/spiderverse.css');
  const decor = jsx.match(/const UV_DECOR = \{([^}]*)\}/)[1];
  for (const { id } of Multiverse.UNIVERSES) {
    assert.match(decor, new RegExp(`(^|[\\s,{])${id}:`), `decor for ${id}`);
    assert.ok(css.includes(`.uv-${id} {`), `scene background for ${id}`);
  }
});

test('index.html bundle loads the Spider-Verse layer', () => {
  const html = read('index.html');
  const open = '<script type="__bundler/template">\n';
  const start = html.indexOf(open) + open.length;
  const raw = html.slice(start, html.indexOf('\n  </script>', start));
  assert.ok(!raw.includes('</script'), 'template JSON escapes </script');
  const tpl = JSON.parse(raw);
  for (const needle of [
    'href="./assets/spiderverse/spiderverse.css"',
    '<script src="./assets/spiderverse/rift.js"></script>',
    '<script src="./assets/spiderverse/multiverse.js"></script>',
    'src="./assets/spiderverse/spiderverse.jsx"',
    '<MultiverseHero role={role} />',
    '<li className="nav-virus"><RiftLink /></li>',
    '"theme": "spiderverse"'
  ]) assert.ok(tpl.includes(needle), needle);
  assert.ok(!tpl.includes('M16 3 C8.5 3'), 'skull icon removed');
  assert.ok(!tpl.includes('function MatrixRain'), 'matrix rain removed');
  assert.ok(html.includes('id="__intro_rift"'), 'intro has the rift canvas');
  assert.ok(html.includes('<script defer src="./assets/spiderverse/rift.js"></script>'), 'intro preloads the rift');
});

test('404 page loads the rift from an absolute path', () => {
  const page = read('404.html');
  assert.ok(page.includes('<script src="/assets/spiderverse/rift.js"></script>'));
  for (const cmd of ['help:', 'ls:', 'cd:', 'home:', 'whoami:', 'contact:', 'github:', 'sudo:', 'clear:', 'exit:']) {
    assert.ok(page.includes(cmd), `command ${cmd} kept`);
  }
});
