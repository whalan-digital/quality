// Tiny static server for dist/ that resolves URLs like Cloudflare assets:
// /contact -> contact.html, unknown -> 404.html. Used by Playwright and Lighthouse.
// Text responses are compressed the way Cloudflare serves them, so Lighthouse
// measures the bytes real visitors download.
import { createServer } from 'node:http';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { resolveUrl, DIST } from './lib.mjs';

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain', '.json': 'application/json', '.ico': 'image/x-icon' };
const port = Number(process.env.PORT ?? 4321);

const compressible = new Set(['.html', '.css', '.js', '.svg', '.xml', '.txt', '.json']);
const send = (req, res, status, file, type) => {
  const body = readFileSync(file);
  const headers = { 'content-type': type, vary: 'accept-encoding' };
  const accept = req.headers['accept-encoding'] ?? '';
  if (compressible.has(extname(file)) && body.length > 1024) {
    if (/\bbr\b/.test(accept)) {
      return res.writeHead(status, { ...headers, 'content-encoding': 'br' }).end(
        brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } }),
      );
    }
    if (/\bgzip\b/.test(accept)) {
      return res.writeHead(status, { ...headers, 'content-encoding': 'gzip' }).end(gzipSync(body));
    }
  }
  res.writeHead(status, headers).end(body);
};

createServer((req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  const file = resolveUrl(path === '/' ? '/index.html' : path);
  if (!file) {
    return send(req, res, 404, join(DIST, '404.html'), types['.html']);
  }
  send(req, res, 200, file, types[extname(file)] ?? 'application/octet-stream');
}).listen(port, () => console.log(`serving ${DIST} on http://localhost:${port}`));
