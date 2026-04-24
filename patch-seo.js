const fs = require('fs');

const targets = [
  'D:/Desktop/Tony_personal_website/Tony-Website-Cyber.html',
  'D:/Desktop/Tony_personal_website/index.html',
];

const htmlSafe = (s) => JSON.stringify(s).replace(/<\//g, '<\\/');

const CANONICAL = 'https://tonyteng.dev/';
const OG_IMAGE  = CANONICAL + 'profile.jpg';
const DESC      = "Bingsen (Tony) Teng — Master of Computer Science at the University of Melbourne. Developer, cryptography tutor, and CTO. Portfolio covering cybersecurity, AI systems, penetration testing, and software engineering.";
const SHORT     = "Developer · Cybersecurity · AI Systems. MCS @ University of Melbourne.";
const KEYWORDS  = "Bingsen Teng, Tony Teng, Bingsen Tony Teng, Tony Teng Melbourne, Bingsen Teng Melbourne, Tony Teng developer, Bingsen Teng developer, Tony Teng University of Melbourne, cybersecurity, penetration testing, AI systems, portfolio";

const jsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Bingsen Teng",
  "alternateName": ["Tony Teng", "Bingsen (Tony) Teng"],
  "givenName": "Bingsen",
  "additionalName": "Tony",
  "familyName": "Teng",
  "jobTitle": "Developer",
  "description": DESC,
  "worksFor": { "@type": "Organization", "name": "VSSPartner" },
  "alumniOf": { "@type": "CollegeOrUniversity", "name": "University of Melbourne" },
  "url": CANONICAL,
  "image": OG_IMAGE,
  "sameAs": ["https://github.com/Tonieeie"],
  "email": "mailto:bingsen.teng777@gmail.com",
  "address": { "@type": "PostalAddress", "addressLocality": "Melbourne", "addressRegion": "VIC", "addressCountry": "AU" },
  "knowsAbout": ["Cybersecurity", "Penetration Testing", "Cryptography", "Artificial Intelligence", "Computer Vision", "Reinforcement Learning"]
});

const SEO_BLOCK = [
  '  <meta name="description" content="' + DESC + '">',
  '  <meta name="keywords" content="' + KEYWORDS + '">',
  '  <meta name="author" content="Bingsen (Tony) Teng">',
  '  <meta name="robots" content="index, follow">',
  '  <link rel="canonical" href="' + CANONICAL + '">',
  '  <meta property="og:type" content="profile">',
  '  <meta property="og:site_name" content="Tony Teng">',
  '  <meta property="og:title" content="Bingsen (Tony) Teng — Developer">',
  '  <meta property="og:description" content="' + SHORT + '">',
  '  <meta property="og:url" content="' + CANONICAL + '">',
  '  <meta property="og:image" content="' + OG_IMAGE + '">',
  '  <meta property="og:image:width" content="1200">',
  '  <meta property="og:image:height" content="1200">',
  '  <meta property="og:image:alt" content="Bingsen (Tony) Teng">',
  '  <meta property="profile:first_name" content="Bingsen">',
  '  <meta property="profile:last_name" content="Teng">',
  '  <meta property="profile:username" content="Tonieeie">',
  '  <meta name="twitter:card" content="summary_large_image">',
  '  <meta name="twitter:title" content="Bingsen (Tony) Teng — Developer">',
  '  <meta name="twitter:description" content="' + SHORT + '">',
  '  <meta name="twitter:image" content="' + OG_IMAGE + '">',
  '  <script type="application/ld+json">' + jsonLd + '</script>',
].join('\n');

const TITLE_LINE = '<title>Bingsen (Tony) Teng — Developer</title>';

for (const path of targets) {
  const html = fs.readFileSync(path, 'utf8');

  if (html.includes('og:title') || html.includes('application/ld+json')) {
    console.log('skip (SEO already present):', path);
    continue;
  }

  const tOpen = '<script type="__bundler/template">\n';
  const close = '\n  </script>';
  const tStart = html.indexOf(tOpen);
  const tContentStart = tStart + tOpen.length;
  const tEnd = html.indexOf(close, tContentStart);

  // Bundled template lives inside a JSON string. Parse, patch its <head>,
  // re-encode with htmlSafe so </script> inside doesn't break the outer tag.
  const templateStr = JSON.parse(html.slice(tContentStart, tEnd));
  if (templateStr.split(TITLE_LINE).length - 1 !== 1) throw new Error('template <title> not unique in ' + path);
  const newTemplate = templateStr.replace(TITLE_LINE, TITLE_LINE + '\n' + SEO_BLOCK);

  // Outer <head> is the first occurrence of TITLE_LINE in the raw HTML
  // (which sits above the template's <script> block). Do the template
  // rewrite first so its byte offsets don't shift when we edit above.
  let newHtml = html.slice(0, tContentStart) + htmlSafe(newTemplate) + html.slice(tEnd);
  const firstTitleIdx = newHtml.indexOf(TITLE_LINE);
  if (firstTitleIdx === -1) throw new Error('outer <title> not found in ' + path);
  newHtml = newHtml.slice(0, firstTitleIdx + TITLE_LINE.length) + '\n' + SEO_BLOCK + newHtml.slice(firstTitleIdx + TITLE_LINE.length);

  fs.writeFileSync(path, newHtml);
  console.log('patched', path);
}
