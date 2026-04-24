const fs = require('fs');

const targets = [
  'D:/Desktop/Tony_personal_website/Tony-Website-Cyber.html',
  'D:/Desktop/Tony_personal_website/index.html',
];

const htmlSafe = (s) => JSON.stringify(s).replace(/<\//g, '<\\/');

for (const path of targets) {
  const html = fs.readFileSync(path, 'utf8');
  const templateOpen = '<script type="__bundler/template">\n';
  const closeTag = '\n  </script>';
  const tStart = html.indexOf(templateOpen);
  const tContentStart = tStart + templateOpen.length;
  const tEnd = html.indexOf(closeTag, tContentStart);
  const template = JSON.parse(html.slice(tContentStart, tEnd));

  const oldStr = '~/tony<span>.sh</span>';
  const newStr = '~/tonyteng<span>.dev</span>';
  if (!template.includes(oldStr)) throw new Error('nav logo not found in ' + path);
  const newTemplate = template.split(oldStr).join(newStr);

  const out =
    html.slice(0, tContentStart) + htmlSafe(newTemplate) + html.slice(tEnd);
  fs.writeFileSync(path, out);
  console.log('patched', path);
}
