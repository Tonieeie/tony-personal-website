const fs = require('fs');

const targets = [
  'D:/Desktop/Tony_personal_website/Tony-Website-Cyber.html',
  'D:/Desktop/Tony_personal_website/index.html',
];

const htmlSafe = (s) => JSON.stringify(s).replace(/<\//g, '<\\/');

// Revert previous render (company-name-as-link with arrow) and instead:
//   - keep company name clean
//   - add a small URL line under it, clickable, showing the domain
const OLD_RENDER = "                <div className=\"timeline-company\">{e.url ? <a href={e.url} target=\"_blank\" rel=\"noopener\" style={{color:'inherit',textDecoration:'none'}}>{e.company} ↗</a> : e.company}</div>";
const NEW_RENDER =
  "                <div className=\"timeline-company\">{e.company}</div>\n" +
  "                {e.url && <div style={{color:'var(--muted)',fontSize:'11px',marginBottom:'2px'}}><a href={e.url} target=\"_blank\" rel=\"noopener\" style={{color:'var(--accent2)',textDecoration:'none'}}>{e.url.replace(/^https?:\\/\\//,'').replace(/\\/$/,'')} ↗</a></div>}";

for (const path of targets) {
  const html = fs.readFileSync(path, 'utf8');
  const open = '<script type="__bundler/template">\n';
  const close = '\n  </script>';
  const tStart = html.indexOf(open);
  const tContentStart = tStart + open.length;
  const tEnd = html.indexOf(close, tContentStart);
  let template = JSON.parse(html.slice(tContentStart, tEnd));

  if (template.split(OLD_RENDER).length - 1 !== 1) {
    throw new Error('previous company-link render not found in ' + path);
  }
  template = template.split(OLD_RENDER).join(NEW_RENDER);

  const out = html.slice(0, tContentStart) + htmlSafe(template) + html.slice(tEnd);
  fs.writeFileSync(path, out);
  console.log('patched', path);
}
