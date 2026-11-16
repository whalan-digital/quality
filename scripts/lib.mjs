import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const QUALITY_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
export const config = JSON.parse(readFileSync(join(QUALITY_DIR, 'quality.config.json'), 'utf8'));
export const DIST = process.env.DIST_DIR ? join(process.cwd(), process.env.DIST_DIR) : join(process.cwd(), 'dist');

export function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

/** HTML pages in dist with the URL path Cloudflare serves them at. */
export function pages() {
  if (!existsSync(DIST)) throw new Error(`No build found at ${DIST}. Run the site build first.`);
  return walk(DIST)
    .filter((f) => f.endsWith('.html'))
    .map((file) => {
      let url = '/' + relative(DIST, file).split(sep).join('/');
      url = url.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
      return { file, url: url || '/' };
    })
    .sort((a, b) => a.url.localeCompare(b.url));
}

/** Resolve a site-relative URL to a file in dist, the way Cloudflare assets does. */
export function resolveUrl(urlPath) {
  const clean = decodeURIComponent(urlPath.split('#')[0].split('?')[0]);
  const base = join(DIST, clean);
  for (const c of [base, base + '.html', join(base, 'index.html')]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

export class Report {
  constructor(name) { this.name = name; this.errors = []; this.warnings = []; }
  add(level, where, msg) { (level === 'error' ? this.errors : this.warnings).push(`${where}: ${msg}`); }
  error(where, msg) { this.add('error', where, msg); }
  warn(where, msg) { this.add('warn', where, msg); }
  print() {
    const status = this.errors.length ? 'FAIL' : 'PASS';
    console.log(`\n[${status}] ${this.name} (${this.errors.length} errors, ${this.warnings.length} warnings)`);
    for (const e of this.errors) console.log(`  ✗ ${e}`);
    for (const w of this.warnings) console.log(`  ! ${w}`);
    return this.errors.length === 0;
  }
}
