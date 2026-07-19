/**
 * shoot-site.mjs — screenshot the live Next.js site (WF-B shell) for review.
 * Boots `next start` on a free port, shoots home + a doc page (desktop) and
 * the doc page with the drawer open (mobile), writes site-*.png beside the
 * wireframes for comparison. Run after `npm run build` in website/.
 */
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..');
const WEBSITE = join(REPO_ROOT, 'website');
const PORT = 4823;

const server = spawn('npm', ['run', 'start', '--', '-p', String(PORT)], { cwd: WEBSITE, stdio: 'pipe' });
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('next start timeout')), 30_000);
  server.stdout.on('data', (d) => {
    if (String(d).includes('Ready')) { clearTimeout(timer); resolve(); }
  });
  server.on('exit', (c) => reject(new Error(`next start exited ${c}`)));
});

const zifmiaRequire = createRequire(join(REPO_ROOT, 'tools', 'zifmia', 'package.json'));
const { chromium } = zifmiaRequire('@playwright/test');
const browser = await chromium.launch({ headless: true }).catch(() => chromium.launch({ channel: 'chrome', headless: true }));
try {
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 });
  await desktop.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await desktop.screenshot({ path: join(HERE, 'site-home-desktop.png') });
  await desktop.goto(`http://127.0.0.1:${PORT}/chord/getting-started/install`, { waitUntil: 'networkidle' });
  await desktop.screenshot({ path: join(HERE, 'site-doc-desktop.png') });
  await desktop.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 1.5 });
  await mobile.goto(`http://127.0.0.1:${PORT}/chord/getting-started/install`, { waitUntil: 'networkidle' });
  await mobile.click('button[aria-label="Toggle navigation"]');
  await mobile.waitForTimeout(300);
  await mobile.screenshot({ path: join(HERE, 'site-doc-mobile.png') });
  await mobile.close();
  console.log('shot site-home-desktop, site-doc-desktop, site-doc-mobile');
} finally {
  await browser.close();
  server.kill();
}
