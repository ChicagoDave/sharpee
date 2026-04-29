/**
 * StatusLine helpers for e2e tests.
 *
 * Public interface: {@link readStatusLine} — parses the rendered StatusLine
 * text into `{ location, score, turns }`.
 *
 * Bounded context: tools/server/e2e — autonomous tooling scope. The format
 * is `<LOCATION>  Score: N | Turns: M` per
 * `tools/server/client/src/components/StatusLine.tsx`. The status line
 * surfaces `—` (em-dash) glyphs while the world mirror is unhydrated;
 * {@link readStatusLine} waits until both `score` and `turns` are numeric
 * before returning, so tests don't capture transient `—` values.
 */

import { expect, type Page } from '@playwright/test';

export interface StatusLineSnapshot {
  location: string;
  score: number;
  turns: number;
  /** Raw text content for diagnostic logging. */
  raw: string;
}

const STATUS_RE = /Score:\s*(\d+)\s*\|\s*Turns:\s*(\d+)/;

/**
 * Read the current StatusLine into a numeric snapshot.
 *
 * Waits up to `timeoutMs` for the score+turns regex to match — ensures the
 * mirror has hydrated past the initial `—` placeholder. Throws if the
 * regex never matches within the timeout.
 *
 * @param page       Playwright Page (room view must be mounted)
 * @param timeoutMs  poll budget (default 15 s)
 */
export async function readStatusLine(
  page: Page,
  timeoutMs = 15_000,
): Promise<StatusLineSnapshot> {
  const statusLine = page.getByRole('status', { name: 'Game status' });
  await expect(statusLine).toBeVisible();
  const raw = await expect
    .poll(async () => (await statusLine.textContent()) ?? '', {
      timeout: timeoutMs,
    })
    .toMatch(STATUS_RE);
  // `expect.poll` returns void; re-read to get the text we matched on.
  const text = (await statusLine.textContent()) ?? '';
  void raw; // suppress unused-binding lint; the assertion above is the load-bearing piece

  const match = STATUS_RE.exec(text);
  if (!match) {
    throw new Error(
      `readStatusLine: regex matched in poll but not on re-read: "${text}"`,
    );
  }
  // Location is the leftmost run of non-Score text. The full text reads e.g.
  // "WEST OF HOUSE  Score: 0 | Turns: 1" — split on "Score:" and trim.
  const beforeScore = text.split('Score:')[0] ?? '';
  return {
    location: beforeScore.trim(),
    score: Number(match[1]),
    turns: Number(match[2]),
    raw: text,
  };
}
