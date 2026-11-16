// Internal links and assets must resolve to a file in the build.
// External links are checked by lychee in the full gate.
import { readFileSync } from 'node:fs';
import { parse } from 'node-html-parser';
import { pages, resolveUrl, Report } from './lib.mjs';

export function linksCheck() {
  const r = new Report('Internal links');
  for (const { file, url } of pages()) {
    const doc = parse(readFileSync(file, 'utf8'));
    const refs = [
      ...doc.querySelectorAll('a[href]').map((a) => a.getAttribute('href')),
      ...doc.querySelectorAll('img[src], script[src]').map((e) => e.getAttribute('src')),
      ...doc.querySelectorAll('link[rel="stylesheet"][href], link[rel="icon"][href]').map((l) => l.getAttribute('href')),
    ];
    for (const ref of refs) {
      if (!ref || !ref.startsWith('/') || ref.startsWith('//') || ref.startsWith('/api/')) continue;
      if (!resolveUrl(ref)) r.error(url, `broken link: ${ref}`);
    }
  }
  return r;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(linksCheck().print() ? 0 : 1);
