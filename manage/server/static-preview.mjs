/**
 * 仅托管 blogRoot/public（与 Pages 线上一致）。用法：node static-preview.mjs <port> <publicDir>
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const port = Number(process.argv[2]) || 4010;
const publicDir = path.resolve(process.argv[3] || 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.yml': 'text/yaml; charset=utf-8',
  '.xml': 'application/xml',
};

function safePath(urlPath) {
  const rel = decodeURIComponent(urlPath.split('?')[0]).replace(/^\/+/, '');
  const resolved = path.resolve(publicDir, rel);
  if (resolved === publicDir || resolved.startsWith(publicDir + path.sep)) return resolved;
  return null;
}

function serveFile(res, filePath) {
  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Meiso-Preview': 'build-prod-static',
      });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const headers = {
      'Content-Type': type,
      'X-Meiso-Preview': 'build-prod-static',
    };
    if (ext === '.html' || ext === '.json') headers['Cache-Control'] = 'no-cache';
    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  let urlPath = req.url || '/';
  if (urlPath === '/') urlPath = '/index.html';
  else if (urlPath.endsWith('/')) urlPath += 'index.html';

  let filePath = safePath(urlPath);
  if (!filePath) {
    res.writeHead(403, {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Meiso-Preview': 'build-prod-static',
    });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, st) => {
    if (!err && st.isDirectory()) {
      serveFile(res, path.join(filePath, 'index.html'));
      return;
    }
    if (err) {
      const fallback = safePath('/index.html');
      if (fallback) serveFile(res, fallback);
      else {
        res.writeHead(404, {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Meiso-Preview': 'build-prod-static',
      });
        res.end('Not Found');
      }
      return;
    }
    serveFile(res, filePath);
  });
});

server.listen(port, '127.0.0.1', () => {
  process.stderr.write(`[static-preview] http://127.0.0.1:${port}/ -> ${publicDir}\n`);
});
