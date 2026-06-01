const fs = require('fs');
const crypto = require('crypto');

const targets = [
  'D:/Desktop/Tony_personal_website/Tony-Website-Cyber.html',
  'D:/Desktop/Tony_personal_website/index.html',
];

const htmlSafe = (s) => JSON.stringify(s).replace(/<\//g, '<\\/');

const IMG_DIR = 'D:/Desktop/Tony_personal_website/screenshots';
const SITES = [
  { key: 'ausdroid',        name: 'Ausdroid',         url: 'https://www.ausdroid.org/',     desc: 'Robotics & AI Club — University of Melbourne' },
  { key: 'vsspartner',      name: 'VSSPartner',       url: 'https://vsspartner.com/student', desc: 'Social-media growth marketing agency' },
  { key: 'brandpulsemedia', name: 'BrandPulse Media', url: 'https://brandpulsemedia.co/',   desc: 'Digital marketing agency — Melbourne' },
  { key: 'periplerv',       name: 'Periple RV',       url: 'https://www.periplerv.com.au/', desc: 'Premium recreational vehicles — Australia' },
];

for (const path of targets) {
  const html = fs.readFileSync(path, 'utf8');
  const mOpen = '<script type="__bundler/manifest">\n';
  const tOpen = '<script type="__bundler/template">\n';
  const close = '\n  </script>';
  const mStart = html.indexOf(mOpen);
  const mContentStart = mStart + mOpen.length;
  const mEnd = html.indexOf(close, mContentStart);
  const tStart = html.indexOf(tOpen, mEnd);
  const tContentStart = tStart + tOpen.length;
  const tEnd = html.indexOf(close, tContentStart);

  const manifest = JSON.parse(html.slice(mContentStart, mEnd));
  let template = JSON.parse(html.slice(tContentStart, tEnd));

  // Fresh UUIDs each run, consistent across the two targets (we regenerate
  // for the second file — that's fine because they're independent bundles).
  const withUuid = SITES.map(s => {
    const uuid = crypto.randomUUID();
    const bytes = fs.readFileSync(IMG_DIR + '/' + s.key + '.jpg');
    manifest[uuid] = { data: bytes.toString('base64'), compressed: false, mime: 'image/jpeg' };
    return { ...s, uuid };
  });

  // ── CSS insertion ──────────────────────────────────────────
  const CSS_ANCHOR = '    @media (max-width: 640px) {';
  const CSS_INJECT =
    '    /* Web products */\n' +
    '    .web-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px; }\n' +
    '    .web-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; text-decoration: none; color: inherit; display: block; transition: border-color 0.25s, transform 0.25s, box-shadow 0.25s; }\n' +
    '    .web-card:hover { border-color: var(--accent); transform: translateY(-5px); box-shadow: 0 12px 40px rgba(0,0,0,0.4), var(--glow); }\n' +
    '    .web-thumb { aspect-ratio: 16/10; overflow: hidden; border-bottom: 1px solid var(--border); background: var(--bg); }\n' +
    '    .web-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.4s ease; }\n' +
    '    .web-card:hover .web-thumb img { transform: scale(1.04); }\n' +
    '    .web-meta { padding: 14px 16px 16px; }\n' +
    '    .web-name { font-weight: 600; font-size: 14px; margin-bottom: 3px; color: var(--accent); }\n' +
    '    .web-domain { font-size: 11px; color: var(--accent2); margin-bottom: 8px; font-family: var(--font); }\n' +
    '    .web-desc { font-size: 12px; color: var(--muted); line-height: 1.6; }\n\n' +
    CSS_ANCHOR;
  if (template.split(CSS_ANCHOR).length - 1 !== 1) throw new Error('CSS anchor missing in ' + path);
  template = template.split(CSS_ANCHOR).join(CSS_INJECT);
  // Also add mobile override inside the media block (runs after insertion).
  const MQ_OLD = '      .contact-grid { grid-template-columns: 1fr; }';
  const MQ_NEW = '      .contact-grid { grid-template-columns: 1fr; }\n      .web-grid { grid-template-columns: 1fr; }';
  if (template.split(MQ_OLD).length - 1 !== 1) throw new Error('mobile media block marker missing in ' + path);
  template = template.split(MQ_OLD).join(MQ_NEW);

  // ── Data + component insertion ─────────────────────────────
  const WEB_DATA =
    'const WEB_PRODUCTS = [\n' +
    withUuid.map(s =>
      "  { name: '" + s.name.replace(/'/g, "\\'") + "', url: '" + s.url + "', image: '" + s.uuid + "', desc: '" + s.desc.replace(/'/g, "\\'") + "' }"
    ).join(',\n') +
    ',\n];\n\n';

  const COMPONENT =
    '// ── WEB PRODUCTS ────────────────────────────────────────────────────────────\n' +
    WEB_DATA +
    'function WebProducts() {\n' +
    '  return (\n' +
    '    <section id="web" className="section">\n' +
    '      <p className="section-label reveal">$ ls -la ~/web/</p>\n' +
    '      <h2 className="section-title reveal">Web Products</h2>\n' +
    '      <div className="web-grid">\n' +
    '        {WEB_PRODUCTS.map((p, i) => (\n' +
    '          <a key={i} href={p.url} target="_blank" rel="noopener" className="web-card reveal" style={{transitionDelay:`${i*80}ms`}}>\n' +
    '            <div className="web-thumb"><img src={p.image} alt={p.name} loading="lazy" /></div>\n' +
    '            <div className="web-meta">\n' +
    '              <div className="web-name">{p.name} ↗</div>\n' +
    '              <div className="web-domain">{p.url.replace(/^https?:\\/\\//,\'\').replace(/\\/$/,\'\')}</div>\n' +
    '              <div className="web-desc">{p.desc}</div>\n' +
    '            </div>\n' +
    '          </a>\n' +
    '        ))}\n' +
    '      </div>\n' +
    '    </section>\n' +
    '  );\n' +
    '}\n\n';

  const COMPONENT_ANCHOR = '// ── APP ─────────────────────────────────────────────────────────────────────\n';
  if (template.split(COMPONENT_ANCHOR).length - 1 !== 1) throw new Error('APP marker missing in ' + path);
  template = template.split(COMPONENT_ANCHOR).join(COMPONENT + COMPONENT_ANCHOR);

  // Render <WebProducts /> before <Contact />
  const RENDER_OLD = '      <Contact />';
  if (template.split(RENDER_OLD).length - 1 !== 1) throw new Error('<Contact /> render missing in ' + path);
  template = template.split(RENDER_OLD).join('      <WebProducts />\n      <Contact />');

  // Nav link
  const NAV_OLD = "['about','education','skills','projects','experience','contact']";
  const NAV_NEW = "['about','education','skills','projects','experience','web','contact']";
  if (template.split(NAV_OLD).length - 1 !== 1) throw new Error('nav links array missing in ' + path);
  template = template.split(NAV_OLD).join(NAV_NEW);

  const out = html.slice(0, mContentStart) + htmlSafe(manifest) + html.slice(mEnd, tContentStart) + htmlSafe(template) + html.slice(tEnd);
  fs.writeFileSync(path, out);
  console.log('patched', path);
}
