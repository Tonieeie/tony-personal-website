const fs = require('fs');

const targets = [
  'D:/Desktop/Tony_personal_website/Tony-Website-Cyber.html',
  'D:/Desktop/Tony_personal_website/index.html',
];

const htmlSafe = (s) => JSON.stringify(s).replace(/<\//g, '<\\/');

// Section render order: move <Education /> to just before <Skills />.
const RENDER_OLD =
  "      <About />\n" +
  "      <Skills theme={theme} />\n" +
  "      <Projects />\n" +
  "      <Experience />\n" +
  "      <Education />\n" +
  "      <Contact />";

const RENDER_NEW =
  "      <About />\n" +
  "      <Education />\n" +
  "      <Skills theme={theme} />\n" +
  "      <Projects />\n" +
  "      <Experience />\n" +
  "      <Contact />";

// Nav links: keep the same relative order as sections on the page.
const NAV_OLD = "['about','skills','projects','experience','education','contact']";
const NAV_NEW = "['about','education','skills','projects','experience','contact']";

for (const path of targets) {
  const html = fs.readFileSync(path, 'utf8');
  const open = '<script type="__bundler/template">\n';
  const close = '\n  </script>';
  const tStart = html.indexOf(open);
  const tContentStart = tStart + open.length;
  const tEnd = html.indexOf(close, tContentStart);
  let template = JSON.parse(html.slice(tContentStart, tEnd));

  if (template.split(RENDER_OLD).length - 1 !== 1) throw new Error('section render order block not found in ' + path);
  template = template.split(RENDER_OLD).join(RENDER_NEW);

  if (template.split(NAV_OLD).length - 1 !== 1) throw new Error('nav links array not found in ' + path);
  template = template.split(NAV_OLD).join(NAV_NEW);

  const out = html.slice(0, tContentStart) + htmlSafe(template) + html.slice(tEnd);
  fs.writeFileSync(path, out);
  console.log('patched', path);
}
