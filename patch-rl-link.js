const fs = require('fs');

const targets = [
  'D:/Desktop/Tony_personal_website/Tony-Website-Cyber.html',
  'D:/Desktop/Tony_personal_website/index.html',
];

const htmlSafe = (s) => JSON.stringify(s).replace(/<\//g, '<\\/');

const OLD = "tags:['RL','Python','Game Theory','AI'], date:'2024', featured:false }";
const NEW = "tags:['RL','Python','Game Theory','AI'], date:'2024', featured:false, url:'https://www.youtube.com/watch?v=3bphbkNTPxU' }";

for (const path of targets) {
  const html = fs.readFileSync(path, 'utf8');
  const open = '<script type="__bundler/template">\n';
  const close = '\n  </script>';
  const tStart = html.indexOf(open);
  const tContentStart = tStart + open.length;
  const tEnd = html.indexOf(close, tContentStart);
  let template = JSON.parse(html.slice(tContentStart, tEnd));

  const hits = template.split(OLD).length - 1;
  if (hits !== 1) throw new Error('expected 1 match, got ' + hits + ' in ' + path);
  template = template.split(OLD).join(NEW);

  const out = html.slice(0, tContentStart) + htmlSafe(template) + html.slice(tEnd);
  fs.writeFileSync(path, out);
  console.log('patched', path);
}
