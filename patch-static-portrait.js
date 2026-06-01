const fs = require('fs');

const targets = [
  'D:/Desktop/Tony_personal_website/Tony-Website-Cyber.html',
  'D:/Desktop/Tony_personal_website/index.html',
];

const htmlSafe = (obj) => JSON.stringify(obj).replace(/<\//g, '<\\/');

const cssAnchor = '.about-card .pc-card { height: auto; max-height: none; }';
const cssInsert = cssAnchor + `
.about-portrait { width: 100%; max-width: 340px; margin: 0 auto; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
.about-portrait img { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; display: block; }
.about-portrait-info { padding: 16px 18px; text-align: center; }
.about-portrait-name { font-size: 16px; font-weight: 600; color: var(--text); }
.about-portrait-title { font-size: 12px; color: var(--muted); margin-top: 4px; }
.about-portrait-contact { display: inline-block; margin-top: 14px; padding: 8px 18px; border: 1px solid var(--accent); border-radius: var(--radius); color: var(--accent); text-decoration: none; font-size: 12px; transition: background 0.2s, color 0.2s; }
.about-portrait-contact:hover { background: var(--accent); color: var(--bg); }`;

for (const path of targets) {
  const html = fs.readFileSync(path, 'utf8');
  const tOpen = '<script type="__bundler/template">\n';
  const close = '\n  </script>';
  const tStart = html.indexOf(tOpen) + tOpen.length;
  const tEnd = html.indexOf(close, tStart);
  let tpl = JSON.parse(html.slice(tStart, tEnd));

  // 1) Replace the animated <ProfileCard .../> with a static portrait card.
  const pcStart = tpl.indexOf('<ProfileCard');
  if (pcStart === -1) throw new Error('ProfileCard not found in ' + path);
  const pcEnd = tpl.indexOf('/>', pcStart) + 2;
  const pcBlock = tpl.slice(pcStart, pcEnd);

  const uuidM = pcBlock.match(/avatarUrl="([0-9a-f-]{36})"/);
  if (!uuidM) throw new Error('avatarUrl uuid not found in ' + path);
  const uuid = uuidM[1];

  const staticBlock = `<div className="about-portrait">
            <img src="${uuid}" alt="Bingsen (Tony) Teng" loading="lazy" />
            <div className="about-portrait-info">
              <div className="about-portrait-name">Bingsen (Tony) Teng</div>
              <div className="about-portrait-title">Developer · Melbourne, VIC</div>
              <a className="about-portrait-contact" href="mailto:bingsen.teng777@gmail.com">Contact Me</a>
            </div>
          </div>`;

  tpl = tpl.slice(0, pcStart) + staticBlock + tpl.slice(pcEnd);

  // 2) Add static-portrait CSS (idempotent).
  if (!tpl.includes('.about-portrait {')) {
    if (!tpl.includes(cssAnchor)) throw new Error('css anchor not found in ' + path);
    tpl = tpl.replace(cssAnchor, cssInsert);
  }

  const out = html.slice(0, tStart) + htmlSafe(tpl) + html.slice(tEnd);
  fs.writeFileSync(path, out);
  console.log('patched', path, '(uuid ' + uuid + ')');
}
