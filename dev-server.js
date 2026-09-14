// Tiny static dev server that mirrors GitHub Pages / Netlify behavior:
// serves files from the project root and falls back to 404.html (with a
// real 404 status) for any path that doesn't exist.
//
//   node dev-server.js [port]

const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const ROOT = __dirname;
const PORT = Number(process.argv[2]) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm':  'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jsx':  'text/javascript; charset=utf-8',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.txt':  'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
};

function safeJoin(root, reqPath) {
  const decoded = decodeURIComponent(reqPath.split('?')[0]);
  const resolved = path.normalize(path.join(root, decoded));
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

function send(res, status, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(status, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  let reqPath = url.parse(req.url).pathname || '/';
  if (reqPath === '/') reqPath = '/index.html';

  const target = safeJoin(ROOT, reqPath);
  if (!target) {
    res.writeHead(403); res.end('forbidden'); return;
  }

  fs.stat(target, (err, stat) => {
    if (!err && stat.isDirectory()) {
      const idx = path.join(target, 'index.html');
      if (fs.existsSync(idx)) return send(res, 200, idx);
    }
    if (!err && stat.isFile()) {
      console.log('200', reqPath);
      return send(res, 200, target);
    }
    const notFound = path.join(ROOT, '404.html');
    console.log('404', reqPath);
    if (fs.existsSync(notFound)) return send(res, 404, notFound);
    res.writeHead(404); res.end('not found');
  });
});

server.listen(PORT, () => {
  console.log(`dev server: http://localhost:${PORT}/  (404 -> 404.html)`);
});
