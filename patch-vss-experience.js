const fs = require('fs');

const targets = [
  'D:/Desktop/Tony_personal_website/Tony-Website-Cyber.html',
  'D:/Desktop/Tony_personal_website/index.html',
];

const htmlSafe = (s) => JSON.stringify(s).replace(/<\//g, '<\\/');

// New experience entry — inserted at the top (most recent).
const NEW_ENTRY =
  "  { role:'Co-founder & CTO', company:'VSSPartner', url:'https://www.vsspartner.com/', " +
  "date:'Dec 2025 – Present', loc:'Melbourne, VIC', pts:[" +
  "'Lead technical strategy and product development for a social-media growth marketing agency, bootstrapped as solo CTO'," +
  "'Architected the Xiaohongshu Automation Agent — Playwright-based browser automation with AI pipelines for account warm-up and trend-driven content strategy'," +
  "'Own the full stack end-to-end: browser automation, AI-driven insight reports, and client-facing operational tooling'" +
  "] },\n";

const DATA_OLD = "const EXPERIENCE = [\n";
const DATA_NEW = "const EXPERIENCE = [\n" + NEW_ENTRY;

const RENDER_OLD = "                <div className=\"timeline-company\">{e.company}</div>";
const RENDER_NEW = "                <div className=\"timeline-company\">{e.url ? <a href={e.url} target=\"_blank\" rel=\"noopener\" style={{color:'inherit',textDecoration:'none'}}>{e.company} ↗</a> : e.company}</div>";

for (const path of targets) {
  const html = fs.readFileSync(path, 'utf8');
  const open = '<script type="__bundler/template">\n';
  const close = '\n  </script>';
  const tStart = html.indexOf(open);
  const tContentStart = tStart + open.length;
  const tEnd = html.indexOf(close, tContentStart);
  let template = JSON.parse(html.slice(tContentStart, tEnd));

  if (template.split(DATA_OLD).length - 1 !== 1) throw new Error('EXPERIENCE array start not unique in ' + path);
  template = template.split(DATA_OLD).join(DATA_NEW);

  if (template.split(RENDER_OLD).length - 1 !== 1) throw new Error('timeline-company render marker not unique in ' + path);
  template = template.split(RENDER_OLD).join(RENDER_NEW);

  const out = html.slice(0, tContentStart) + htmlSafe(template) + html.slice(tEnd);
  fs.writeFileSync(path, out);
  console.log('patched', path);
}
