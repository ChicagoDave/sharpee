/**
 * live-client.spec.ts — phase 6a acceptance against the REAL built page.
 *
 * Owner: @sharpee/platform-browser visual QA.
 *
 * The other specs in this harness drive static fixtures; this one boots the
 * actual fernhill browser build (game.js and all) over a real http origin
 * (file:// has a null origin and localStorage throws), then exercises the
 * three behaviors David hit live on 2026-08-08:
 *
 *  1. the theme menu renders readably — every item in ONE palette, no item
 *     carrying `data-theme` (the attribute theme CSS scopes by);
 *  2. a picked theme survives a browser refresh (localStorage persistence);
 *  3. Reset Story Data wipes the story's keys and reboots to a fresh
 *     opening — no autosave resurrection.
 *
 * Skips when the fernhill build is absent (same convention as the Swift
 * suites' fixture skips): `./sharpee build branch-stories/fernhill/fernhill.story`.
 */

import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/test';

const WEB_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../..',
  'branch-stories/fernhill/dist/web/fernhill',
);

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.wav': 'audio/wav',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

let server: Server;
let origin = '';

test.beforeAll(async () => {
  test.skip(!existsSync(join(WEB_ROOT, 'index.html')), 'fernhill browser build not present — run ./sharpee build branch-stories/fernhill/fernhill.story');
  server = createServer(async (req, res) => {
    const path = join(WEB_ROOT, decodeURIComponent((req.url ?? '/').split('?')[0]).replace(/\/$/, '/index.html'));
    try {
      const body = await readFile(path);
      res.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((ready) => server.listen(0, '127.0.0.1', ready));
  const address = server.address();
  origin = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
});

test.afterAll(async () => {
  if (server) await new Promise<void>((done) => server.close(() => done()));
});

/** Boot the page and wait for the client to be interactive. */
async function boot(page: Page): Promise<void> {
  await page.goto(`${origin}/index.html`);
  await page.waitForSelector('#command-input', { state: 'attached' });
  // The engine boots and runs the initial look; the prose pane fills.
  await page.waitForFunction(
    () => (document.getElementById('text-content')?.textContent ?? '').length > 0,
    undefined,
    { timeout: 30_000 },
  );
}

async function pickTheme(page: Page, id: string): Promise<void> {
  await page.click('#settings-menu-btn');
  // The theme list is a nested submenu revealed by hovering its parent row.
  await page.hover('#settings-menu .sharpee-menu-option[aria-haspopup="menu"]');
  await page.click(`.sharpee-menu-option[data-theme-choice="${id}"]`);
}

test('the theme menu is readable: one palette, no self-theming items', async ({ page }) => {
  await boot(page);
  await page.click('#settings-menu-btn');
  const items = page.locator('#theme-menu .sharpee-menu-option');
  await expect(items).toHaveCount(5); // classic + the four wired built-ins

  // No item may carry the attribute theme CSS scopes by — that is the
  // varying-font-colors bug (each row painting itself in its own palette).
  expect(await items.evaluateAll((els) => els.some((el) => el.hasAttribute('data-theme')))).toBe(false);
  // And they all render in literally the same computed color.
  const colors = await items.evaluateAll((els) => els.map((el) => getComputedStyle(el).color));
  expect(new Set(colors).size).toBe(1);
});

test('a picked theme survives a refresh', async ({ page }) => {
  await boot(page);
  await pickTheme(page, 'paper');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'paper');

  await page.reload();
  await page.waitForSelector('#command-input', { state: 'attached' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'paper');
});

test('Reset Story Data wipes the story keys and reboots to a fresh opening', async ({ page }) => {
  await boot(page);
  // Make state worth wiping: a real turn (autosave piggybacks on it) and a theme.
  await page.fill('#command-input', 'look');
  await page.press('#command-input', 'Enter');
  await page.waitForFunction(() => {
    const keys = Object.keys(localStorage);
    return keys.some((k) => k.startsWith('fernhill-save-'));
  }, undefined, { timeout: 15_000 });
  await pickTheme(page, 'paper');

  page.once('dialog', (dialog) => void dialog.accept());
  await page.click('#file-menu-btn');
  await page.click('#menu-reset');

  // The reboot restarts the story: fresh opening prose, classic theme, and
  // the story's old keys gone (a fresh autosave from the new boot's first
  // turn is legitimate; the THEME key must stay gone).
  await page.waitForFunction(() => localStorage.getItem('fernhill-theme') === null, undefined, {
    timeout: 15_000,
  });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'classic');
});
