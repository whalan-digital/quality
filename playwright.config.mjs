import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: join(here, 'tests'),
  reporter: [['list']],
  fullyParallel: true,
  // System Chrome: preinstalled on GitHub's ubuntu runners, so no browser download.
  use: { baseURL: 'http://localhost:4321', channel: 'chrome' },
  webServer: {
    command: `node ${join(here, 'scripts/serve.mjs')}`,
    url: 'http://localhost:4321/',
    reuseExistingServer: true,
    cwd: process.cwd(),
  },
});
