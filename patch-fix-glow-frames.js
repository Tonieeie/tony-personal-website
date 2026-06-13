// patch-fix-glow-frames.js — align BorderGlow hover frames with card bodies.
//
// Problem: spacing margins (edu-card 16px, timeline-item 44px) and hover
// translateY live INSIDE the BorderGlow wrapper, so the glow frame is drawn
// larger than / offset from the visible card (double line below edu cards),
// and timeline items have no padding so the frame hugs the text (too small).
//
// Fix: move spacing margins onto the .card-glow wrappers, move hover lift to
// the wrappers too, pad timeline items, and unclip the timeline dots.
const fs = require('fs');

const FILE = 'D:/Desktop/Tony_personal_website/index.html';
const OPEN = '<script type="__bundler/template">\n';
const CLOSE = '\n  </script>';

const html = fs.readFileSync(FILE, 'utf8');
const tStart = html.indexOf(OPEN);
if (tStart === -1) throw new Error('template tag not found');
const cStart = tStart + OPEN.length;
const cEnd = html.indexOf(CLOSE, cStart);
if (cEnd === -1) throw new Error('template close not found');

let tpl = JSON.parse(html.slice(cStart, cEnd));

const ops = [];
function op(name, find, replace) { ops.push({ name, find, replace }); }

// ── education: margin + lift moved to wrapper ───────────────────────────────
op('edu card margin',
`padding: 24px; display: flex; gap: 20px; margin-bottom: 16px; transition: border-color 0.25s, transform 0.25s, box-shadow 0.25s; backdrop-filter: blur(8px); }`,
`padding: 24px; display: flex; gap: 20px; margin-bottom: 0; transition: border-color 0.25s, box-shadow 0.25s; backdrop-filter: blur(8px); }`);

op('edu card hover',
`    .edu-card:hover { border-color: color-mix(in srgb, var(--accent) 55%, var(--border)); transform: translateY(-3px); box-shadow: 0 14px 40px rgba(0,0,0,0.45), 0 0 24px color-mix(in srgb, var(--accent) 14%, transparent); }`,
`    .edu-card:hover { border-color: color-mix(in srgb, var(--accent) 55%, var(--border)); box-shadow: 0 14px 40px rgba(0,0,0,0.45), 0 0 24px color-mix(in srgb, var(--accent) 14%, transparent); }
    #education .card-glow { margin-bottom: 16px; }
    #education .card-glow:hover { transform: translate3d(0, -3px, 0.01px); }`);

// ── projects / web: lift moved to wrapper ───────────────────────────────────
op('project card hover',
`    .project-card:hover { border-color: color-mix(in srgb, var(--accent) 60%, var(--border)); transform: translateY(-5px); box-shadow: 0 18px 48px rgba(0,0,0,0.5), 0 0 28px color-mix(in srgb, var(--accent) 18%, transparent); }`,
`    .project-card:hover { border-color: color-mix(in srgb, var(--accent) 60%, var(--border)); box-shadow: 0 18px 48px rgba(0,0,0,0.5), 0 0 28px color-mix(in srgb, var(--accent) 18%, transparent); }
    .projects-grid .card-glow:hover { transform: translate3d(0, -5px, 0.01px); }`);

op('web card hover',
`    .web-card:hover { border-color: color-mix(in srgb, var(--accent) 60%, var(--border)); transform: translateY(-5px); box-shadow: 0 18px 48px rgba(0,0,0,0.5), 0 0 28px color-mix(in srgb, var(--accent) 18%, transparent); }`,
`    .web-card:hover { border-color: color-mix(in srgb, var(--accent) 60%, var(--border)); box-shadow: 0 18px 48px rgba(0,0,0,0.5), 0 0 28px color-mix(in srgb, var(--accent) 18%, transparent); }
    .web-grid .card-glow:hover { transform: translate3d(0, -5px, 0.01px); }`);

// ── timeline: pad items so the frame breathes, move spacing to wrapper, and
//    let the dots escape the wrapper's overflow clip ─────────────────────────
op('timeline item',
`    .timeline-item { position: relative; margin-bottom: 44px; }`,
`    .timeline-item { position: relative; margin-bottom: 0; padding: 18px 20px; }`);

op('timeline dot',
`    .timeline-dot { position: absolute; left: -28px; top: 6px;`,
`    .timeline-dot { position: absolute; left: -28px; top: 20px;`);

op('card-glow shared',
`/* Strip the wrapper's own paint so only the inner card's bg/border/shadow show.
   The glow effects (::before/::after/.edge-light) still activate on hover. */
.card-glow.border-glow-card {
  background: transparent;
  border: none;
  box-shadow: none;
}`,
`/* Strip the wrapper's own paint so only the inner card's bg/border/shadow show.
   The glow effects (::before/::after/.edge-light) still activate on hover. */
.card-glow.border-glow-card {
  background: transparent;
  border: none;
  box-shadow: none;
  transition: transform 0.25s ease;
}

/* Timeline: dots sit outside the item box — don't clip them, and keep
   item spacing on the wrapper so the glow frame matches the content. */
.timeline .border-glow-inner { overflow: visible; }
.timeline .card-glow { margin-bottom: 26px; }
.timeline .card-glow:last-child { margin-bottom: 0; }`);

// ── apply ───────────────────────────────────────────────────────────────────
let failed = 0;
for (const { name, find, replace } of ops) {
  const idx = tpl.indexOf(find);
  if (idx === -1) { console.error('MISS:', name); failed++; continue; }
  if (tpl.indexOf(find, idx + 1) !== -1) { console.error('AMBIGUOUS:', name); failed++; continue; }
  tpl = tpl.slice(0, idx) + replace + tpl.slice(idx + find.length);
  console.log('ok:', name);
}
if (failed > 0) { console.error(failed + ' ops failed — aborting, file NOT written'); process.exit(1); }

const encoded = JSON.stringify(tpl).replace(/<\//g, '<\\/');
fs.writeFileSync(FILE, html.slice(0, cStart) + encoded + html.slice(cEnd));
console.log('written:', FILE);
