/**
 * theme-switch.spec.ts — ADR-188 Phase 4 visual acceptance (AC-5, AC-8).
 *
 * Owner: @sharpee/platform-browser visual QA.
 *
 * AC-5: with the engine + several theme packages linked (as a built page ships),
 *       flipping `data-theme` between the default and any installed theme re-skins
 *       the page.
 * AC-8: selecting a theme whose package is NOT linked (an uninstalled/persisted id)
 *       falls back to the `:root` "classic" default — never unskinned, no error.
 *
 * Real-path: links all four built-in theme CSS files (from platform-browser's
 * styles/themes/) after the engine — exactly the `<link>` set the build emits —
 * then drives `data-theme` from the document and reads computed styles in Chromium.
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/test';
import { buildFixture } from './fixture';

// Built-in themes ship with platform-browser under styles/themes/ (ADR-188).
const THEMES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../styles/themes');
const ALL_THEME_CSS = ['modern-dark', 'retro-terminal', 'paper', 'system-6'].map((id) =>
  resolve(THEMES_DIR, `${id}.css`),
);

async function bodyBg(page: Page): Promise<string> {
  return page.$eval('body', (el) => getComputedStyle(el).backgroundColor.trim());
}
async function setTheme(page: Page, id: string): Promise<void> {
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), id);
}

const CLASSIC_BG = 'rgb(0, 0, 170)'; // #0000aa — the :root default

test.describe('ADR-188 theme switching (AC-5, AC-8)', () => {
  test('flipping data-theme across linked packages re-skins the page', async ({ page }) => {
    // Start on the classic default with all four theme packages linked.
    await page.goto(
      buildFixture('switch-all-themes', { dataTheme: 'classic', themeCssPath: ALL_THEME_CSS }),
    );
    expect(await bodyBg(page)).toBe(CLASSIC_BG);

    await setTheme(page, 'modern-dark');
    expect(await bodyBg(page)).toBe('rgb(30, 30, 46)'); // #1e1e2e

    await setTheme(page, 'retro-terminal');
    expect(await bodyBg(page)).toBe('rgb(10, 10, 10)'); // #0a0a0a

    await setTheme(page, 'paper');
    expect(await bodyBg(page)).toBe('rgb(245, 245, 240)'); // #f5f5f0

    await setTheme(page, 'system-6');
    expect(await bodyBg(page)).toBe('rgb(170, 170, 170)'); // desktop-bg flourish

    // Back to the default.
    await setTheme(page, 'classic');
    expect(await bodyBg(page)).toBe(CLASSIC_BG);
  });

  test('an uninstalled/persisted theme id falls back to the classic default', async ({
    page,
  }) => {
    // modern-dark applied, then a persisted id whose package is NOT among the linked set.
    await page.goto(
      buildFixture('switch-uninstalled', {
        dataTheme: 'modern-dark',
        themeCssPath: ALL_THEME_CSS,
      }),
    );
    expect(await bodyBg(page)).toBe('rgb(30, 30, 46)');

    await setTheme(page, 'a-theme-with-no-package');
    expect(await bodyBg(page)).toBe(CLASSIC_BG); // degrades to :root, not unskinned
  });
});
