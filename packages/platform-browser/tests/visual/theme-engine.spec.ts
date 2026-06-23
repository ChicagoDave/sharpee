/**
 * theme-engine.spec.ts — ADR-188 Phase 1 visual acceptance (AC-1, AC-7).
 *
 * Owner: @sharpee/platform-browser visual QA.
 *
 * AC-1: the engine + `:root` default alone (zero themes) renders a fully
 *       skinned white-on-blue ("classic") UI.
 * AC-7: an unknown theme id, and an unset token within a theme, both fall
 *       back to the `:root` default — never unskinned. (No fallback code;
 *       the cascade provides it.)
 *
 * Real-path: loads the actual styles/engine.css + styles/base.css against
 * the real `.sharpee-*` shell DOM in Chromium and reads computed styles.
 */

import { test, expect, type Page } from '@playwright/test';
import { buildFixture } from './fixture';

/** Computed value of a CSS property for the first matching element. */
async function computed(page: Page, selector: string, prop: string): Promise<string> {
  return page.$eval(
    selector,
    (el, p) => getComputedStyle(el as Element).getPropertyValue(p as string).trim(),
    prop,
  );
}

// Classic ("white-on-blue") token → computed rgb() expectations.
const CLASSIC = {
  bg: 'rgb(0, 0, 170)', // #0000aa
  bgAlt: 'rgb(0, 0, 136)', // #000088
  text: 'rgb(255, 255, 255)', // #ffffff
  accent: 'rgb(0, 170, 170)', // #00aaaa
  accentText: 'rgb(0, 0, 0)', // #000000
};

/** Asserts the page is rendering the classic default skin. */
async function expectClassicSkin(page: Page): Promise<void> {
  // Body — the headline AC-1 signal.
  expect(await computed(page, 'body', 'background-color')).toBe(CLASSIC.bg);
  expect(await computed(page, 'body', 'color')).toBe(CLASSIC.text);
  expect(await computed(page, 'body', 'font-family')).toContain('Perfect DOS VGA 437');

  // Title bar uses the alt background (proves engine component rules apply).
  expect(await computed(page, '.sharpee-window-title-bar', 'background-color')).toBe(
    CLASSIC.bgAlt,
  );

  // Status bar — accent on accent-text.
  expect(await computed(page, '#status-line', 'background-color')).toBe(CLASSIC.accent);
  expect(await computed(page, '#status-line', 'color')).toBe(CLASSIC.accentText);

  // Input bar border consumes the border token at 2px.
  expect(await computed(page, '#input-area', 'border-top-width')).toBe('2px');
  expect(await computed(page, '#input-area', 'border-top-color')).toBe(CLASSIC.accent);

  // Negative guard: NOT the browser's raw/unstyled defaults.
  expect(await computed(page, 'body', 'background-color')).not.toBe('rgba(0, 0, 0, 0)');
  expect(await computed(page, 'body', 'background-color')).not.toBe('rgb(255, 255, 255)');
}

test.describe('ADR-188 theme engine', () => {
  test('AC-1: engine + :root only renders fully-skinned white-on-blue', async ({ page }) => {
    await page.goto(buildFixture('ac1-zero-theme', { dataTheme: null }));
    await expectClassicSkin(page);
  });

  test('AC-7: an unknown theme id falls back to the :root default', async ({ page }) => {
    await page.goto(
      buildFixture('ac7-unknown-theme', { dataTheme: 'nonexistent-xyz-9000' }),
    );
    // No CSS matches that selector, so :root tokens still drive the skin.
    await expectClassicSkin(page);
  });

  test('AC-7: an unset token within a theme falls back per-token to :root', async ({
    page,
  }) => {
    // A theme that overrides ONLY --theme-bg (to red) and defines nothing else.
    await page.goto(
      buildFixture('ac7-partial-theme', {
        dataTheme: 'partial',
        extraStyle: '[data-theme="partial"] { --theme-bg: #ff0000; }',
      }),
    );
    // Override applies...
    expect(await computed(page, 'body', 'background-color')).toBe('rgb(255, 0, 0)');
    // ...but the unset --theme-text gracefully degrades to the :root default.
    expect(await computed(page, 'body', 'color')).toBe(CLASSIC.text);
    expect(await computed(page, '#status-line', 'background-color')).toBe(CLASSIC.accent);
  });
});
