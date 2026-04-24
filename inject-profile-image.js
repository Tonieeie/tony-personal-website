const fs = require('fs');
const crypto = require('crypto');

const HTML_PATH = 'D:/Desktop/Tony_personal_website/Tony-Website-Cyber.html';
const IMG_PATH = 'D:/Desktop/4e7e2c953b5d505ecb843d0cd833a36.jpg';
const MIME = 'image/jpeg';

const html = fs.readFileSync(HTML_PATH, 'utf8');

const manifestOpen = '<script type="__bundler/manifest">\n';
const templateOpen = '<script type="__bundler/template">\n';
const closeTag = '\n  </script>';

const mStart = html.indexOf(manifestOpen);
if (mStart === -1) throw new Error('manifest tag not found');
const mContentStart = mStart + manifestOpen.length;
const mEnd = html.indexOf(closeTag, mContentStart);
if (mEnd === -1) throw new Error('manifest close not found');

const tStart = html.indexOf(templateOpen, mEnd);
if (tStart === -1) throw new Error('template tag not found');
const tContentStart = tStart + templateOpen.length;
const tEnd = html.indexOf(closeTag, tContentStart);
if (tEnd === -1) throw new Error('template close not found');

const manifest = JSON.parse(html.slice(mContentStart, mEnd));
const template = JSON.parse(html.slice(tContentStart, tEnd));

console.log('Manifest entries:', Object.keys(manifest).length);
console.log('Template length:', template.length);

const imgBytes = fs.readFileSync(IMG_PATH);
const imgB64 = imgBytes.toString('base64');
const imgUuid = crypto.randomUUID();
console.log('New image UUID:', imgUuid, 'bytes:', imgBytes.length, 'base64 len:', imgB64.length);

manifest[imgUuid] = { data: imgB64, compressed: false, mime: MIME };

const oldBlock = `<div className="about-avatar">
          <div style={{fontSize:'52px'}}>👨‍💻</div>
          <div style={{fontSize:'10px',color:'var(--muted)',textAlign:'center',padding:'0 12px',lineHeight:1.5}}>photo<br/>placeholder</div>
        </div>`;

if (!template.includes(oldBlock)) {
  throw new Error('avatar placeholder JSX not found in template');
}

const newBlock = `<div className="about-avatar" style={{padding:0,overflow:'hidden'}}>
          <img src="${imgUuid}" alt="Bingsen (Tony) Teng" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} />
        </div>`;

const newTemplate = template.split(oldBlock).join(newBlock);

// JSON lives inside <script> tags — any literal `</script>` (or `</style>`, etc.)
// in the content would terminate the outer tag. Escape `</` → `<\/`, which is
// still valid JSON but inert to the HTML parser.
const htmlSafe = (obj) => JSON.stringify(obj).replace(/<\//g, '<\\/');

const rebuilt =
  html.slice(0, mContentStart) +
  htmlSafe(manifest) +
  html.slice(mEnd, tContentStart) +
  htmlSafe(newTemplate) +
  html.slice(tEnd);

fs.writeFileSync(HTML_PATH, rebuilt);
console.log('Wrote', rebuilt.length, 'bytes');
