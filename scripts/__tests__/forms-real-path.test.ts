/**
 * forms-real-path.test.ts — a player names a thing in the other number,
 * through the real compiled bundle (`dist/cli/sharpee.js`) against the
 * `refectory` test story at seed 42 (`test-stories/refectory/refectory.test-set.md`
 * OB-62, OB-63).
 *
 * The compiler worked the candles' `candle` and their alias's `pricket` out
 * once and wrote the mouse's `mice` as the author gave it; the bundle's
 * loader, matcher and validator read those forms and work nothing out. Each
 * command must print the thing's own description, never the refusal.
 *
 * Public interface: none (a test file).
 * Owner context: repo tooling — `scripts/__tests__/` (the real-path suites
 * that drive the built CLIs).
 */
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(__dirname, '..', '..');
const BUNDLE = join(REPO_ROOT, 'dist', 'cli', 'sharpee.js');
const STORY = join(REPO_ROOT, 'test-stories', 'refectory', 'refectory.story');

const CANDLES = 'Tallow candles, each one pressed onto an iron pricket.';
const MOUSE = 'A small grey mouse with one torn ear.';
const REFUSAL = "You can't see any such thing.";

/**
 * Play the story with one typed command and return what the turn printed.
 *
 * @param command the player's command
 * @returns the lines between the command's prompt and the next prompt
 * @throws Error when the process fails or the command's prompt never appears
 */
function play(command: string): string {
  const result = spawnSync('node', [BUNDLE, '--play', '--story', STORY, '--seed', '42'], {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    input: `${command}\n`,
    timeout: 60_000,
  });
  if (result.status !== 0) {
    throw new Error(`the bundle exited ${result.status}:\n${result.stdout}\n${result.stderr}`);
  }
  const out = result.stdout ?? '';
  const prompt = out.indexOf('> ');
  if (prompt < 0) throw new Error(`no prompt in the bundle's output:\n${out}`);
  const reply = out.slice(prompt + 2);
  const next = reply.indexOf('> ');
  return next < 0 ? reply : reply.slice(0, next);
}

describe('refectory OB-62: a plural thing and its plural alias answer to their worked-out singulars', () => {
  for (const command of ['examine candle', 'examine pricket', 'examine candles', 'examine prickets']) {
    it(`\`${command}\` prints the candles' description`, () => {
      const reply = play(command);
      expect(reply).toContain(CANDLES);
      expect(reply).not.toContain(REFUSAL);
    });
  }
});

describe('refectory OB-63: a written irregular plural answers', () => {
  for (const command of ['examine mice', 'examine mouse']) {
    it(`\`${command}\` prints the mouse's description`, () => {
      const reply = play(command);
      expect(reply).toContain(MOUSE);
      expect(reply).not.toContain(REFUSAL);
    });
  }
});
