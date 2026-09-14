// The site stores its source as a JSON-encoded HTML template. Update only the
// portrait markup and add the card sources, leaving embedded assets untouched.
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'index.html');
const html = fs.readFileSync(file, 'utf8');
const open = '<script type="__bundler/template">\n';
const start = html.indexOf(open) + open.length;
const end = html.indexOf('\n  </script>', start);
if (start < open.length || end < 0) throw new Error('Bundled template not found');
let template = JSON.parse(html.slice(start, end));
if (template.includes('<HolographicPortrait />')) {
  console.log('Holographic portrait already installed');
  process.exit(0);
}
const portrait = /<div className="about-portrait">[\s\S]*?<\/a>\s*<\/div>\s*<\/div>/;
if (!portrait.test(template)) throw new Error('Static about portrait not found');
template = template.replace(portrait, '<HolographicPortrait />');
template = template.replace('</head>', '  <link rel="stylesheet" href="./assets/holo-card/card.css">\n</head>');
const appScript = '<script type="text/babel">\nconst { useState';
if (!template.includes(appScript)) throw new Error('App script not found');
template = template.replace(appScript, '<script type="text/babel" src="./assets/holo-card/card.jsx"></script>\n' + appScript);
fs.writeFileSync(file, html.slice(0, start) + JSON.stringify(template).replace(/<\//g, '<\\/') + html.slice(end));
console.log('Installed layered portrait in index.html');
