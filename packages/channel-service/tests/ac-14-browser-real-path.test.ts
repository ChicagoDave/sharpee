/**
 * AC-14 — Browser surface real-path test.
 *
 * Drives `dist/web/dungeo/index.html` end-to-end through Playwright
 * headless Chromium. Validates that the channel-driven path
 * (R5-A/B/C) renders prose and status updates into the host page's
 * existing DOM elements.
 *
 * Real-path: the test exercises the actual production browser bundle
 * (`game.js`) — same code that ships to players. No stubs, no
 * shadow-mode workaround. Per CLAUDE.md rule 12a, this is the
 * acceptance gate for R5.
 *
 * Skips gracefully when:
 *  - The bundle is not built (`dist/web/dungeo/index.html` missing).
 *    Run `node packages/devkit/dist/cli.js build dungeo --browser` to build.
 *  - The Playwright Chromium binary is not installed. Run
 *    `npx playwright install chromium` to install.
 *
 * The test does NOT run in CI by default (vitest's globals filter is
 * scoped to unit tests). To include it: `pnpm vitest run
 * tests/ac-14-browser-real-path` or set `RUN_AC14=1`.
 */

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO_ROOT = resolve(__dirname, '../../..');
const BUNDLE_HTML = resolve(REPO_ROOT, 'dist/web/dungeo/index.html');
const BUNDLE_PRESENT = existsSync(BUNDLE_HTML);

const skipReason = !BUNDLE_PRESENT
  ? 'dist/web/dungeo/index.html missing — run node packages/devkit/dist/cli.js build dungeo --browser'
  : '';

describe.skipIf(!BUNDLE_PRESENT)(
  `AC-14 — Browser real-path against dist/web/dungeo/${skipReason ? ` (skip: ${skipReason})` : ''}`,
  () => {
    it('loads the bundle and produces a banner / opening text in the main slot', async () => {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true });
      try {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();

        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
        page.on('console', (msg) => {
          if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
        });

        await page.goto(pathToFileURL(BUNDLE_HTML).toString());

        // Wait for the channel renderer to populate textContent — the
        // banner / room description fires on the first turn packet.
        await page.waitForFunction(
          () => {
            const el = document.getElementById('text-content');
            return !!el && el.children.length > 0;
          },
          { timeout: 15000 },
        );

        const mainContent = await page.evaluate(() => {
          const el = document.getElementById('text-content');
          return el?.textContent?.trim() ?? '';
        });
        expect(mainContent.length).toBeGreaterThan(0);

        // Channel-driven gate: the R5-C `mainChannel` renderer adds
        // `class="main-entry"` to every appended `<p>`. The legacy
        // `TextDisplay.displayText` path emitted unclassed `<p>`
        // elements only. If this assertion fails, the bundle was built
        // before the R5-C cutover — run
        // `node packages/devkit/dist/cli.js build dungeo --browser` to rebuild.
        const mainEntryCount = await page.evaluate(() => {
          return document.querySelectorAll('#text-content p.main-entry').length;
        });
        expect(
          mainEntryCount,
          'No <p class="main-entry"> elements found — the bundle predates R5-C. ' +
            'Run `node packages/devkit/dist/cli.js build dungeo --browser` to rebuild against the ' +
            'channel-driven BrowserClient.',
        ).toBeGreaterThan(0);

        // Status line should also have populated.
        const location = await page.evaluate(() => {
          return document.getElementById('location-name')?.textContent?.trim() ?? '';
        });
        expect(location.length).toBeGreaterThan(0);

        // Score+turn composite renderer should produce the legacy
        // combined string format.
        const scoreTurn = await page.evaluate(() => {
          return document.getElementById('score-turns')?.textContent?.trim() ?? '';
        });
        expect(scoreTurn).toMatch(/Score:\s*-?\d+\s*\|\s*Turns:\s*\d+/);

        // No page errors.
        expect(errors, errors.join('\n')).toEqual([]);

        await ctx.close();
      } finally {
        await browser.close();
      }
    }, 30000);

    it('typing a command produces additional output in the main slot', async () => {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true });
      try {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        await page.goto(pathToFileURL(BUNDLE_HTML).toString());

        // Wait for initial render.
        await page.waitForFunction(
          () => {
            const el = document.getElementById('text-content');
            return !!el && el.children.length > 0;
          },
          { timeout: 15000 },
        );
        const initialCount = await page.evaluate(() => {
          return document.getElementById('text-content')?.children.length ?? 0;
        });

        // Capture initial turn count.
        const initialTurns = await page.evaluate(() => {
          const el = document.getElementById('score-turns');
          const m = /Turns:\s*(\d+)/.exec(el?.textContent ?? '');
          return m ? Number(m[1]) : -1;
        });

        // Type a command.
        await page.fill('#command-input', 'look');
        await page.press('#command-input', 'Enter');

        // Wait for the next turn to render (more children OR turn count incremented).
        await page.waitForFunction(
          (initial) => {
            const el = document.getElementById('text-content');
            const count = el?.children.length ?? 0;
            const status = document.getElementById('score-turns')?.textContent ?? '';
            const m = /Turns:\s*(\d+)/.exec(status);
            const turns = m ? Number(m[1]) : -1;
            return count > initial.count || turns > initial.turns;
          },
          { count: initialCount, turns: initialTurns },
          { timeout: 10000 },
        );

        await ctx.close();
      } finally {
        await browser.close();
      }
    }, 30000);
  },
);

if (!BUNDLE_PRESENT) {
  // eslint-disable-next-line no-console
  console.log(`[ac-14] Skipping — ${skipReason}`);
}
