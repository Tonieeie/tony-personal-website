const fs = require('fs');

const targets = [
  'D:/Desktop/Tony_personal_website/Tony-Website-Cyber.html',
  'D:/Desktop/Tony_personal_website/index.html',
];

const htmlSafe = (s) => JSON.stringify(s).replace(/<\//g, '<\\/');

const DATA_OLD = "date:'Dec 2025 – Present', featured:true }";
const DATA_NEW = "date:'Dec 2025 – Present', featured:true, url:'https://github.com/Tonieeie/xiaohongshu-bot-releases' }";

const RENDER_OLD = [
  "        {PROJECTS.map((p, i) => (",
  "          <div key={i} className={`project-card reveal ${p.featured ? 'featured' : ''}`} style={{transitionDelay:`${i*70}ms`}}>",
  "            <div className=\"project-top\">",
  "              <span className=\"project-icon\">⬡</span>",
  "              {p.featured && <span className=\"project-badge\">★ featured</span>}",
  "            </div>",
  "            <div className=\"project-name\">{p.name}</div>",
  "            <div className=\"project-desc\">{p.desc}</div>",
  "            <div className=\"project-tags\">{p.tags.map(t => <span key={t} className=\"project-tag\">{t}</span>)}</div>",
  "            <div className=\"project-date\">{p.date}</div>",
  "          </div>",
  "        ))}",
].join("\n");

const RENDER_NEW = [
  "        {PROJECTS.map((p, i) => {",
  "          const Tag = p.url ? 'a' : 'div';",
  "          const linkProps = p.url ? { href: p.url, target: '_blank', rel: 'noopener' } : {};",
  "          return (",
  "          <Tag key={i} {...linkProps} className={`project-card reveal ${p.featured ? 'featured' : ''}`} style={{transitionDelay:`${i*70}ms`, textDecoration:'none', color:'inherit', cursor: p.url ? 'pointer' : 'default'}}>",
  "            <div className=\"project-top\">",
  "              <span className=\"project-icon\">⬡</span>",
  "              {p.featured && <span className=\"project-badge\">★ featured</span>}",
  "            </div>",
  "            <div className=\"project-name\">{p.name}{p.url && ' ↗'}</div>",
  "            <div className=\"project-desc\">{p.desc}</div>",
  "            <div className=\"project-tags\">{p.tags.map(t => <span key={t} className=\"project-tag\">{t}</span>)}</div>",
  "            <div className=\"project-date\">{p.date}</div>",
  "          </Tag>",
  "          );",
  "        })}",
].join("\n");

for (const path of targets) {
  const html = fs.readFileSync(path, 'utf8');
  const open = '<script type="__bundler/template">\n';
  const close = '\n  </script>';
  const tStart = html.indexOf(open);
  const tContentStart = tStart + open.length;
  const tEnd = html.indexOf(close, tContentStart);
  let template = JSON.parse(html.slice(tContentStart, tEnd));

  if (!template.includes(DATA_OLD)) throw new Error('project data marker not found in ' + path);
  template = template.split(DATA_OLD).join(DATA_NEW);

  if (!template.includes(RENDER_OLD)) throw new Error('projects map JSX not found in ' + path);
  template = template.split(RENDER_OLD).join(RENDER_NEW);

  const out = html.slice(0, tContentStart) + htmlSafe(template) + html.slice(tEnd);
  fs.writeFileSync(path, out);
  console.log('patched', path);
}
