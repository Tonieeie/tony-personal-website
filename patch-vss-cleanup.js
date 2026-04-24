const fs = require('fs');

const targets = [
  'D:/Desktop/Tony_personal_website/Tony-Website-Cyber.html',
  'D:/Desktop/Tony_personal_website/index.html',
];

const htmlSafe = (s) => JSON.stringify(s).replace(/<\//g, '<\\/');

// VSSPartner experience entry: change role to just "CTO" and drop url: field
// (which also removes the small domain line, since the render is conditional
// on e.url being set).
const OLD_ENTRY = "{ role:'Co-founder & CTO', company:'VSSPartner', url:'https://www.vsspartner.com/', ";
const NEW_ENTRY = "{ role:'CTO', company:'VSSPartner', ";

for (const path of targets) {
  const html = fs.readFileSync(path, 'utf8');
  const open = '<script type="__bundler/template">\n';
  const close = '\n  </script>';
  const tStart = html.indexOf(open);
  const tContentStart = tStart + open.length;
  const tEnd = html.indexOf(close, tContentStart);
  let template = JSON.parse(html.slice(tContentStart, tEnd));

  if (template.split(OLD_ENTRY).length - 1 !== 1) throw new Error('VSSPartner experience entry not matched in ' + path);
  template = template.split(OLD_ENTRY).join(NEW_ENTRY);

  const out = html.slice(0, tContentStart) + htmlSafe(template) + html.slice(tEnd);
  fs.writeFileSync(path, out);
  console.log('patched', path);
}
