/**
 * opening-baseline.test.ts — how a story opens in the bundle's `--play`
 * mode, compared byte for byte with a recording made before the opening
 * stopped being a turn. Spawns the real compiled bundle
 * (`dist/cli/sharpee.js`) against the `quay` test story at a pinned seed and
 * reads the opening off its standard output: everything after the list of
 * special commands, up to the first prompt.
 *
 * Record mode: `RECORD_OPENING_BASELINE=1` writes the recording instead of
 * comparing against it. It is run once, on the platform as it stood before
 * the change, and never again without a ruling. One ruling has moved it
 * since (David, 2026-11-18): the bundle's banner follows `sharpee play`'s
 * line order, so the credits line now sits above the story version. The
 * recording's two lines were swapped for that and nothing else.
 *
 * Public interface: none (a test file).
 * Owner context: repo tooling — `scripts/__tests__/` (the real-path suites
 * that drive the built CLIs; `test-stories/quay/quay.test-set.md` OB-46).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(__dirname, '..', '..');
const BUNDLE = join(REPO_ROOT, 'dist', 'cli', 'sharpee.js');
const STORY = join(REPO_ROOT, 'test-stories', 'quay', 'quay.story');
const BASELINE = join(REPO_ROOT, 'test-stories', 'quay', 'baseline', 'quay-play.txt');
const recording = process.env.RECORD_OPENING_BASELINE === '1';

/** The last line the bundle prints before the opening. */
const LAST_HELP_LINE = '  /inv, /i     - Shortcut for "inventory"';

/**
 * Play the story with one typed command and cut the opening out of what the
 * process printed.
 *
 * @returns the opening, from its first line to the line before the first prompt
 * @throws Error when the process fails or prints no help block or no prompt
 */
function playOpening(): string {
  const result = spawnSync('node', [BUNDLE, '--play', '--story', STORY, '--seed', '42'], {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    input: 'wait\n',
    timeout: 60_000,
  });
  if (result.status !== 0) {
    throw new Error(`the bundle exited ${result.status}:\n${result.stdout}\n${result.stderr}`);
  }
  const lines = (result.stdout ?? '').split('\n');
  const help = lines.indexOf(LAST_HELP_LINE);
  if (help < 0) throw new Error(`no help block in the bundle's output:\n${result.stdout}`);
  const prompt = lines.findIndex((line, index) => index > help && line.startsWith('> '));
  if (prompt < 0) throw new Error(`no prompt after the opening:\n${result.stdout}`);
  // One blank line separates the help block from the opening.
  return lines.slice(help + 2, prompt).join('\n') + '\n';
}

describe('the opening in the bundle\'s play mode, against the recording made before the change', () => {
  it('a story with no opening block opens byte for byte as recorded (OB-46)', () => {
    const opening = playOpening();

    if (recording) {
      mkdirSync(dirname(BASELINE), { recursive: true });
      writeFileSync(BASELINE, opening, 'utf-8');
    }
    expect(existsSync(BASELINE), `no recording at ${BASELINE}`).toBe(true);
    expect(opening).toBe(readFileSync(BASELINE, 'utf-8'));

    // The recording is of an opening, not of an empty stretch of output: the
    // prologue, the banner and the first room are in it, in that order.
    const prologue = opening.indexOf('The last ferry left an hour ago');
    const banner = opening.indexOf('The Quay\nBy Test Story\nStory v0.0.1');
    const room = opening.indexOf('You have not stood here since you were a child');
    expect(prologue).toBe(0);
    expect(banner).toBeGreaterThan(prologue);
    expect(room).toBeGreaterThan(banner);
  });
});
