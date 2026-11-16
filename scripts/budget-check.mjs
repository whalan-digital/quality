// Page-weight budgets. Thresholds from quality.config.json -> budgets.
import { readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { parse } from 'node-html-parser';
import { config, pages, resolveUrl, walk, DIST, Report } from './lib.mjs';

const kb = (bytes) => Math.round(bytes / 102.4) / 10;

export function budgetCheck() {
  const r = new Report('Page weight budgets');
  const b = config.budgets;

  const fonts = walk(DIST).filter((f) => /\.(woff2?|ttf|otf)$/i.test(f));
  if (fonts.length > b.maxFontFiles) r.error('/', `${fonts.length} font files (max ${b.maxFontFiles})`);

  for (const { file, url } of pages()) {
    const html = readFileSync(file, 'utf8');
    const doc = parse(html);
    let jsGzip = 0;
    let total = statSync(file).size;
    const seen = new Set();

    for (const s of doc.querySelectorAll('script[src]')) {
      const src = s.getAttribute('src');
      if (/^https?:\/\//.test(src) || src.startsWith('//')) {
        const host = new URL(src, 'https://x').host;
        if (!b.allowedScriptHosts.includes(host)) r.error(url, `third-party script not on allow-list: ${host}`);
        continue;
      }
      const f = resolveUrl(src);
      if (!f) { r.error(url, `script not found: ${src}`); continue; }
      jsGzip += gzipSync(readFileSync(f)).length;
      if (!seen.has(f)) { total += statSync(f).size; seen.add(f); }
    }
    for (const s of doc.querySelectorAll('script:not([src])')) {
      if (s.getAttribute('type') === 'application/ld+json') continue;
      jsGzip += gzipSync(Buffer.from(s.text)).length;
    }
    if (kb(jsGzip) > b.jsPerPageKbGzip) r.error(url, `${kb(jsGzip)} KB of JS gzipped (max ${b.jsPerPageKbGzip})`);

    for (const l of doc.querySelectorAll('link[rel="stylesheet"]')) {
      const f = resolveUrl(l.getAttribute('href'));
      if (f && !seen.has(f)) { total += statSync(f).size; seen.add(f); }
    }

    for (const img of doc.querySelectorAll('img')) {
      const src = img.getAttribute('src');
      if (!src || /^(https?:|data:)/.test(src)) continue;
      const f = resolveUrl(src);
      if (!f) { r.error(url, `image not found: ${src}`); continue; }
      const size = statSync(f).size;
      if (kb(size) > b.maxImageKb) r.error(url, `image ${src} is ${kb(size)} KB (max ${b.maxImageKb})`);
      if (!seen.has(f)) { total += size; seen.add(f); }
    }

    if (url === '/' && kb(total) > b.homePageTotalKb)
      r.error(url, `home page weighs ${kb(total)} KB before third parties (max ${b.homePageTotalKb})`);
  }
  return r;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(budgetCheck().print() ? 0 : 1);
