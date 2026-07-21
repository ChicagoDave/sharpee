/**
 * shoot-wireframes.mjs — render the wireframe variants to PNG for review.
 *
 * Screenshots every wf-*.html at desktop (1280) and mobile (390, nav menu
 * open via ?menu=open) and composes two contact sheets:
 * contact-desktop.png and contact-mobile.png. Playwright via the zifmia
 * install (the g2/g3 browser-proof pattern).
 *
 * Run: node docs/design/wireframes/shoot-wireframes.mjs
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..');

const zifmiaRequire = createRequire(join(REPO_ROOT, 'tools', 'zifmia', 'package.json'));
const { chromium } = zifmiaRequire('@playwright/test');
const browser = await chromium.launch({ headless: true }).catch(() => chromium.launch({ channel: 'chrome', headless: true }));

const variants = readdirSync(HERE).filter((f) => /^wf-.*\.html$/.test(f)).sort();

for (const f of variants) {
  const base = f.replace('.html', '');
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 });
  await desktop.goto('file://' + join(HERE, f), { waitUntil: 'load' });
  await desktop.screenshot({ path: join(HERE, `${base}-desktop.png`) });
  await desktop.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 1.5 });
  await mobile.goto('file://' + join(HERE, f) + '?menu=open', { waitUntil: 'load' });
  await mobile.screenshot({ path: join(HERE, `${base}-mobile.png`) });
  await mobile.close();
  console.log(`shot ${base}`);
}

// Contact sheets: one page per form factor embedding the shots side by side.
const sheet = (kind, cols, width) => `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin:0; padding:24px; background:#FFFFFF; font:13px -apple-system,sans-serif; color:#1B2C41; }
  h1 { font-size:18px; margin:0 0 16px; }
  .grid { display:grid; grid-template-columns:repeat(${cols},1fr); gap:20px; }
  figure { margin:0; } img { width:100%; border:1px solid #D1D1D1; border-radius:6px; display:block; }
  figcaption { padding:6px 2px; font-weight:600; }
</style></head><body>
  <h1>Sharpee wireframes — ${kind}${kind === 'mobile' ? ' (nav open)' : ''}</h1>
  <div class="grid">${variants.map((f) => {
    const base = f.replace('.html', '');
    return `<figure><img src="${base}-${kind}.png"><figcaption>${base}</figcaption></figure>`;
  }).join('')}</div>
</body></html>`;

for (const [kind, cols, width] of [['desktop', 2, 1500], ['mobile', 4, 1400]]) {
  const file = join(HERE, `contact-${kind}.html`);
  writeFileSync(file, sheet(kind, cols, width));
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1.5 });
  await page.goto('file://' + file, { waitUntil: 'load' });
  await page.screenshot({ path: join(HERE, `contact-${kind}.png`), fullPage: true });
  await page.close();
  console.log(`sheet contact-${kind}.png`);
}
await browser.close();
