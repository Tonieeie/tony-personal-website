const fs = require('fs');

const targets = [
  'D:/Desktop/Tony_personal_website/Tony-Website-Cyber.html',
  'D:/Desktop/Tony_personal_website/index.html',
];

const htmlSafe = (s) => JSON.stringify(s).replace(/<\//g, '<\\/');

const newJpeg = fs.readFileSync('D:/Desktop/Tony_personal_website/screenshots/vsspartner.jpg');
const newB64 = newJpeg.toString('base64');

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
  const template = JSON.parse(html.slice(tContentStart, tEnd));

  // Find the VSSPartner entry in WEB_PRODUCTS and pull its image UUID.
  const re = /\{ name: 'VSSPartner', url: '[^']+', image: '([0-9a-f-]{36})'/;
  const m = template.match(re);
  if (!m) throw new Error('VSSPartner image UUID not found in ' + path);
  const uuid = m[1];
  if (!manifest[uuid]) throw new Error('UUID ' + uuid + ' not present in manifest of ' + path);

  manifest[uuid] = { data: newB64, compressed: false, mime: 'image/jpeg' };

  const out = html.slice(0, mContentStart) + htmlSafe(manifest) + html.slice(mEnd, tContentStart) + htmlSafe(template) + html.slice(tEnd);
  fs.writeFileSync(path, out);
  console.log('patched', path, '(uuid ' + uuid + ', ' + (newJpeg.length/1024).toFixed(1) + ' KB JPEG)');
}
