const fs = require('fs');

const path = 'D:/Desktop/Tony_personal_website/index.html';

const htmlSafe = (s) => JSON.stringify(s).replace(/<\//g, '<\\/');

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

// isolate the EXPERIENCE array literal
const arrOpen = 'const EXPERIENCE = [\n';
const aStart = template.indexOf(arrOpen);
if (aStart === -1) throw new Error('EXPERIENCE array not found');
const bodyStart = aStart + arrOpen.length;
const bodyEnd = template.indexOf('\n];', bodyStart);
if (bodyEnd === -1) throw new Error('EXPERIENCE array end not found');

const entries = template.slice(bodyStart, bodyEnd).split('\n');
const iCto = entries.findIndex((l) => l.includes("role:'CTO'"));
const iTutor = entries.findIndex((l) => l.startsWith("  { role:'Tutor"));
if (iCto === -1 || iTutor === -1) throw new Error('CTO/Tutor entries not found');
if (iTutor !== iCto + 1) throw new Error('expected Tutor directly after CTO, got ' + iCto + '/' + iTutor);

[entries[iCto], entries[iTutor]] = [entries[iTutor], entries[iCto]];

template = template.slice(0, bodyStart) + entries.join('\n') + template.slice(bodyEnd);

const out = html.slice(0, tContentStart) + htmlSafe(template) + html.slice(tEnd);
fs.writeFileSync(path, out);

// sanity check: template must still round-trip as JSON
const check = fs.readFileSync(path, 'utf8');
JSON.parse(check.slice(check.indexOf(open) + open.length, check.indexOf(close, check.indexOf(open))));
console.log('patched', path);
