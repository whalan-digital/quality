// Builds a Lighthouse CI config from quality.config.json and runs it.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { config, pages, QUALITY_DIR } from './lib.mjs';

const lh = config.lighthouse;
const urls = pages().filter((p) => p.url !== '/404').slice(0, lh.maxPages)
  .map((p) => `http://localhost:4321${p.url}`);

const assertions = {};
for (const [cat, { min, level }] of Object.entries(lh.scores)) assertions[`categories:${cat}`] = [level, { minScore: min }];
for (const [audit, rule] of Object.entries(lh.metrics)) {
  assertions[audit] = [rule.level, { maxNumericValue: rule.maxMs ?? rule.max, aggregationMethod: 'median-run' }];
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const noindexPattern = `^http://localhost:4321(${config.seo.noindexAllowed.map(escape).join('|')})`;
const withoutSeo = Object.fromEntries(Object.entries(assertions).filter(([k]) => k !== 'categories:seo'));

const rc = {
  ci: {
    collect: {
      url: urls,
      numberOfRuns: lh.runs,
      startServerCommand: `node ${join(QUALITY_DIR, 'scripts/serve.mjs')}`,
      startServerReadyPattern: 'serving',
      settings: { chromeFlags: '--no-sandbox --headless=new' },
    },
    // Noindex pages (404, /lp/ ad landing pages) still get speed and accessibility
    // assertions, but not the SEO score: noindex caps it at 69 by design.
    assert: {
      assertMatrix: [
        { matchingUrlPattern: noindexPattern, assertions: withoutSeo },
        { matchingUrlPattern: `^(?!${noindexPattern}).*$`, assertions },
      ],
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
};
const file = join(process.cwd(), '.lighthouserc.generated.json');
writeFileSync(file, JSON.stringify(rc, null, 2));
const res = spawnSync('npx', ['--prefix', QUALITY_DIR, 'lhci', 'autorun', `--config=${file}`], { stdio: 'inherit' });
process.exit(res.status ?? 1);
