/**
 * theme-parity.spec.ts — ADR-188 Phase 3 visual acceptance (AC-3).
 *
 * Owner: @sharpee/platform-browser visual QA.
 *
 * AC-3: the built-in themes ship with platform-browser (styles/themes/) and, when
 *       linked after the engine and selected via `data-theme`, render
 *       IDENTICALLY to the pre-extraction build (computed-style parity).
 *
 * Real-path: links each package's actual `theme.css` (the published artifact,
 * resolved via `require.resolve`) after the real engine/base CSS, against the
 * real `.sharpee-*` shell DOM in Chromium, and reads computed styles. The
 * asserted values are the themes' own token palettes + flourishes — exactly
 * what the former `[data-theme]`-scoped kits rendered.
 *
 * Scope: four built-in themes (modern-dark, retro-terminal, paper, system-6),
 * loaded from platform-browser's own styles/themes/. dos-classic is the `:root`
 * "classic" default (ADR-188 R7) — covered by theme-engine.spec.ts.
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/test';
import { buildFixture } from './fixture';

// Built-in themes ship with platform-browser under styles/themes/ (ADR-188).
const THEMES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../styles/themes');
const themeCss = (id: string): string => resolve(THEMES_DIR, `${id}.css`);

/** Computed value of a CSS property for the first matching element. */
async function computed(page: Page, selector: string, prop: string): Promise<string> {
  return page.$eval(
    selector,
    (el, p) => getComputedStyle(el as Element).getPropertyValue(p as string).trim(),
    prop,
  );
}

test.describe('ADR-188 theme-package parity (AC-3)', () => {
  test('modern-dark renders its palette via the engine (no flourishes)', async ({
    page,
  }) => {
    await page.goto(
      buildFixture('parity-modern-dark', {
        dataTheme: 'modern-dark',
        themeCssPath: themeCss('modern-dark'),
      }),
    );
    // Tokens drive the engine's un-scoped component layer.
    expect(await computed(page, 'body', 'background-color')).toBe('rgb(30, 30, 46)'); // #1e1e2e
    expect(await computed(page, 'body', 'color')).toBe('rgb(205, 214, 244)'); // #cdd6f4
    expect(await computed(page, 'body', 'font-family')).toContain('Inter');
    expect(await computed(page, '.sharpee-window-title-bar', 'background-color')).toBe(
      'rgb(24, 24, 37)', // #181825 bg-alt
    );
    expect(await computed(page, '#status-line', 'background-color')).toBe(
      'rgb(137, 180, 250)', // #89b4fa accent
    );
    expect(await computed(page, '#status-line', 'color')).toBe('rgb(30, 30, 46)'); // accent-text
    expect(await computed(page, '#input-area', 'border-top-color')).toBe(
      'rgb(49, 50, 68)', // #313244 border
    );
  });

  test('retro-terminal renders its palette + scanline/glow flourish', async ({ page }) => {
    await page.goto(
      buildFixture('parity-retro-terminal', {
        dataTheme: 'retro-terminal',
        themeCssPath: themeCss('retro-terminal'),
      }),
    );
    expect(await computed(page, 'body', 'background-color')).toBe('rgb(10, 10, 10)'); // #0a0a0a
    expect(await computed(page, 'body', 'color')).toBe('rgb(0, 255, 0)'); // #00ff00
    expect(await computed(page, 'body', 'font-family')).toContain('JetBrains Mono');
    expect(await computed(page, '#status-line', 'background-color')).toBe('rgb(0, 255, 0)'); // accent
    // Flourishes: scanline gradient overlay + phosphor glow.
    expect(await computed(page, 'body', 'background-image')).toContain('gradient');
    expect(await computed(page, 'body', 'text-shadow')).not.toBe('none');
    expect(await computed(page, 'body', 'text-shadow')).toContain('0, 255, 0');
  });

  test('paper renders its light palette via the engine', async ({ page }) => {
    await page.goto(
      buildFixture('parity-paper', {
        dataTheme: 'paper',
        themeCssPath: themeCss('paper'),
      }),
    );
    expect(await computed(page, 'body', 'background-color')).toBe('rgb(245, 245, 240)'); // #f5f5f0
    expect(await computed(page, 'body', 'color')).toBe('rgb(26, 26, 26)'); // #1a1a1a
    expect(await computed(page, 'body', 'font-family')).toContain('Crimson Text');
    expect(await computed(page, '#status-line', 'background-color')).toBe(
      'rgb(44, 44, 44)', // #2c2c2c accent
    );
    expect(await computed(page, '#status-line', 'color')).toBe('rgb(245, 245, 240)'); // accent-text
  });

  test('system-6 renders its distinct Mac chrome flourishes', async ({ page }) => {
    await page.goto(
      buildFixture('parity-system-6', {
        dataTheme: 'system-6',
        themeCssPath: themeCss('system-6'),
      }),
    );
    // Flourish: body paints the DESKTOP background (#aaaaaa), not the window bg.
    expect(await computed(page, 'body', 'background-color')).toBe('rgb(170, 170, 170)');
    expect(await computed(page, 'body', 'color')).toBe('rgb(0, 0, 0)');
    expect(await computed(page, 'body', 'font-family')).toContain('FindersKeepers');
    // Flourish: striped title bar (1-bit gradient) in the chrome font.
    expect(await computed(page, '.sharpee-window-title-bar', 'background-image')).toContain(
      'gradient',
    );
    expect(await computed(page, '.sharpee-window-title-bar', 'font-family')).toContain(
      'ChicagoFLF',
    );
    // Flourish: status bar uses window bg (white) + border, NOT the engine accent.
    expect(await computed(page, '#status-line', 'background-color')).toBe(
      'rgb(255, 255, 255)',
    );
    expect(await computed(page, '#status-line', 'color')).toBe('rgb(0, 0, 0)');
    // Flourish: input bar border is 1px (engine default is 2px).
    expect(await computed(page, '#input-area', 'border-top-width')).toBe('1px');
  });
});
