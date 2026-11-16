// Security headers must be set for every path in dist/_headers.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { config, DIST, Report } from './lib.mjs';

export function headersCheck() {
  const r = new Report('Security headers');
  const file = join(DIST, '_headers');
  if (!existsSync(file)) { r.error('/', 'no _headers file in the build'); return r; }
  const lines = readFileSync(file, 'utf8').split('\n');
  let inAll = false;
  const found = new Set();
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) { inAll = line.trim() === '/*'; continue; }
    if (inAll) found.add(line.split(':')[0].trim().toLowerCase());
  }
  for (const h of config.headers.required) {
    if (!found.has(h.toLowerCase())) r.error('/*', `missing ${h}`);
  }
  return r;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(headersCheck().print() ? 0 : 1);
