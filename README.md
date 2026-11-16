# quality

Shared quality gates for Whalan Digital client sites. Every client repo calls `.github/workflows/gates.yml`; every pass mark lives in `quality.config.json`. Change a number here and every site's next build uses it.

## Gate levels

| Level | Runs on | Checks |
| --- | --- | --- |
| fast | Pushes to `main`, including client saves from Pages CMS. Deploys on pass. | SEO, page-weight budgets, security headers, internal links, HTML validation, axe WCAG 2.2 AA on every page |
| full | Pull requests, weekly audit, manual runs. Never deploys. | Everything in fast, plus responsive (no sideways scroll at 360/768/1280/1920), keyboard (skip link, visible focus), Lighthouse mobile median of 3 runs, external links (report only) |

## Files

```
quality.config.json        every threshold ('error' blocks, 'warn' reports)
scripts/run.mjs            entry point: node run.mjs fast|full (run from a site root after build)
scripts/seo-check.mjs      titles, descriptions, h1, canonical, OG, JSON-LD, alt, noindex, sitemap/robots
scripts/budget-check.mjs   JS per page, image size, home page weight, fonts, third-party allow-list
scripts/headers-check.mjs  required security headers in dist/_headers
scripts/links-check.mjs    internal links and assets resolve
scripts/lighthouse.mjs     builds the Lighthouse CI config from quality.config.json
scripts/serve.mjs          static server that resolves URLs like Cloudflare
tests/site.spec.mjs        Playwright: axe, responsive, keyboard
.htmlvalidate.json         HTML rules
.github/workflows/gates.yml  reusable workflow: gate, then deploy
```

## Run locally

Clone this repo beside a site repo, then from the site root:

```bash
npm run build
npm ci --prefix ../quality
node ../quality/scripts/run.mjs full
```

Uses your installed Google Chrome (`channel: 'chrome'`), the same as GitHub's ubuntu runners.

## One-time GitHub setup

1. This repo: **Settings > Actions > General > Access**: allow access from repositories owned by `whalan-digital`. Without it, client repos can't call the workflow.
2. While this repo is private, each client repo needs a `QUALITY_TOKEN` Actions secret: a fine-grained token with read-only Contents on this repo. Making this repo public removes that step (it holds no secrets) and is the simpler option.
3. Each client repo also needs `CLOUDFLARE_API_TOKEN` (Workers Scripts edit, D1 edit) and `CLOUDFLARE_ACCOUNT_ID`.

## Changing a threshold

Edit `quality.config.json`, push. Lighthouse scores and metrics take a `"level"` of `"warn"` or `"error"`: add a new or tighter one at `warn`, then promote it to `error` after two sites pass. The other checks are pass/fail; to soften one, change its script.

## Not covered by automation

Screen reader pass, 400% zoom reflow, real-phone testing and form delivery are on the manual launch checklist in the `whalan-website-builds` skill. Field Core Web Vitals (P75) are monitored in Cloudflare Web Analytics, not gated here.
