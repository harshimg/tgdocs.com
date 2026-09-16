import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, 'dist');
const PORT = process.env.PORT || 4321;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.webmanifest': 'application/manifest+json',
};

const server = http.createServer((req, res) => {
  let reqUrl = req.url.split('?')[0];
  if (reqUrl === '/') reqUrl = '/index.html';

  let filePath = path.join(DIST_DIR, reqUrl);

  // Check if direct file exists
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    if (reqUrl === '/sitemap.xml' && fs.existsSync(path.join(DIST_DIR, 'sitemap-index.xml'))) {
      filePath = path.join(DIST_DIR, 'sitemap-index.xml');
    } else if (fs.existsSync(path.join(filePath, 'index.html'))) {
      filePath = path.join(filePath, 'index.html');
    } else if (fs.existsSync(filePath + '.html')) {
      filePath = filePath + '.html';
    } else {
      // If it's an asset request, 404; else fallback to index.html
      const hasExt = path.extname(reqUrl) !== '';
      if (hasExt) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      filePath = path.join(DIST_DIR, 'index.html');
    }
  }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        res.end('Server error');
        return;
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
      });
      res.end(content);
    });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`TGDocs server ready at http://localhost:${PORT}`);
});
