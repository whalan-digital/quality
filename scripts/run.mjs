// Entry point: `node run.mjs fast|full`, run from the client site's root
// after `astro build`. Exit code 1 blocks the deploy.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { QUALITY_DIR, DIST } from './lib.mjs';
import { seoCheck } from './seo-check.mjs';
import { budgetCheck } from './budget-check.mjs';
import { headersCheck } from './headers-check.mjs';
import { linksCheck } from './links-check.mjs';

const level = process.argv[2] === 'full' ? 'full' : 'fast';
console.log(`Whalan Digital quality gate: ${level}`);
let ok = true;

for (const check of [seoCheck, budgetCheck, headersCheck, linksCheck]) ok = check().print() && ok;

const run = (label, cmd, args, env = {}) => {
  console.log(`\n--- ${label} ---`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } });
  const pass = r.status === 0;
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${label}`);
  return pass;
};

ok = run('HTML validation', join(QUALITY_DIR, 'node_modules/.bin/html-validate'),
  ['--config', join(QUALITY_DIR, '.htmlvalidate.json'), `${DIST}/**/*.html`]) && ok;

ok = run('Accessibility and layout (Playwright)', join(QUALITY_DIR, 'node_modules/.bin/playwright'),
  ['test', '--config', join(QUALITY_DIR, 'playwright.config.mjs')], { GATE_LEVEL: level }) && ok;

if (level === 'full') {
  ok = run('Lighthouse (mobile, median of runs)', 'node', [join(QUALITY_DIR, 'scripts/lighthouse.mjs')]) && ok;
}

console.log(`\n${ok ? 'GATE PASSED' : 'GATE FAILED: deploy blocked'}`);
process.exit(ok ? 0 : 1);
