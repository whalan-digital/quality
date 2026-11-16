// Accessibility (every gate), responsive and keyboard (full gate only).
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { config, pages } from '../scripts/lib.mjs';

const full = process.env.GATE_LEVEL === 'full';
const all = pages().filter((p) => p.url !== '/404');

for (const { url } of all) {
  test(`axe WCAG 2.2 AA: ${url}`, async ({ page }) => {
    await page.goto(url);
    const results = await new AxeBuilder({ page })
      .withTags(config.accessibility.axeTags)
      .exclude('.cf-turnstile') // third-party widget, outside our control
      .analyze();
    const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.help} x${v.nodes.length}`);
    expect(summary, summary.join('\n')).toEqual([]);
  });
}

if (full) {
  for (const width of config.responsive.widths) {
    for (const { url } of all) {
      test(`no horizontal scroll at ${width}px: ${url}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(url);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `page is ${overflow}px wider than the viewport`).toBeLessThanOrEqual(0);
      });
    }
  }

  test('keyboard: skip link is first and works', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => document.activeElement?.textContent?.trim().toLowerCase() ?? '');
    expect(first).toContain('skip');
    await page.keyboard.press('Enter');
    const id = await page.evaluate(() => document.activeElement?.id);
    expect(id).toBe('main');
  });

  for (const { url } of all) {
    test(`keyboard: every focusable element shows focus: ${url}`, async ({ page }) => {
      await page.goto(url);
      const count = await page.locator('a[href], button, input, textarea, select, summary').count();
      const missing = [];
      for (let i = 0; i < Math.min(count + 1, 60); i++) {
        await page.keyboard.press('Tab');
        const info = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body || el.tagName === 'IFRAME') return null;
          const cs = getComputedStyle(el);
          const visible = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none';
          return { visible, label: `${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || el.id || '').trim().slice(0, 40)}"` };
        });
        if (info && !info.visible) missing.push(info.label);
      }
      expect([...new Set(missing)], 'elements with no visible focus indicator').toEqual([]);
    });
  }
}
