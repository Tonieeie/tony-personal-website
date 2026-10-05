// patch-spiderverse.js — Spider-Verse redesign wiring for index.html.
// The look and the components live in assets/spiderverse/; this script only
// (1) loads them from the bundled template and swaps in the multiverse hero,
// rift nav link and Spider-Verse theme, and (2) reskins the pre-bundle intro
// (outside the template) as a cross-universe jump. Every find string must
// match exactly once or the script aborts without writing.
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'index.html');
const OPEN = '<script type="__bundler/template">\n';
const CLOSE = '\n  </script>';

let html = fs.readFileSync(FILE, 'utf8');
if (html.includes('\r\n')) html = html.replace(/\r\n/g, '\n');

const tStart = html.indexOf(OPEN);
if (tStart === -1) throw new Error('template tag not found');
const cStart = tStart + OPEN.length;
const cEnd = html.indexOf(CLOSE, cStart);
if (cEnd === -1) throw new Error('template close not found');
let tpl = JSON.parse(html.slice(cStart, cEnd));
let outer = { head: html.slice(0, tStart), tail: html.slice(cEnd) };

if (tpl.includes('<MultiverseHero')) {
  console.log('Spider-Verse already installed');
  process.exit(0);
}

function replaceOnce(src, name, find, replace) {
  const hits = typeof find === 'string' ? src.split(find).length - 1 : (src.match(new RegExp(find.source, 'g')) || []).length;
  if (hits !== 1) throw new Error(`${name}: expected 1 match, found ${hits}`);
  return src.replace(find, () => replace);
}

// ── 1. Template ─────────────────────────────────────────────────────────────
const T = [];
const t = (name, find, replace) => T.push([name, find, replace]);

t('stylesheet',
  '  <link rel="stylesheet" href="./assets/holo-card/card.css">\n',
  '  <link rel="stylesheet" href="./assets/holo-card/card.css">\n  <link rel="stylesheet" href="./assets/spiderverse/spiderverse.css">\n');

t('scripts',
  '<script type="text/babel" src="./assets/holo-card/card.jsx"></script>\n',
  '<script src="./assets/spiderverse/rift.js"></script>\n' +
  '<script src="./assets/spiderverse/multiverse.js"></script>\n' +
  '<script type="text/babel" src="./assets/spiderverse/spiderverse.jsx"></script>\n' +
  '<script type="text/babel" src="./assets/holo-card/card.jsx"></script>\n');

t('theme',
  'const THEMES = {\n  terminal: {',
  `const THEMES = {
  spiderverse: {
    label: 'Spider-Verse',
    vars: { '--bg':'#0a0a0d','--surface':'#111116','--border':'#26262e','--accent':'#ff2a3d','--accent2':'#ff8a95','--accent3':'#ffffff','--text':'#f4f2f7','--muted':'#a19dae','--glow':'0 0 24px rgba(255,42,61,0.4)' },
    dot1: '#ff2a3d', dot2: '#3a3a44', dot3: '#3a3a44',
  },
  terminal: {`);

t('default theme', '"theme": "cyber"', '"theme": "spiderverse"');

t('drop matrix rain', /\/\/ ── MATRIX RAIN ─[\s\S]*?(?=\/\/ ── NAV ─)/, '');

