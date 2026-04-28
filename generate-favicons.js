const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const svg = fs.readFileSync(path.join(__dirname, 'favicon.svg'));

const targets = [
  { size: 48,  out: 'favicon-48.png' },
  { size: 192, out: 'favicon-192.png' },
  { size: 180, out: 'apple-touch-icon.png' },
  { size: 32,  out: 'favicon-32.png' },
];

(async () => {
  for (const t of targets) {
    await sharp(svg, { density: 384 })
      .resize(t.size, t.size)
      .png()
      .toFile(path.join(__dirname, t.out));
    console.log('wrote', t.out);
  }
})();
