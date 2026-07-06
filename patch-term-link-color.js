const fs = require('fs');

const path = 'D:/Desktop/Tony_personal_website/index.html';

const htmlSafe = (s) => JSON.stringify(s).replace(/<\//g, '<\\/');

const OLD = '.term-link { color: var(--accent); text-decoration: none; }';
const NEW = '.term-link { color: var(--text); text-decoration: none; }';

let html = fs.readFileSync(path, 'utf8');
// git autocrlf may have converted the file to CRLF, which breaks the "\n" markers
if (html.includes('\r\n')) html = html.replace(/\r\n/g, '\n');

const open = '<script type="__bundler/template">\n';
const close = '\n  </script>';
const tStart = html.indexOf(open);
if (tStart === -1) throw new Error('template open tag not found');
const tContentStart = tStart + open.length;
const tEnd = html.indexOf(close, tContentStart);
let template = JSON.parse(html.slice(tContentStart, tEnd));

const hits = template.split(OLD).length - 1;
if (hits !== 1) throw new Error('expected 1 match, got ' + hits);
template = template.split(OLD).join(NEW);

const out = html.slice(0, tContentStart) + htmlSafe(template) + html.slice(tEnd);
fs.writeFileSync(path, out);

// sanity check: template must still round-trip as JSON
const check = fs.readFileSync(path, 'utf8');
JSON.parse(check.slice(check.indexOf(open) + open.length, check.indexOf(close, check.indexOf(open))));
console.log('patched', path);
