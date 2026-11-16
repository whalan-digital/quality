// Tiny static server for dist/ that resolves URLs like Cloudflare assets:
// /contact -> contact.html, unknown -> 404.html. Used by Playwright and Lighthouse.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { resolveUrl, DIST } from './lib.mjs';

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain', '.json': 'application/json', '.ico': 'image/x-icon' };
const port = Number(process.env.PORT ?? 4321);

createServer((req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  const file = resolveUrl(path === '/' ? '/index.html' : path);
  if (!file) {
    res.writeHead(404, { 'content-type': types['.html'] });
    return res.end(readFileSync(join(DIST, '404.html')));
  }
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(port, () => console.log(`serving ${DIST} on http://localhost:${port}`));