t('hero', /function Hero\(\{ matrixColor, matrixOpacity, matrixFade \}\) \{[\s\S]*?(?=\/\/ ── ABOUT ─)/,
  'function Hero() {\n  const role = useTypewriter(ROLES);\n  return <MultiverseHero role={role} />;\n}\n\n');

t('app hero props',
  '<Hero matrixColor={theme.matrix} matrixOpacity={theme.matrixOpacity || 0.18} matrixFade={theme.matrixFade || 0.04} />',
  '<Hero />');

t('rift nav link', /<li className="nav-virus">[\s\S]*?<\/svg><\/a><\/li>/, '<li className="nav-virus"><RiftLink /></li>');

t('drop skull css', / \.nav-virus \{ display: flex;[^\n]*virusPulse \{[^\n]*/, '');

t('drop hero canvas css', '    .hero-canvas { position: absolute; inset: 0; opacity: 0.18; pointer-events: none; }\n', '');

for (const [name, find, replace] of T) tpl = replaceOnce(tpl, name, find, replace);

// BorderGlow colours appear once per card list (4 lists).
const GLOW_OLD = `glowColor="135 100 50" backgroundColor="var(--surface)" borderRadius={12} glowRadius={30} colors={['#00ff41', '#10b981', '#22d3ee']}`;
const GLOW_NEW = `glowColor="352 100 58" backgroundColor="var(--surface)" borderRadius={6} glowRadius={30} colors={['#ff2a3d', '#ff8a95', '#ffffff']}`;
const glowHits = tpl.split(GLOW_OLD).length - 1;
if (glowHits !== 4) throw new Error(`BorderGlow props: expected 4 matches, found ${glowHits}`);
tpl = tpl.split(GLOW_OLD).join(GLOW_NEW);

// ── 2. Pre-bundle intro (outer document) ────────────────────────────────────
const INTRO_CSS = `    #__intro {
      position: fixed; inset: 0;
      z-index: 10500;
      background: radial-gradient(ellipse at 50% 50%, #1d0838 0%, #0a0616 45%, #07060d 80%);
      color: #f5f3ff;
      font-family: ui-monospace, "SF Mono", Menlo, Consolas, "Courier New", monospace;
      font-size: 14px;
      line-height: 1.55;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      padding: 16px 16px 16px max(16px, 7vw);
      cursor: pointer;
      overflow: hidden;
      transition: opacity .35s ease;
    }
    #__intro.gone { opacity: 0; pointer-events: none; }
    #__intro::before {
      content: '';
      position: absolute; inset: 0;
      pointer-events: none;
      background:
        radial-gradient(circle, rgba(255,45,85,0.22) 0 1.2px, transparent 1.8px) 0 0 / 13px 13px,
        radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.75) 100%);
    }
    #__intro .rift {
      position: absolute; left: 74%; top: 50%;
      width: min(86vmin, 780px); height: min(86vmin, 780px);
      transform: translate(-50%, -50%);
      pointer-events: none;
      transition: transform .35s steps(5, end);
    }
    #__intro.gone .rift { transform: translate(-50%, -50%) scale(3.4); }
    #__intro .term {
      position: relative;
      width: min(640px, 100%);
      background: rgba(10, 9, 18, 0.94);
      border: 2px solid #f5f3ff;
      border-radius: 4px;
      box-shadow: -4px 0 0 #00f0ff, 4px 0 0 #ff2bd6, 10px 10px 0 #000;
      overflow: hidden;
      animation: __termjolt 4.5s steps(1) infinite;
    }
    @keyframes __termjolt {
      0%, 94%, 100% { transform: none; box-shadow: -4px 0 0 #00f0ff, 4px 0 0 #ff2bd6, 10px 10px 0 #000; }
      95%           { transform: translateX(-4px) skewX(-2deg); box-shadow: -8px 0 0 #00f0ff, 8px 0 0 #ff2bd6, 10px 10px 0 #000; }
      97%           { transform: translateX(3px); }
    }
    #__intro .chrome {
      display: flex; align-items: center; gap: 8px;
      padding: 9px 14px;
      background: #ffe14d;
      border-bottom: 2px solid #000;
    }
    #__intro .dot { width: 12px; height: 12px; border-radius: 50%; border: 2px solid #000; }
    #__intro .r { background: #ff2d55; }
    #__intro .y { background: #fff; }
    #__intro .g { background: #00d2ff; }
    #__intro .ttl { margin-left: 10px; color: #111; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; user-select: none; }
    #__intro .body { padding: 18px 20px 22px; min-height: 220px; }
    #__intro .line { white-space: pre-wrap; word-break: break-word; }
    #__intro .prompt { color: #00f0ff; }
    #__intro .user { color: #ff4d6d; }
    #__intro .path { color: #ffe14d; }
    #__intro .ok { color: #00f0ff; }
    #__intro .dim { color: #9b97b5; }
    #__intro .err { color: #ff4d6d; }
    #__intro .glitch {
      position: relative;
      display: inline-block;
      color: #fff;
      font-weight: 700;
      animation: __glitchflicker 1.4s steps(1) infinite;
    }
    #__intro .glitch::before,
    #__intro .glitch::after {
      content: attr(data-text);
      position: absolute;
      top: 0; left: 0;
      width: 100%;
      pointer-events: none;
    }
    #__intro .glitch::before {
      color: #ff2bd6;
      animation: __glitchA 0.85s steps(2, end) infinite;
      clip-path: inset(0 0 55% 0);
    }
    #__intro .glitch::after {
      color: #00f0ff;
      animation: __glitchB 0.85s steps(2, end) infinite;
      clip-path: inset(55% 0 0 0);
    }
    @keyframes __glitchA {
      0%   { transform: translate(-1px, 0);  clip-path: inset(0 0 60% 0); }
      20%  { transform: translate(-3px, 1px); clip-path: inset(8% 0 68% 0); }
      40%  { transform: translate(-1px, -1px); clip-path: inset(28% 0 48% 0); }
      60%  { transform: translate(-2px, 0);  clip-path: inset(18% 0 58% 0); }
      80%  { transform: translate(0, 0);     clip-path: inset(38% 0 48% 0); }
      100% { transform: translate(-1px, 0);  clip-path: inset(0 0 60% 0); }
    }
    @keyframes __glitchB {
      0%   { transform: translate(1px, 0);  clip-path: inset(60% 0 0 0); }
      20%  { transform: translate(3px, -1px); clip-path: inset(70% 0 8% 0); }
      40%  { transform: translate(1px, 1px); clip-path: inset(48% 0 28% 0); }
      60%  { transform: translate(2px, 0);  clip-path: inset(58% 0 18% 0); }
      80%  { transform: translate(0, 0);     clip-path: inset(48% 0 38% 0); }
      100% { transform: translate(1px, 0);  clip-path: inset(60% 0 0 0); }
    }
    @keyframes __glitchflicker {
      0%, 100% { opacity: 1; }
      4%       { opacity: 0.55; }
      8%       { opacity: 1; }
      48%      { opacity: 1; }
      50%      { opacity: 0.7; }
      52%      { opacity: 1; }
    }
    #__intro .caret {
      display: inline-block;
      width: 8px; height: 1em;
      background: #ff2d55;
      vertical-align: text-bottom;
      margin-left: 2px;
      animation: __ic 1s steps(2) infinite;
    }
    @keyframes __ic { 50% { opacity: 0; } }
    #__intro .skip {
      position: absolute;
      bottom: 14px; right: 18px;
      color: #9b97b5; font-size: 11px;
      letter-spacing: 0.05em;
      user-select: none;
    }
    @media (max-width: 900px) {
      #__intro { justify-content: center; padding-left: 16px; }
      #__intro .rift { left: 50%; width: 110vmin; height: 110vmin; }
    }
    @media (max-width: 560px) {
      #__intro { font-size: 12px; }
      #__intro .ttl { display: none; }
      #__intro .skip { font-size: 10px; right: 12px; bottom: 10px; }
    }
    @media (prefers-reduced-motion: reduce) {
      #__intro { display: none !important; }
    }
`;

const O = [];
const o = (name, find, replace) => O.push([name, find, replace]);

o('intro css', /    #__intro \{\n      position: fixed; inset: 0;[\s\S]*?(?=  <\/style>\n  <noscript>)/, INTRO_CSS);

o('preload rift', '</head>', '  <script defer src="./assets/spiderverse/rift.js"></script>\n</head>');

o('intro markup',
  `  <div id="__intro" aria-hidden="true">
    <div class="scan"></div>
    <div class="term">
      <div class="chrome">
        <span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>
        <span class="ttl">visitor1@portfolio: ~ &mdash; ssh &mdash; 80x24</span>`,
  `  <div id="__intro" aria-hidden="true">
    <canvas class="rift" id="__intro_rift"></canvas>
    <div class="term">
      <div class="chrome">
        <span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>
        <span class="ttl">spider-society://multiverse-link &mdash; earth-1610</span>`);

o('thumbnail',
  `<text x="600" y="360" font-family="monospace" font-size="72" font-weight="bold" fill="#00ff41" text-anchor="middle">Tony</text>`,
  `<text x="600" y="360" font-family="monospace" font-size="72" font-weight="bold" fill="#ff2d55" text-anchor="middle">Tony</text>`);
o('thumbnail rule',
  `<rect x="480" y="470" width="240" height="2" fill="#00ff41" opacity="0.5"></rect>`,
  `<rect x="480" y="470" width="240" height="2" fill="#00d2ff" opacity="0.6"></rect>`);

o('rift handle',
  'function endIntro() {\n    if (introClosing) return;',
  'let introRift = null;\n  function endIntro() {\n    if (introClosing) return;');
o('rift teardown',
  "      if (intro && intro.parentNode) intro.parentNode.removeChild(intro);\n      if (loading) loading.style.display = '';",
  "      if (introRift) introRift.destroy();\n      if (intro && intro.parentNode) intro.parentNode.removeChild(intro);\n      if (loading) loading.style.display = '';");
o('rift mount',
  "    if (loading) loading.style.display = 'none';\n",
  "    if (loading) loading.style.display = 'none';\n" +
  "    if (window.GlitchRift) introRift = window.GlitchRift.mount(document.getElementById('__intro_rift'), { intensity: 1.3, coreScale: 0.3, maxDpr: 1, specks: 10 });\n");

o('intro prompt',
  `appendLine('<span class="user">visitor1@portfolio</span>:<span class="path">~</span><span class="prompt">$</span> ');`,
  `appendLine('<span class="user">visitor</span>@<span class="path">spider-society</span><span class="prompt">:~$</span> ');`);

o('intro script', /        await typeCmd\('ssh tony@portfolio\.dev', 55\);[\s\S]*?(?=        await pause\(900\);)/,
  `        await typeCmd('spider-society connect --earth=1610', 50);
        if (introClosing) return;
        await pause(220);
        appendLine('<span class="dim">opening dimensional rift...</span>');
        await pause(260);
        if (introClosing) return;
        appendLine('<span class="ok">[OK]</span> <span class="dim">rift stable &middot; anomalies contained</span>');
        await pause(220);
        if (introClosing) return;
        await typeCmd('jump --to=portfolio', 50);
        if (introClosing) return;
        await pause(200);
        appendLine('<span class="ok">[OK]</span> <span class="dim">syncing canon events...</span>');
        await pause(220);
        if (introClosing) return;
        appendLine('<span class="ok">[OK]</span> <span class="dim">locking onto Earth-1610...</span>');
        await pause(220);
        if (introClosing) return;
        appendLine('<span class="ok glitch" data-text="welcome to earth-1610, bingsen (tony) teng.">welcome to earth-1610, bingsen (tony) teng.</span>');
`);

for (const [name, find, replace] of O) {
  // The template sits between head and tail; intro CSS/markup/script are in head.
  const inHead = typeof find === 'string' ? outer.head.includes(find) : find.test(outer.head);
  if (!inHead) throw new Error(`${name}: not found in outer document`);
  outer.head = replaceOnce(outer.head, name, find, replace);
}

const out = outer.head + OPEN + JSON.stringify(tpl).replace(/<\//g, '<\\/') + outer.tail;
fs.writeFileSync(FILE, out);
console.log('Spider-Verse installed in index.html');
