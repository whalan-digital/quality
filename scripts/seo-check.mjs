// SEO checks on every built page. Thresholds from quality.config.json -> seo.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'node-html-parser';
import { config, pages, DIST, Report } from './lib.mjs';

export function seoCheck() {
  const r = new Report('SEO');
  const c = config.seo;
  const titles = new Map();
  const descs = new Map();

  for (const f of ['robots.txt', 'sitemap-index.xml']) {
    if (!existsSync(join(DIST, f))) r.error('/', `missing ${f}`);
  }

  for (const { file, url } of pages()) {
    const doc = parse(readFileSync(file, 'utf8'));
    const noindexOk = c.noindexAllowed.some((p) => url === p || url.startsWith(p));
    const robots = doc.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '';
    const isNoindex = robots.includes('noindex');
    if (isNoindex && !noindexOk) r.error(url, 'noindex on a page that should be indexed');
    if (isNoindex) continue; // 404 and ad landing pages: skip the rest

    if (!doc.querySelector('html')?.getAttribute('lang')) r.error(url, 'missing <html lang>');

    const title = doc.querySelector('title')?.text.trim() ?? '';
    if (!title) r.error(url, 'missing <title>');
    else if (title.length < c.title.min || title.length > c.title.max)
      r.error(url, `title is ${title.length} characters (want ${c.title.min}-${c.title.max}): "${title}"`);
    if (titles.has(title)) r.error(url, `duplicate title, also on ${titles.get(title)}`);
    titles.set(title, url);

    const desc = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ?? '';
    if (!desc) r.error(url, 'missing meta description');
    else if (desc.length < c.description.min || desc.length > c.description.max)
      r.error(url, `description is ${desc.length} characters (want ${c.description.min}-${c.description.max})`);
    if (desc && descs.has(desc)) r.error(url, `duplicate description, also on ${descs.get(desc)}`);
    descs.set(desc, url);

    const h1s = doc.querySelectorAll('h1');
    if (h1s.length !== 1) r.error(url, `has ${h1s.length} <h1> elements (want exactly 1)`);

    if (!doc.querySelector('link[rel="canonical"]')?.getAttribute('href')) r.error(url, 'missing canonical link');
    if (!doc.querySelector('meta[property="og:image"]')?.getAttribute('content')) r.error(url, 'missing og:image');

    for (const img of doc.querySelectorAll('img')) {
      if (img.getAttribute('alt') === undefined) r.error(url, `image without alt: ${img.getAttribute('src')}`);
    }

    const ld = doc.querySelectorAll('script[type="application/ld+json"]');
    const types = [];
    for (const s of ld) {
      try {
        const data = JSON.parse(s.text);
        types.push(...[data].flat().map((d) => d['@type']));
      } catch {
        r.error(url, 'invalid JSON-LD (does not parse)');
      }
    }
    if (url === '/' && c.requireLocalBusinessOnHome && !types.some((t) => String(t).includes('LocalBusiness') || String(t).endsWith('Contractor') || String(t).endsWith('Electrician') || String(t).endsWith('Plumber')))
      r.error(url, 'home page has no LocalBusiness JSON-LD');
  }
  return r;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(seoCheck().print() ? 0 : 1);
