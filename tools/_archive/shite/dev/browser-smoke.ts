/**
 * @module dev/browser-smoke
 * @purpose Drive a real Chromium against the running dev server
 *   (http://127.0.0.1:3000) to verify the full identity-rewrite UX
 *   end-to-end. Captures screenshots at each waypoint and dumps
 *   relevant DOM state so failures point at the specific seam.
 *
 *   Pre-req: `pnpm exec tsx dev/dev-server.ts` running on :3000
 *   Run: `pnpm exec tsx dev/browser-smoke.ts`
 *   Output: PNGs in `dev/smoke-shots/`
 */

import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE = 'http://127.0.0.1:3000';
const OUTDIR = path.resolve(__dirname, 'smoke-shots');

async function main(): Promise<void> {
  fs.mkdirSync(OUTDIR, { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // Pipe page console + errors so a failure leaves a trail.
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`[browser ERROR] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    console.log(`[browser PAGEERROR] ${err.message}`);
  });

  // ── 1. Open root unidentified ────────────────────────────────────
  await page.goto(BASE);
  await page.waitForSelector('#zifmia-root section, #zifmia-root form', { timeout: 5000 });
  await page.screenshot({ path: path.join(OUTDIR, '01-lobby-unauth.png') });
  const rootHTML1 = await page.locator('#zifmia-root').innerHTML();
  console.log('--- 1. UNIDENTIFIED LOAD ---');
  console.log('top-level classes:', await page.locator('#zifmia-root > *').first().getAttribute('class'));
  console.log('has .sharpee-lobby:', rootHTML1.includes('sharpee-lobby'));
  console.log('has identity-form:', rootHTML1.includes('sharpee-identity-form'));
  console.log('Create button text:', await page.locator('[data-role="create-button"]').textContent().catch(() => '(missing)'));

  // ── 2. Click "Pick a handle" to open the identity form ────────────
  await page.locator('[data-role="create-button"]').click();
  await page.waitForSelector('form.sharpee-identity-form', { timeout: 3000 });
  await page.screenshot({ path: path.join(OUTDIR, '02-identity-form.png') });
  console.log('\n--- 2. IDENTITY FORM SHOWN ---');
  console.log('form title:', await page.locator('.sharpee-identity-form-title').textContent());

  // ── 3. Submit a handle ───────────────────────────────────────────
  // Handle must match the server's `[A-Za-z]+` 3–12 char rule. Encode
  // the timestamp using only letters so this stays unique across runs.
  const HANDLE = `smoke${
    Date.now()
      .toString()
      .split('')
      .map((c) => String.fromCharCode('a'.charCodeAt(0) + Number(c)))
      .join('')
      .slice(-4)
  }`;
  await page.locator('input[name="handle"]').fill(HANDLE);
  await page.locator('button[data-role="submit"]').click();
  await page.waitForSelector('.sharpee-lobby', { timeout: 5000 });
  await page.screenshot({ path: path.join(OUTDIR, '03-lobby-identified.png') });
  console.log('\n--- 3. IDENTIFIED LOBBY ---');
  console.log('Create button text:', await page.locator('[data-role="create-button"]').textContent());
  const localStorage = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('sharpee:identity') ?? 'null')
  );
  console.log('localStorage sharpee:identity:', localStorage);

  // ── 4. Open Create Room dialog ──────────────────────────────────
  await page.locator('[data-role="create-button"]').click();
  await page.waitForSelector('dialog[data-role="create-dialog"][open]', { timeout: 3000 }).catch(() => null);
  // Some happy-dom/chromium combos don't get `[open]` natively; verify
  // by presence of the dialog form children instead.
  await page.waitForSelector('[data-role="create-form"]', { timeout: 3000 });
  await page.screenshot({ path: path.join(OUTDIR, '04-create-dialog.png') });
  console.log('\n--- 4. CREATE ROOM DIALOG ---');
  const dropdownOptions = await page.locator('[data-role="create-story"] option').allTextContents();
  console.log('Story dropdown options:', dropdownOptions);

  // ── 5. Pick tiny fixture + submit ───────────────────────────────
  await page.locator('[data-role="create-story"]').selectOption('zifmia-tiny-fixture');
  await page.locator('input[name="title"]').fill('Browser smoke room');
  await page.locator('[data-role="create-submit"]').click();

  // ── 6. Room view should mount ────────────────────────────────────
  await page.waitForSelector('section.sharpee-window[data-role="room-view"]', { timeout: 8000 });
  await page.screenshot({ path: path.join(OUTDIR, '05-room-mounted.png'), fullPage: true });
  console.log('\n--- 5. ROOM VIEW MOUNTED ---');
  const present = async (sel: string): Promise<boolean> => (await page.locator(sel).count()) > 0;
  console.log('  .sharpee-presence-panel:', await present('.sharpee-presence-panel'));
  console.log('  .sharpee-presence-list  :', await present('.sharpee-presence-list'));
  console.log('  .sharpee-prose-pane     :', await present('.sharpee-prose-pane'));
  console.log('  .sharpee-chat-panel     :', await present('.sharpee-chat-panel'));
  console.log('  .sharpee-chat-history   :', await present('.sharpee-chat-history'));
  console.log('  .sharpee-chat-input     :', await present('input.sharpee-chat-input'));
  console.log('  .sharpee-saves-panel    :', await present('.sharpee-saves-panel'));
  console.log('  .sharpee-input-bar      :', await present('.sharpee-input-bar'));
  console.log('  .sharpee-input-field    :', await present('input.sharpee-input-field'));

  // ── 7. Type a command + submit ──────────────────────────────────
  await page.locator('input.sharpee-input-field').fill('look');
  await page.locator('input.sharpee-input-field').press('Enter');
  // Wait for the platform-browser main-channel renderer to append.
  await page.waitForSelector('.sharpee-prose-pane .main-entry', { timeout: 5000 }).catch(() => null);
  await page.screenshot({ path: path.join(OUTDIR, '06-after-look.png'), fullPage: true });
  console.log('\n--- 6. AFTER look COMMAND ---');
  const entryCount = await page.locator('.sharpee-prose-pane .main-entry').count();
  console.log('  .main-entry count:', entryCount);
  if (entryCount > 0) {
    const firstEntry = await page.locator('.sharpee-prose-pane .main-entry').first().textContent();
    console.log('  first entry text:', JSON.stringify(firstEntry?.slice(0, 120)));
  }

  await browser.close();
  console.log(`\nScreenshots written to ${OUTDIR}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.stack ?? err.message : String(err));
  process.exit(1);
});
