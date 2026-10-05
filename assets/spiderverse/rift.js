// Dimensional-glitch renderer shared by the nav icon, the intro, the 404 page
// and the hero's universe cut. Modelled on the film's anomaly glitches, which
// are corrupted *pictures*, not vector shapes: a breathing black hole with a
// stepped, low-res edge and a chromatic rim, and around it scraps torn out of
// the other universes (glitch-atlas.webp) — colour plates split apart, pixel
// columns smeared into streaks, compression macroblocks, polygonal shards and
// horizontal slips. Animated "on twos" (12 fps). Without the atlas (or in
// tests) it falls back to flat ink plates. Plain JS so 404.html can load it
// without Babel; loading it twice is a no-op.
(function (root, factory) {
  var api = root.GlitchRift || factory(root);
  root.GlitchRift = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  var PLATES = ['#ff2bd6', '#00e5ff', '#ffe600'];
  var BLOCKS = ['#ff2bd6', '#00e5ff', '#ffe600', '#ffffff', '#ff2a3d'];
  var RAYS = ['rgba(255, 43, 214, ', 'rgba(0, 229, 255, ', 'rgba(255, 42, 61, ', 'rgba(150, 90, 255, '];
  var TAU = Math.PI * 2;
  // glitch-atlas.webp: the six universes in roster order, 3 x 2 tiles.
  var ATLAS_COLS = 3, ATLAS_ROWS = 2, ATLAS_TILES = 6;

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ── Atlas: loaded once, on first use, next to this script ────────────────
  var scriptDir = (function () {
    try {
      var s = root.document && root.document.currentScript;
      if (s && s.src && !/^blob:/.test(s.src)) return s.src.replace(/[^/]*$/, '');
    } catch (e) { /* ignore */ }
    return './assets/spiderverse/';
  })();
  var atlas = { state: 'idle', img: null, red: null, cyan: null, tw: 0, th: 0, waiters: [] };

  // Red-only and cyan-only copies, so a fragment can be printed as two plates.
  function tinted(img, colour) {
    var c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    var x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'multiply';
    x.fillStyle = colour;
    x.fillRect(0, 0, c.width, c.height);
    return c;
  }

  function loadAtlas(url, done) {
    if (atlas.state === 'ready') { if (done) done(); return; }
    if (done) atlas.waiters.push(done);
    if (atlas.state !== 'idle' || typeof Image === 'undefined' || !root.document) return;
    atlas.state = 'loading';
    var img = new Image();
    img.decoding = 'async';
    img.onload = function () {
      atlas.img = img;
      atlas.red = tinted(img, '#ff0000');
      atlas.cyan = tinted(img, '#00ffff');
      atlas.tw = img.naturalWidth / ATLAS_COLS;
      atlas.th = img.naturalHeight / ATLAS_ROWS;
      atlas.state = 'ready';
      var q = atlas.waiters;
      atlas.waiters = [];
      for (var i = 0; i < q.length; i++) q[i]();
    };
    img.onerror = function () { atlas.state = 'failed'; atlas.waiters = []; };
    img.src = url || scriptDir + 'glitch-atlas.webp';
  }

  // rift-core.webp: the tunnel seen down the hole (prismatic layers around a
  // white-hot far end), zoomed and smeared in code.
  var core = { state: 'idle', img: null, waiters: [] };
  function loadCore(url, done) {
    if (core.state === 'ready') { if (done) done(); return; }
    if (done) core.waiters.push(done);
    if (core.state !== 'idle' || typeof Image === 'undefined' || !root.document) return;
    core.state = 'loading';
    var img = new Image();
    img.decoding = 'async';
    img.onload = function () {
      core.img = img;
      core.state = 'ready';
      var q = core.waiters;
      core.waiters = [];
      for (var i = 0; i < q.length; i++) q[i]();
    };
    img.onerror = function () { core.state = 'failed'; core.waiters = []; };
    img.src = url || scriptDir + 'rift-core.webp';
  }

  // rift-tunnel.webm/mp4: the hexagonal portal rushing toward the viewer. One
  // shared muted video, created the first time a big rift is on screen and
  // played only while at least one is; rifts fall back to rift-core.webp
  // until it has a frame (or if the browser will not autoplay it).
  var tunnel = { video: null, users: 0 };
  function wantTunnel(on) {
    if (!root.document || !root.document.body) return;
    tunnel.users = Math.max(0, tunnel.users + (on ? 1 : -1));
    if (on && !tunnel.video) {
      var nv = document.createElement('video');
      nv.muted = true;
      nv.loop = true;
      nv.playsInline = true;
      nv.preload = 'auto';
      nv.setAttribute('muted', '');
      nv.setAttribute('playsinline', '');
      nv.setAttribute('aria-hidden', 'true');
      nv.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0.01;pointer-events:none;z-index:-1';
      ['webm', 'mp4'].forEach(function (ext) {
        var src = document.createElement('source');
        src.src = scriptDir + 'rift-tunnel.' + ext;
        src.type = 'video/' + ext;
        nv.appendChild(src);
      });
      document.body.appendChild(nv);
      tunnel.video = nv;
    }
    var v = tunnel.video;
    if (!v) return;
    if (tunnel.users > 0) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause();
  }
  function liteNetwork() {
    var c = root.navigator && root.navigator.connection;
    return !!(c && (c.saveData || /^(slow-2g|2g|3g)$/.test(c.effectiveType || '')));
  }
  function tunnelFrame() {
    var v = tunnel.video;
    return v && v.readyState >= 2 && !v.paused ? v : null;
  }

  function pickTile(rng, tiles) {
    return tiles && tiles.length ? tiles[(rng() * tiles.length) | 0] : (rng() * ATLAS_TILES) | 0;
  }

  // A random source rect (sw x sh atlas pixels) inside one universe's tile.
  function tileRect(rng, tile, sw, sh) {
    var col = tile % ATLAS_COLS, row = (tile / ATLAS_COLS) | 0;
    sw = Math.max(1, Math.min(sw, atlas.tw - 2));
    sh = Math.max(1, Math.min(sh, atlas.th - 2));
    return [col * atlas.tw + 1 + rng() * (atlas.tw - sw - 2), row * atlas.th + 1 + rng() * (atlas.th - sh - 2), sw, sh];
  }

  // A fragment printed as two plates slid apart: red one way, cyan the other.
  function splitFragment(ctx, s, dx, dy, dw, dh, off) {
    var prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(atlas.red, s[0], s[1], s[2], s[3], dx - off, dy, dw, dh);
    ctx.drawImage(atlas.cyan, s[0], s[1], s[2], s[3], dx + off, dy, dw, dh);
    ctx.globalCompositeOperation = prev;
  }

  // Datamosh streak: a single pixel column of a picture dragged into a bar.
  function smear(ctx, rng, tile, dx, dy, dw, dh) {
    var s = tileRect(rng, tile, 1, Math.max(1, Math.min(6, dh / 2)));
    ctx.drawImage(atlas.img, s[0], s[1], 1, s[3], dx, dy, dw, dh);
  }

  // Compression macroblock: a 3 x 3 patch blown up with no smoothing.
  function macroblock(ctx, rng, tile, dx, dy, size) {
    var s = tileRect(rng, tile, 3, 3);
    ctx.drawImage(atlas.img, s[0], s[1], 3, 3, dx, dy, size, size);
  }

  // ── Shapes ────────────────────────────────────────────────────────────────
  // Outline: three travelling sine lobes (an elongating 2-lobe stretch, a
  // 3-lobe and a 5-lobe ripple, driven by `t`) plus per-vertex jitter, so the
  // hole keeps changing shape. Every point stays within r * (1 ± (lobes + jitter)).
  function riftBlob(rng, opts) {
    var cx = opts.cx || 0, cy = opts.cy || 0, r = opts.r, n = opts.n || 30;
    var t = opts.t || 0, phase = opts.phase || 0;
    var lobes = opts.lobes == null ? 0.14 : opts.lobes;
    var jitter = opts.jitter == null ? 0.05 : opts.jitter;
    var pts = [];
    for (var i = 0; i < n; i++) {
      var a = (i / n) * TAU;
      var wave = Math.sin(a * 2 + t * 1.1 + phase) * 0.45 + Math.sin(a * 3 - t * 1.7 + phase * 1.7) * 0.35 + Math.sin(a * 5 + t * 2.6 + phase * 2.3) * 0.2;
      var d = r * (1 + lobes * wave + (rng() - 0.5) * 2 * jitter);
      pts.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d]);
    }
    return pts;
  }

  // Hexagonal outline, like the film's portals: six corners that breathe in
  // and out on their own clocks, a slow turn, and edges split into `sub`
  // segments whose points jitter so the rim boils. Same point count and
  // conventions as riftBlob, so everything downstream works on either.
  function riftHex(rng, opts) {
    var cx = opts.cx || 0, cy = opts.cy || 0, r = opts.r, t = opts.t || 0, phase = opts.phase || 0;
    var lobes = opts.lobes == null ? 0.14 : opts.lobes, jitter = opts.jitter == null ? 0.05 : opts.jitter;
    var sub = opts.sub || 3, rot = (opts.rot == null ? -Math.PI / 2 : opts.rot) + t * 0.05;
    var corners = [];
    for (var k = 0; k < 6; k++) {
      var a = rot + (k / 6) * TAU, d = r * (1 + lobes * Math.sin(t * (1.1 + k * 0.23) + phase + k * 1.7));
      corners.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d]);
    }
    var pts = [];
    for (var c = 0; c < 6; c++) {
      var p = corners[c], q = corners[(c + 1) % 6];
      for (var e = 0; e < sub; e++) {
        var u = e / sub, x = p[0] + (q[0] - p[0]) * u, y = p[1] + (q[1] - p[1]) * u;
        var dx = x - cx, dy = y - cy, dl = Math.hypot(dx, dy) || 1, j = (rng() - 0.5) * 2 * jitter * r;
        pts.push([x + (dx / dl) * j, y + (dy / dl) * j]);
      }
    }
    return pts;
  }

  function trace(ctx, pts, dx, dy, scale) {
    var k = scale || 1;
    ctx.beginPath();
    ctx.moveTo((pts[0][0] + (dx || 0)) * k, (pts[0][1] + (dy || 0)) * k);
    for (var i = 1; i < pts.length; i++) ctx.lineTo((pts[i][0] + (dx || 0)) * k, (pts[i][1] + (dy || 0)) * k);
    ctx.closePath();
  }

  // The outline shrunk by `k` about (cx, cy) and re-centred on (vx, vy).
  function traceToward(ctx, pts, cx, cy, vx, vy, k, dx) {
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++) {
      var x = vx + (pts[i][0] - cx) * k + (dx || 0), y = vy + (pts[i][1] - cy) * k;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
  }

  // Flat-ink debris for the fallback: a bar, a misprinted black bar or a scrap
  // of halftone.
  function paintBlock(ctx, rng, x, y, bw, bh) {
    var kind = rng();
    if (kind < 0.55) {
      ctx.fillStyle = BLOCKS[(rng() * BLOCKS.length) | 0];
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x, y, bw, bh);
    } else if (kind < 0.8) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = PLATES[(rng() * 3) | 0];
      ctx.fillRect(x - 1, y, bw, bh);
      ctx.fillStyle = '#000';
      ctx.fillRect(x, y, bw, bh);
    } else {
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = PLATES[(rng() * 3) | 0];
      var step = Math.max(2, bh / 2);
      for (var dy = step / 2; dy < bh; dy += step) {
        for (var dx = step / 2; dx < bw; dx += step) ctx.fillRect(x + dx, y + dy, Math.max(1, step * 0.45), Math.max(1, step * 0.45));
      }
    }
    ctx.globalAlpha = 1;
  }

  // ── The rift ──────────────────────────────────────────────────────────────
  // state: intensity, coreScale, phase, tearing, specks; mount() adds
  // `live` (use the atlas), `tiles` (which universes bleed through) and `lo`
  // (a scratch canvas for the stepped edge).
  function paintRift(ctx, rng, w, h, frame, state) {
    var k = state.intensity;
    var cx = w / 2, cy = h / 2;
    var R = Math.min(w, h) * state.coreScale;
    var unit = Math.max(1, R / 12);
    // Print-scale details stay a few pixels wide however big the hole gets.
    var fine = Math.min(unit, 3.5);
    var t = frame / 12;
    var tear = state.tearing ? 1 : 0;
    // A hexagon, like the film's portals, whose corners breathe and whose
    // edges boil on every frame.
    var blob = riftHex(rng, { cx: cx, cy: cy, r: R * 1.06, t: t, phase: state.phase, lobes: 0.16 + 0.05 * tear, jitter: 0.035 + 0.025 * k });
    // Tear frames snap a run of vertices out into a spike or in as a dent.
    if (tear) {
      var at = (rng() * blob.length) | 0, push = (rng() < 0.6 ? 0.32 : -0.24) * R;
      for (var v = 0; v < 3; v++) {
        var pv = blob[(at + v) % blob.length], dv = Math.hypot(pv[0] - cx, pv[1] - cy) || 1, kv = v === 1 ? 1 : 0.5;
        pv[0] += ((pv[0] - cx) / dv) * push * kv;
        pv[1] += ((pv[1] - cy) / dv) * push * kv;
      }
    }
    var live = state.live && atlas.state === 'ready';
    ctx.imageSmoothingEnabled = false;

    // Soft light rays burst out from behind the hole (big rifts only): wide
    // fading wedges in plate colours, a new spray every frame.
    if (R >= 20) {
      var rayMax = Math.min(w, h) * 0.49;
      ctx.globalCompositeOperation = 'lighter';
      for (var ry = 0; ry < 12; ry++) {
        var ra = rng() * TAU, rw = 0.015 + rng() * 0.05, r0 = R * 0.6, r1 = Math.min(rayMax, R * (1.5 + rng() * 0.9));
        if (r1 <= r0) continue;
        var rc = RAYS[(rng() * RAYS.length) | 0], rg = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
        rg.addColorStop(0, rc + (0.25 + rng() * 0.3).toFixed(2) + ')');
        rg.addColorStop(1, rc + '0)');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ra - rw * 0.3) * r0, cy + Math.sin(ra - rw * 0.3) * r0);
        ctx.lineTo(cx + Math.cos(ra - rw) * r1, cy + Math.sin(ra - rw) * r1);
        ctx.lineTo(cx + Math.cos(ra + rw) * r1, cy + Math.sin(ra + rw) * r1);
        ctx.lineTo(cx + Math.cos(ra + rw * 0.3) * r0, cy + Math.sin(ra + rw * 0.3) * r0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    if (live) {
      // Scraps of other worlds cling to the rim, plates split, a new handful
      // every frame. Sources are magnified ~unit x, so the bigger the rift the
      // chunkier the pixels.
      var n = Math.round((12 + rng() * 8) * (0.7 + 0.3 * k) * (1 + 0.6 * tear));
      for (var f = 0; f < n; f++) {
        var fa = rng() * TAU, fd = R * (0.92 + rng() * 0.6);
        var fw = R * (0.2 + rng() * 0.6), fh = Math.max(fine, fw * (0.1 + rng() * 0.4));
        var mag = Math.max(1, unit * (0.18 + rng() * 0.55));
        var src = tileRect(rng, pickTile(rng, state.tiles), fw / mag, fh / mag);
        ctx.globalAlpha = 0.85 + rng() * 0.15;
        splitFragment(ctx, src, cx + Math.cos(fa) * fd - fw / 2, cy + Math.sin(fa) * fd - fh / 2, fw, fh, fine * (0.7 + rng() * 1.4) * (1 + tear));
      }
      // Pixel smears streaming off the rim, sideways like a dragged frame.
      var streaks = Math.round((3 + rng() * 4) * (0.6 + 0.4 * k) * (1 + tear));
      for (var s = 0; s < streaks; s++) {
        var sa = rng() * TAU, sx = cx + Math.cos(sa) * R * 0.85, sy = cy + Math.sin(sa) * R * (0.4 + rng() * 0.6);
        var len = R * (0.35 + rng() * 1.1) * (Math.cos(sa) < 0 ? -1 : 1);
        ctx.globalAlpha = 0.55 + rng() * 0.45;
        smear(ctx, rng, pickTile(rng, state.tiles), Math.min(sx, sx + len), sy, Math.abs(len), fine * (0.5 + rng() * 1.8));
      }
      // Polygonal shards with another universe inside, on tear frames.
      if (tear) {
        for (var p = 0; p < 2; p++) {
          var pa = rng() * TAU, pd = R * (1 + rng() * 0.35), ps = R * (0.25 + rng() * 0.3);
          var px0 = cx + Math.cos(pa) * pd, py0 = cy + Math.sin(pa) * pd;
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(px0, py0 - ps * 0.6);
          ctx.lineTo(px0 + ps * (0.4 + rng() * 0.5), py0 + ps * 0.4);
          ctx.lineTo(px0 - ps * (0.4 + rng() * 0.5), py0 + ps * (0.1 + rng() * 0.4));
          ctx.closePath();
          ctx.clip();
          ctx.globalAlpha = 0.95;
          var pm = Math.max(1, unit * 0.3);
          splitFragment(ctx, tileRect(rng, pickTile(rng, state.tiles), ps * 1.4 / pm, ps * 1.2 / pm), px0 - ps * 0.7, py0 - ps * 0.6, ps * 1.4, ps * 1.2, fine);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
    }

    // The silhouette printed out of register (three ink plates), then the hole
    // itself in pure black — all drawn at low resolution and blown up, so the
    // edges step like a corrupted frame instead of a clean vector curve.
    var off = fine * (live ? 0.9 + 0.6 * k : 0.55 + 0.45 * k) * (tear ? 2.2 : 1);
    var shifts = [[-off, 0], [off, off * 0.25], [0, off * 0.8]];
    var silhouettes = function (c, scale) {
      for (var i = 0; i < 3; i++) {
        c.globalAlpha = 0.9;
        c.fillStyle = PLATES[i];
        trace(c, blob, shifts[i][0], shifts[i][1], scale);
        c.fill();
      }
      c.globalAlpha = 1;
      c.fillStyle = '#000';
      trace(c, blob, 0, 0, scale);
      c.fill();
    };
    var step = Math.max(1, Math.round(fine * 0.9));
    if (state.lo && step > 1) {
      var lo = state.lo, lw = Math.ceil(w / step) + 1, lh = Math.ceil(h / step) + 1;
      if (lo.width !== lw || lo.height !== lh) { lo.width = lw; lo.height = lh; }
      var lctx = lo.getContext('2d');
      lctx.clearRect(0, 0, lw, lh);
      silhouettes(lctx, 1 / step);
      ctx.drawImage(lo, 0, 0, lw * step, lh * step);
    } else {
      silhouettes(ctx, 1);
    }

    // Inside: a tunnel falling away into the multiverse (big rifts only — on
    // the nav icon it would just be noise), and on tear frames a glimpse of
    // another world through the hole.
    ctx.save();
    trace(ctx, blob);
    ctx.clip();
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.1);
    g.addColorStop(0, '#000');
    g.addColorStop(0.7, '#040108');
    g.addColorStop(1, '#1c0832');
    ctx.fillStyle = g;
    ctx.fillRect(cx - R * 1.3, cy - R * 1.3, R * 2.6, R * 2.6);
    if (R >= 20) {
      // The far end drifts a little, so the tunnel seems to sway.
      var vx = cx + Math.sin(t * 0.7 + state.phase) * R * 0.1, vy = cy + Math.cos(t * 0.55 + state.phase) * R * 0.08;
      var hasCore = state.live && core.state === 'ready';
      var tv = state.live && state.tunnel ? tunnelFrame() : null;
      var rings = 6, drift = (t * 0.4) % 1;
      if (tv) {
        // The portal itself: the video's nested hexagons rushing out of the
        // core fill the hole (sampled on twos with the rest of the rift).
        ctx.imageSmoothingEnabled = true;
        var tk = R * 3.0;
        ctx.drawImage(tv, vx - tk / 2, vy - tk / 2, tk, tk);
        ctx.imageSmoothingEnabled = false;
        hasCore = true;
      } else if (hasCore) {
        // The tunnel: two copies of the core zooming in from the far end half
        // a cycle apart (an endless fall), slowly turning, each dragged toward
        // the lens in fainter, brighter passes — the smeared space.
        ctx.imageSmoothingEnabled = true;
        var zt = (t * 0.2) % 1, base = R * 2.05, rot = t * 0.1 + state.phase;
        for (var layer = 0; layer < 2; layer++) {
          var ph = (zt + layer * 0.5) % 1, zs = Math.pow(1.9, ph), za = Math.sin(ph * Math.PI);
          for (var sm = 0; sm < 3; sm++) {
            var zk = base * zs * (1 + sm * 0.08);
            ctx.globalCompositeOperation = sm ? 'screen' : 'source-over';
            ctx.globalAlpha = za * (sm ? 0.16 / sm : 0.95);
            ctx.save();
            ctx.translate(vx, vy);
            ctx.rotate(rot + layer * 0.7);
            ctx.drawImage(core.img, -zk / 2, -zk / 2, zk, zk);
            ctx.restore();
          }
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.imageSmoothingEnabled = false;
      }
      if (hasCore && !tv) {
        // Light pouring out of the far end.
        var glow = ctx.createRadialGradient(vx, vy, 0, vx, vy, R * 0.3);
        glow.addColorStop(0, 'rgba(255, 250, 225, 0.45)');
        glow.addColorStop(0.35, 'rgba(255, 210, 120, 0.15)');
        glow.addColorStop(1, 'rgba(255, 60, 200, 0)');
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = glow;
        ctx.fillRect(vx - R * 0.5, vy - R * 0.5, R, R);
        ctx.globalCompositeOperation = 'source-over';
      }
      if (hasCore) {
        // The mouth darkens into violet, with a band of halftone dots.
        var mouth = ctx.createRadialGradient(cx, cy, R * (tv ? 0.62 : 0.45), cx, cy, R * 1.25);
        mouth.addColorStop(0, 'rgba(14, 4, 28, 0)');
        mouth.addColorStop(1, 'rgba(14, 4, 28, ' + (tv ? 0.75 : 0.9) + ')');
        ctx.fillStyle = mouth;
        ctx.fillRect(cx - R * 1.4, cy - R * 1.4, R * 2.8, R * 2.8);
        if (state.dots) {
          ctx.beginPath();
          for (var bo = 0; bo < blob.length; bo++) { if (bo) ctx.lineTo(blob[bo][0], blob[bo][1]); else ctx.moveTo(blob[bo][0], blob[bo][1]); }
          ctx.closePath();
          for (var bi = 0; bi < blob.length; bi++) {
            var ix = vx + (blob[bi][0] - cx) * 0.8, iy = vy + (blob[bi][1] - cy) * 0.8;
            if (bi) ctx.lineTo(ix, iy); else ctx.moveTo(ix, iy);
          }
          ctx.closePath();
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = state.dots;
          ctx.fill('evenodd');
          ctx.globalAlpha = 1;
        }
      } else {
        var dim = ctx.createRadialGradient(vx, vy, 0, vx, vy, R * 0.32);
        dim.addColorStop(0, 'rgba(120, 40, 190, 0.45)');
        dim.addColorStop(1, 'rgba(120, 40, 190, 0)');
        ctx.fillStyle = dim;
        ctx.fillRect(vx - R * 0.4, vy - R * 0.4, R * 0.8, R * 0.8);
      }
      // Stepped layers shrinking toward the far end (filled dark without the
      // core texture), each lip catching light in broken stretches only — no
      // continuous rings or spokes, which would read as a web.
      for (var ri = 0; ri < rings; ri++) {
        var sc = 1 - (ri + drift) / rings;
        if (sc < (hasCore ? 0.4 : 0.06)) continue;
        if (!hasCore) {
          var shade = Math.round(30 * sc * sc);
          ctx.fillStyle = 'rgb(' + Math.round(shade * 0.9) + ', ' + Math.round(shade * 0.35) + ', ' + Math.round(shade * 1.6) + ')';
          traceToward(ctx, blob, cx, cy, vx, vy, sc * 0.94, 0);
          ctx.fill();
        }
        var lip = sc * sc, ox = Math.max(0.5, fine * 0.6 * sc), lipRng = mulberry32((ri + Math.floor(t * 0.4 + 1 - (ri + drift) / rings)) * 977 + 13);
        ctx.lineWidth = Math.max(1, fine * 0.6 * sc);
        for (var le = 0; le < blob.length; le++) {
          if (lipRng() > 0.28) continue;
          var p1 = blob[le], p2 = blob[(le + 1) % blob.length], kk = sc * 0.94;
          var x1 = vx + (p1[0] - cx) * kk, y1 = vy + (p1[1] - cy) * kk, x2 = vx + (p2[0] - cx) * kk, y2 = vy + (p2[1] - cy) * kk;
          ctx.strokeStyle = 'rgba(255, 40, 90, ' + (0.7 * lip).toFixed(3) + ')';
          ctx.beginPath(); ctx.moveTo(x1 - ox, y1); ctx.lineTo(x2 - ox, y2); ctx.stroke();
          ctx.strokeStyle = 'rgba(0, 229, 255, ' + (0.55 * lip).toFixed(3) + ')';
          ctx.beginPath(); ctx.moveTo(x1 + ox, y1); ctx.lineTo(x2 + ox, y2); ctx.stroke();
        }
      }
      // Scraps of other worlds spiral in, shrinking and fading as they fall.
      if (live && state.inner) {
        for (var di = 0; di < state.inner.length; di++) {
          var it = state.inner[di], run = t * it.speed + it.off, p = run % 1, lap = Math.floor(run);
          var dr = R * 0.92 * (1 - p), da = it.a + it.spin * p * 3, size = R * it.size * Math.pow(1 - p, 1.2);
          if (size < 1.5) continue;
          var srng = mulberry32(it.seed + lap * 131);
          ctx.globalAlpha = Math.min(1, p * 8, (1 - p) * 1.8) * 0.85;
          splitFragment(ctx, tileRect(srng, pickTile(srng, state.tiles), size / Math.max(1, unit * 0.3), size * 0.45 / Math.max(1, unit * 0.3)),
            vx + Math.cos(da) * dr - size / 2, vy + Math.sin(da) * dr - size * 0.225, size, size * 0.45, fine * 0.8 * (1 - p));
        }
        ctx.globalAlpha = 1;
      }
    }
    if (live && tear) {
      ctx.globalAlpha = 0.4;
      var gh = R * (0.25 + rng() * 0.3);
      splitFragment(ctx, tileRect(rng, pickTile(rng, state.tiles), (R * 2) / (unit * 1.5), gh / (unit * 1.5)), cx - R, cy - gh / 2 + (rng() - 0.5) * R, R * 2, gh, fine * 2);
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // Chromatic rim: broken edge lines printed as red and cyan plates.
    var lw2 = Math.max(1, fine * 0.4), ro = Math.max(0.6, fine * 0.5);
    ctx.lineWidth = lw2;
    for (var e = 0; e < blob.length; e++) {
      if (rng() > 0.5) continue;
      var pa2 = blob[e], qa = blob[(e + 1) % blob.length];
      ctx.strokeStyle = 'rgba(255, 40, 70, 0.9)';
      ctx.beginPath(); ctx.moveTo(pa2[0] - ro, pa2[1]); ctx.lineTo(qa[0] - ro, qa[1]); ctx.stroke();
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.9)';
      ctx.beginPath(); ctx.moveTo(pa2[0] + ro, pa2[1]); ctx.lineTo(qa[0] + ro, qa[1]); ctx.stroke();
    }

    // Debris off the edge: macroblocks of other worlds, or flat ink blocks.
    var blocks = Math.round((2 + rng() * 4) * (0.6 + 0.4 * k) * (tear ? 2 : 1));
    for (var b = 0; b < blocks; b++) {
      var ba = rng() * TAU, bd = R * (0.85 + rng() * 0.6);
      var bw = Math.max(2, Math.min(R * (0.08 + rng() * 0.22), 4 + rng() * 22));
      var bx = cx + Math.cos(ba) * bd - bw / 2, by = cy + Math.sin(ba) * bd - bw / 2;
      if (live) macroblock(ctx, rng, pickTile(rng, state.tiles), Math.round(bx), Math.round(by), Math.round(bw));
      else paintBlock(ctx, rng, bx, by, bw, Math.max(1, bw * (0.18 + rng() * 0.35)));
    }

    // Single-pixel specks in a tight orbit.
    for (var q = 0; q < state.specks.length; q++) {
      var sp = state.specks[q];
      sp.a += sp.v * (0.7 + 0.5 * k);
      var size = Math.max(1, fine * sp.s * 1.2);
      ctx.fillStyle = BLOCKS[sp.ink];
      ctx.fillRect(Math.round(cx + Math.cos(sp.a) * R * sp.d), Math.round(cy + Math.sin(sp.a) * R * sp.d), size, size);
    }
  }

  // One frame of the hero's universe-switch cut over a whole area: slices of
  // the outgoing and incoming worlds (`tiles`) blown up into chunky pixels with
  // split plates, smeared streaks and macroblocks — or flat ink bars without
  // the atlas.
  function paintGlitchBars(ctx, rng, w, h, count, opts) {
    var unit = Math.max(1, h / 400);
    if (opts && opts.live && atlas.state === 'ready') {
      ctx.imageSmoothingEnabled = false;
      for (var i = 0; i < count; i++) {
        var tile = pickTile(rng, opts.tiles);
        var bh = unit * (2 + rng() * 16), y = rng() * (h - bh);
        var bw = w * (0.3 + rng() * 0.7), x = rng() < 0.4 ? 0 : rng() * (w - bw);
        var mag = 3 + rng() * 6;
        ctx.globalAlpha = 0.7 + rng() * 0.3;
        splitFragment(ctx, tileRect(rng, tile, bw / mag, bh / mag), x, y, bw, bh, unit * (3 + rng() * 7));
      }
      for (var s = 0; s < Math.ceil(count / 3); s++) {
        ctx.globalAlpha = 0.6 + rng() * 0.4;
        smear(ctx, rng, pickTile(rng, opts.tiles), rng() * w * 0.5, rng() * h, w * (0.2 + rng() * 0.6), unit * (1 + rng() * 5));
      }
      for (var b = 0; b < Math.ceil(count / 2); b++) {
        ctx.globalAlpha = 0.9;
        var size = Math.round(unit * (8 + rng() * 26));
        macroblock(ctx, rng, pickTile(rng, opts.tiles), Math.round(rng() * w), Math.round(rng() * h), size);
      }
      ctx.globalAlpha = 1;
      return;
    }
    for (var j = 0; j < count; j++) {
      var y2 = rng() * h, bh2 = unit * (1 + rng() * 9);
      var x2 = rng() * w * 0.7, bw2 = w * (0.15 + rng() * 0.6);
      ctx.globalAlpha = 0.35 + rng() * 0.45;
      ctx.fillStyle = PLATES[j % 3];
      ctx.fillRect(x2, y2, bw2, bh2);
      if (rng() < 0.5) {
        ctx.fillStyle = PLATES[(j + 1) % 3];
        ctx.fillRect(x2 + unit * 6, y2 + bh2, bw2 * 0.8, Math.max(1, bh2 * 0.4));
      }
    }
    ctx.globalAlpha = 1;
    for (var c = 0; c < Math.ceil(count / 2); c++) {
      var bw3 = unit * (8 + rng() * 34);
      paintBlock(ctx, rng, rng() * w, rng() * h, bw3, bw3 * (0.2 + rng() * 0.4));
    }
  }

  function prefersReducedMotion() {
    return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function fitCanvas(canvas, fallback, maxDpr) {
    var dpr = Math.min(root.devicePixelRatio || 1, maxDpr || 2);
    var w = canvas.clientWidth || fallback, h = canvas.clientHeight || fallback;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    return { w: w, h: h, dpr: dpr };
  }

  // Shift a few horizontal bands of what is already drawn.
  function slip(ctx, canvas, buffer, rng, bands, reach) {
    buffer.width = canvas.width;
    buffer.height = canvas.height;
    buffer.getContext('2d').drawImage(canvas, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    var W = canvas.width, H = canvas.height;
    for (var i = 0; i < bands; i++) {
      var bh = Math.max(1, (H * (0.02 + rng() * 0.07)) | 0);
      var y = (rng() * (H - bh)) | 0;
      var dx = Math.round((rng() - 0.5) * 2 * W * reach);
      ctx.clearRect(0, y, W, bh);
      ctx.drawImage(buffer, 0, y, W, bh, dx, y, W, bh);
    }
  }

  // opts: intensity (1 = idle, ~2 = agitated), coreScale (hole radius as a
  // fraction of the smaller side), maxDpr (1 keeps huge backdrops cheap),
  // seed, tiles (universe indices that bleed through; default all), atlas
  // (URL override), still (defaults to the reduced-motion preference: one
  // static frame, redrawn only on resize).
  function mount(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    var still = opts.still == null ? prefersReducedMotion() : opts.still;
    var seed = opts.seed == null ? (Math.random() * 1e9) | 0 : opts.seed;
    var rng = mulberry32(seed);
    var state = {
      intensity: opts.intensity == null ? 1 : opts.intensity,
      coreScale: opts.coreScale || 0.3,
      phase: rng() * TAU,
      tearing: false,
      specks: [],
      inner: [],
      tunnel: false,
      live: true,
      tiles: opts.tiles || null,
      lo: document.createElement('canvas')
    };
    for (var d = 0; d < 12; d++) {
      state.inner.push({
        a: rng() * TAU, spin: (rng() < 0.5 ? -1 : 1) * (0.3 + rng() * 0.4), off: rng(),
        speed: 0.12 + rng() * 0.14, size: 0.2 + rng() * 0.22, seed: (rng() * 1e9) | 0
      });
    }
    for (var i = 0; i < (opts.specks || 6); i++) {
      state.specks.push({
        a: rng() * TAU, d: 1.25 + rng() * 0.35, s: 0.6 + rng() * 0.7,
        v: (rng() < 0.5 ? -1 : 1) * (0.03 + rng() * 0.06), ink: i % BLOCKS.length
      });
    }

    var box = { w: 0, h: 0, dpr: 1 };
    var frame = 0, last = 0, raf = 0, onScreen = true, destroyed = false;
    var nextTear = 0, tearFrames = 0;
    var buffer = document.createElement('canvas');

    function draw(now) {
      frame++;
      var frameRng = mulberry32(seed + frame * 7919);
      if (!still) {
        if (!nextTear) nextTear = now + 1400;
        if (now >= nextTear) {
          tearFrames = 2 + ((frameRng() * 2) | 0);
          nextTear = now + (2000 + frameRng() * 2200) / Math.max(0.6, state.intensity);
        }
      }
      state.tearing = tearFrames > 0;
      ctx.setTransform(box.dpr, 0, 0, box.dpr, 0, 0);
      ctx.clearRect(0, 0, box.w, box.h);
      paintRift(ctx, frameRng, box.w, box.h, frame, state);
      if (still) return;
      if (state.tearing) {
        tearFrames--;
        slip(ctx, canvas, buffer, frameRng, 3 + ((frameRng() * 3) | 0), 0.07 * state.intensity);
      } else if (frameRng() < 0.3 * state.intensity) {
        slip(ctx, canvas, buffer, frameRng, 1, 0.025 * state.intensity);
      }
    }

    function loop(now) {
      raf = 0;
      if (destroyed || !onScreen) return;
      var fps = state.intensity > 1.4 ? 15 : 12;
      if (now - last >= 1000 / fps) { last = now; draw(now); }
      raf = requestAnimationFrame(loop);
    }

    function sync() {
      var awake = onScreen && !document.hidden && !destroyed && !still;
      if (awake && !raf) raf = requestAnimationFrame(loop);
      if (!awake && raf) { cancelAnimationFrame(raf); raf = 0; }
      // Only rifts big enough to show a tunnel use the portal video, and not
      // on Save-Data or a slow link (the still core is shown instead).
      var wants = awake && opts.tunnel !== false && !liteNetwork() && Math.min(box.w, box.h) * state.coreScale >= 20;
      if (wants !== state.tunnel) { state.tunnel = wants; wantTunnel(wants); }
    }

    function resize() {
      box = fitCanvas(canvas, opts.size || 32, opts.maxDpr);
      draw(performance.now());
    }

    resize();
    // A still frame is redrawn once the atlas arrives; a live one picks it up.
    loadAtlas(opts.atlas, function () { if (!destroyed) draw(performance.now()); });
    // Only rifts big enough to show a tunnel need the core texture.
    if (Math.min(box.w, box.h) * state.coreScale >= 20) loadCore(opts.core, function () { if (!destroyed) draw(performance.now()); });
    var dot = document.createElement('canvas');
    dot.width = dot.height = 6;
    var dctx = dot.getContext('2d');
    dctx.fillStyle = 'rgba(255, 60, 200, 0.9)';
    dctx.fillRect(2, 2, 2, 2);
    state.dots = ctx.createPattern(dot, 'repeat');
    var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(canvas);
    var io = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(function (entries) { onScreen = entries[0].isIntersecting; sync(); })
      : null;
    if (io) io.observe(canvas);
    document.addEventListener('visibilitychange', sync);
    sync();

    return {
      setIntensity: function (k) {
        state.intensity = k;
        if (still) draw(performance.now());
      },
      destroy: function () {
        destroyed = true;
        sync();
        if (ro) ro.disconnect();
        if (io) io.disconnect();
        document.removeEventListener('visibilitychange', sync);
      }
    };
  }

  // Glitch burst over a whole area for `duration` ms (the hero's
  // universe-switch cut). opts.tiles = the universes to tear slices from.
  // Returns a cancel function that clears the canvas.
  function flash(canvas, opts) {
    opts = opts || {};
    loadAtlas(opts.atlas);
    var ctx = canvas.getContext('2d');
    var box = fitCanvas(canvas, 300, opts.maxDpr || 1.5);
    var rng = mulberry32(opts.seed == null ? (Math.random() * 1e9) | 0 : opts.seed);
    var end = performance.now() + (opts.duration || 450), last = 0, raf = 0;
    function clear() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    function step(now) {
      if (now >= end) { clear(); raf = 0; return; }
      if (now - last >= 83) {
        last = now;
        clear();
        ctx.setTransform(box.dpr, 0, 0, box.dpr, 0, 0);
        paintGlitchBars(ctx, rng, box.w, box.h, opts.count || 14, { live: true, tiles: opts.tiles });
      }
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return function cancel() { if (raf) cancelAnimationFrame(raf); clear(); };
  }

  return {
    PLATES: PLATES,
    mount: mount,
    flash: flash,
    loadAtlas: loadAtlas,
    loadCore: loadCore,
    mulberry32: mulberry32,
    riftBlob: riftBlob,
    riftHex: riftHex,
    paintRift: paintRift,
    paintGlitchBars: paintGlitchBars
  };
});
