// Adds a red "virus" entry to the top nav. Clicking it routes to a fake
// path (/infected.exe) which the static host serves via 404.html — landing
// the visitor in the terminal easter-egg page.
//
// Re-runnable: scans for any existing nav-virus markup and removes it
// before inserting the fresh version.
const fs = require('fs');

const TARGETS = [
  'D:/Desktop/Tony_personal_website/Tony-Website-Cyber.html',
  'D:/Desktop/Tony_personal_website/index.html',
];

const htmlSafe = (s) => JSON.stringify(s).replace(/<\//g, '<\\/');

// ── SVG: red skull-and-crossbones ──────────────────────────────────────────
// 40x40 viewBox, rendered at 22px. Crossbones drawn FIRST (behind), then
// the skull on top so it occludes the central overlap — only the bone tips
// peek out beside/below the skull, classic Jolly Roger / poison symbol.
// Skull is the prior 32x32 path placed in a translate+scale group; cutouts
// (eyes / nose / tooth gaps) use the page bg color #04040f so they read as
// real holes (and hide bones that pass behind those areas).
// (Kept the .nav-virus class name — it's an internal hook, not user-visible.)
const VIRUS_SVG =
  '<svg viewBox="0 0 40 40" width="22" height="22" aria-hidden="true" focusable="false">' +
    // ── Crossbones (behind) ──────────────────────────────────────────────
    '<g fill="currentColor">' +
      // Bone 1: NW → SE
      '<g transform="translate(20 25) rotate(45)">' +
        '<rect x="-14" y="-1.7" width="28" height="3.4" rx="1.7"></rect>' +
        '<circle cx="-14" cy="-2.2" r="2.4"></circle>' +
        '<circle cx="-14" cy="2.2" r="2.4"></circle>' +
        '<circle cx="14" cy="-2.2" r="2.4"></circle>' +
        '<circle cx="14" cy="2.2" r="2.4"></circle>' +
      '</g>' +
      // Bone 2: NE → SW
      '<g transform="translate(20 25) rotate(-45)">' +
        '<rect x="-14" y="-1.7" width="28" height="3.4" rx="1.7"></rect>' +
        '<circle cx="-14" cy="-2.2" r="2.4"></circle>' +
        '<circle cx="-14" cy="2.2" r="2.4"></circle>' +
        '<circle cx="14" cy="-2.2" r="2.4"></circle>' +
        '<circle cx="14" cy="2.2" r="2.4"></circle>' +
      '</g>' +
    '</g>' +
    // ── Skull on top ─────────────────────────────────────────────────────
    // translate(6.4 0) + scale(0.85) places the original 32x32 skull
    // centered horizontally at x=20 with top at y≈2.55, bottom at y≈24.65.
    '<g transform="translate(6.4 0) scale(0.85)">' +
      '<path fill="currentColor" d="' +
        'M16 3 C8.5 3 3 8.5 3 16 C3 19.5 4.8 22.5 7.5 24.2 ' +
        'L7.5 27.5 C7.5 28.3 8.2 29 9 29 ' +
        'L11 29 L11 26 L13.4 26 L13.4 29 ' +
        'L18.6 29 L18.6 26 L21 26 L21 29 ' +
        'L23 29 C23.8 29 24.5 28.3 24.5 27.5 ' +
        'L24.5 24.2 C27.2 22.5 29 19.5 29 16 ' +
        'C29 8.5 23.5 3 16 3 Z' +
      '"></path>' +
      '<g fill="#04040f">' +
        '<ellipse cx="11" cy="15" rx="2.7" ry="3.1"></ellipse>' +
        '<ellipse cx="21" cy="15" rx="2.7" ry="3.1"></ellipse>' +
        '<path d="M16 19 L14.2 22.5 L17.8 22.5 Z"></path>' +
        '<rect x="9" y="24.2" width="14" height="0.7"></rect>' +
        '<rect x="12.7" y="25" width="0.7" height="4"></rect>' +
        '<rect x="15.65" y="25" width="0.7" height="4"></rect>' +
        '<rect x="18.6" y="25" width="0.7" height="4"></rect>' +
      '</g>' +
    '</g>' +
  '</svg>';

const VIRUS_LI =
  '<li className="nav-virus">' +
    '<a href="/infected.exe" title="⚠ system compromised — proceed at your own risk" aria-label="Compromised">' +
      VIRUS_SVG +
    '</a>' +
  '</li>';

// ── CSS: no boxed badge — just icon + glowing drop-shadow + soft pulse ─────
const CSS_BLOCK =
  '.nav-virus { display: flex; align-items: center; }' +
  ' ' +
  '.nav-virus a { display: inline-flex; align-items: center; justify-content: center; ' +
    'padding: 2px; color: #ff3b3b; ' +
    'filter: drop-shadow(0 0 4px rgba(255, 59, 59, 0.55)); ' +
    'animation: virusPulse 2.2s ease-in-out infinite; ' +
    'transition: color 0.2s ease, transform 0.2s ease, filter 0.2s ease; }' +
  ' ' +
  '.nav-virus a:hover { color: #ff6b6b; transform: scale(1.15) rotate(-10deg); ' +
    'filter: drop-shadow(0 0 10px rgba(255, 107, 107, 0.9)); }' +
  ' ' +
  '@keyframes virusPulse {' +
    '0%, 100% { transform: scale(1);    filter: drop-shadow(0 0 4px rgba(255, 59, 59, 0.55)); }' +
    '50%      { transform: scale(1.06); filter: drop-shadow(0 0 10px rgba(255, 59, 59, 0.85)); }' +
  '}';

const CSS_ANCHOR = '.nav-links a:hover { color: var(--accent); }';
// Anchor on the closing of the .map() expression block so the new <li> is
// inserted as a SIBLING of the map output (a child of <ul>), not as a
// second argument to .map(...).
const NAV_CLOSE  = "          )}\n        </ul>";

function stripExistingVirusLi(template) {
  // Strip every <li className="nav-virus">…</li> (and the leading whitespace).
  const start = '<li className="nav-virus">';
  while (true) {
    const i = template.indexOf(start);
    if (i === -1) break;
    const j = template.indexOf('</li>', i);
    if (j === -1) throw new Error('unterminated nav-virus <li>');
    let k = i;
    while (k > 0 && (template[k - 1] === ' ' || template[k - 1] === '\n')) k--;
    template = template.slice(0, k) + template.slice(j + '</li>'.length);
  }
  return template;
}

function stripExistingVirusCss(template) {
  // Strip a `.nav-virus { … } … @keyframes virusPulse { … }` block.
  // We rely on `@keyframes virusPulse` always being the last piece in the
  // CSS block we add, then brace-count to its closing `}`.
  const cssMark = '.nav-virus {';
  while (true) {
    const cssStart = template.indexOf(cssMark);
    if (cssStart === -1) break;
    const kfMark = '@keyframes virusPulse';
    const kfStart = template.indexOf(kfMark, cssStart);
    if (kfStart === -1) {
      throw new Error('found .nav-virus without matching @keyframes virusPulse');
    }
    const braceOpen = template.indexOf('{', kfStart);
    let depth = 1, p = braceOpen + 1;
    while (p < template.length && depth > 0) {
      if (template[p] === '{') depth++;
      else if (template[p] === '}') depth--;
      p++;
    }
    let s = cssStart;
    while (s > 0 && template[s - 1] === ' ') s--;
    template = template.slice(0, s) + template.slice(p);
  }
  return template;
}

for (const path of TARGETS) {
  const html = fs.readFileSync(path, 'utf8');
  const tOpen = '<script type="__bundler/template">\n';
  const close = '\n  </script>';
  const tStart = html.indexOf(tOpen);
  const tContentStart = tStart + tOpen.length;
  const tEnd = html.indexOf(close, tContentStart);
  let template = JSON.parse(html.slice(tContentStart, tEnd));

  // ── 1. Wipe any prior version (legacy or current). ────────────────────────
  template = stripExistingVirusLi(template);
  template = stripExistingVirusCss(template);

  // ── 2. Defensive: strip any leftover sentinels from earlier (broken)
  //      versions of this script — both JSX form ({/*…*/}) and CSS form (/*…*/),
  //      eating the leading space we may have inserted before them.
  for (const s of ['{/*<<virus-nav>>*/}', '{/*<</virus-nav>>*/}',
                   ' /*<<virus-nav>>*/', ' /*<</virus-nav>>*/',
                   '/*<<virus-nav>>*/',  '/*<</virus-nav>>*/']) {
    template = template.split(s).join('');
  }

  // ── 3. Insert fresh CSS + JSX. ────────────────────────────────────────────
  if (template.split(CSS_ANCHOR).length - 1 !== 1) {
    throw new Error('CSS anchor not found exactly once in ' + path);
  }
  template = template.replace(CSS_ANCHOR, CSS_ANCHOR + ' ' + CSS_BLOCK);

  if (template.split(NAV_CLOSE).length - 1 !== 1) {
    throw new Error('nav close anchor not found exactly once in ' + path);
  }
  // Insert AFTER `)}` (after the .map closes) and BEFORE `</ul>` so the
  // new <li> is a child of <ul>, sibling to the .map() expression.
  template = template.replace(
    NAV_CLOSE,
    "          )}\n          " + VIRUS_LI + "\n        </ul>"
  );

  const out = html.slice(0, tContentStart) + htmlSafe(template) + html.slice(tEnd);
  fs.writeFileSync(path, out);
  console.log('patched', path);
}
