/**
 * prose-spacing.spec.ts — the gap around a tight prose entry.
 *
 * Owner: @sharpee/platform-browser visual QA.
 *
 * A `main-entry--tight` paragraph stacks flush against its predecessor and
 * says nothing about what follows it (David, 2026-09-06: "the platform
 * printed scenery should be a paragraph with the blank line"). The room
 * description sits tight under the room name; the "You can see … here."
 * paragraph after it keeps its blank line. Real-path: the actual
 * styles/base.css + styles/engine.css against the real shell DOM in
 * Chromium, reading computed margins.
 */

import { test, expect, type Page } from '@playwright/test';
import { buildFixture } from './fixture';

async function margin(page: Page, selector: string, side: 'top' | 'bottom'): Promise<number> {
  const value = await page.$eval(
    selector,
    (el, s) => getComputedStyle(el as Element).getPropertyValue(`margin-${s}`).trim(),
    side,
  );
  return parseFloat(value);
}

test.describe('prose spacing around tight entries', () => {
  test('a tight description is flush under the room name and keeps its blank line before the contents', async ({ page }) => {
    await page.goto(buildFixture('prose-spacing', { dataTheme: null }));
    // The three paragraphs a look renders, as the prose renderer builds them.
    await page.evaluate(() => {
      const pane = document.querySelector('.sharpee-prose-pane') ?? document.body;
      const slot = document.createElement('div');
      slot.id = 'probe-slot';
      slot.innerHTML =
        '<p class="main-entry prose-room-name" id="p-name">Rope Stall</p>' +
        '<p class="main-entry prose-room-description main-entry--tight" id="p-desc">Rope everywhere.</p>' +
        '<p class="main-entry prose-action-result" id="p-contents">You can see a rope dealer here.</p>' +
        // A trailing paragraph so nothing above is the pane's last child (whose bottom margin is zeroed).
        '<p class="main-entry prose-action-result" id="p-tail">On the rope wares you see a length of rope.</p>';
      pane.appendChild(slot);
    });

    const normalBottom = await margin(page, '#p-contents', 'bottom');
    expect(normalBottom).toBeGreaterThan(0);

    // Flush under the name: no gap on either side of that boundary.
    expect(await margin(page, '#p-name', 'bottom')).toBe(0);
    expect(await margin(page, '#p-desc', 'top')).toBe(0);

    // The blank line before the contents line is the description's own
    // bottom margin, which a tight entry keeps.
    expect(await margin(page, '#p-desc', 'bottom')).toBe(normalBottom);

    // Measured, not inferred: the contents paragraph starts a full gap
    // below the description, and the description sits directly under the name.
    const boxes = await page.evaluate(() =>
      ['#p-name', '#p-desc', '#p-contents'].map((id) => {
        const r = document.querySelector(id)!.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom };
      }),
    );
    expect(boxes[1].top - boxes[0].bottom).toBeLessThan(1);
    expect(boxes[2].top - boxes[1].bottom).toBeGreaterThanOrEqual(normalBottom - 1);
  });
});
