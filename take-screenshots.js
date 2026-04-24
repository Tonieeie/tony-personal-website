const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.join('D:/Desktop/Tony_personal_website', 'screenshots');
fs.mkdirSync(OUT_DIR, { recursive: true });

const SITES = [
  { key: 'ausdroid',        url: 'https://www.ausdroid.org/' },
  { key: 'vsspartner',      url: 'https://www.vsspartner.com/' },
  { key: 'brandpulsemedia', url: 'https://brandpulsemedia.co/' },
  { key: 'periplerv',       url: 'https://www.periplerv.com.au/' },
];

for (const s of SITES) {
  const outPath = path.join(OUT_DIR, s.key + '.png');
  console.log('capturing', s.key, '→', s.url);
  try {
    execFileSync(CHROME, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-sandbox',
      '--window-size=1440,900',
      '--virtual-time-budget=12000',
      '--screenshot=' + outPath,
      s.url,
    ], { stdio: 'inherit', timeout: 60000 });
  } catch (e) {
    console.error(' failed:', e.message);
    continue;
  }
  if (fs.existsSync(outPath)) {
    console.log(' ok', (fs.statSync(outPath).size / 1024).toFixed(1), 'KB');
  } else {
    console.error(' no file produced');
  }
}
