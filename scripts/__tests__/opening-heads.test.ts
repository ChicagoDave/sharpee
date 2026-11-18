/**
 * opening-heads.test.ts — the bundle's `--play` and `--exec` modes open a
 * story with the engine's opening routine and print its packets in the
 * story's order. Spawns the real compiled bundle (`dist/cli/sharpee.js`)
 * against the `quay` test story's copies, which differ only in their
 * `when the game starts` block (and, for the clock copy, in three clocks).
 *
 * What is asserted: the author's order reaches the page; a routine left out
 * is not printed; an empty opening prints nothing; and nothing has run when
 * the first command is typed, so the clocks answer the first `wait`, not the
 * opening.
 *
 * Public interface: none (a test file).
 * Owner context: repo tooling — `scripts/__tests__/` (the real-path suites
 * that drive the built CLIs; `test-stories/quay/quay.test-set.md`).
 */
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(__dirname, '..', '..');
const BUNDLE = join(REPO_ROOT, 'dist', 'cli', 'sharpee.js');
const SEEDED = join(REPO_ROOT, 'test-stories', 'quay', 'seeded');

const PROLOGUE = 'The last ferry left an hour ago';
const BANNER = 'The Quay\nStory v0.0.1';
const ROOM = 'You have not stood here since you were a child';
const TIDE = 'The water under the quay stops moving.';
const HUNGER = 'You have not eaten since the morning boat.';

/**
 * Run `--exec` on one quay copy and split what it printed at the first
 * command's echo.
 *
 * @param copy the story file's name under `test-stories/quay/seeded/`
 * @param commands the `--exec` command list
 * @returns the opening (everything before the first `> ` echo, the seed line
 *   removed) and the rest
 * @throws Error when the bundle fails or echoes no command
 */
function exec(copy: string, commands: string): { opening: string; rest: string } {
  const result = spawnSync(
    'node',
    [BUNDLE, '--exec', commands, '--story', join(SEEDED, copy), '--seed', '42'],
    { cwd: REPO_ROOT, encoding: 'utf-8', timeout: 60_000 },
  );
  if (result.status !== 0) {
    throw new Error(`the bundle exited ${result.status}:\n${result.stdout}\n${result.stderr}`);
  }
  const out = (result.stdout ?? '').replace(/^Seed: \d+\n/, '');
  const echo = out.indexOf('> ');
  if (echo < 0) throw new Error(`no command echo in the bundle's output:\n${result.stdout}`);
  return { opening: out.slice(0, echo), rest: out.slice(echo) };
}

describe("the bundle prints the opening in the story's order", () => {
  it('a reordered block prints the room before the banner', () => {
    const { opening } = exec('quay-reordered.story', 'wait');

    const prologue = opening.indexOf(PROLOGUE);
    const room = opening.indexOf(ROOM);
    const banner = opening.indexOf(BANNER);
    expect(prologue).toBe(0);
    expect(room).toBeGreaterThan(prologue);
    expect(banner).toBeGreaterThan(room);
  });

  it('a block with no first look prints no room, in the opening or on the first command', () => {
    const { opening, rest } = exec('quay-no-look.story', 'wait');

    expect(opening).toContain(PROLOGUE);
    expect(opening).toContain(BANNER);
    expect(opening).not.toContain(ROOM);
    expect(rest).toBe('> wait\nTime passes...\n\n');
  });

  it('a block with no banner never prints the title block', () => {
    const { opening, rest } = exec('quay-no-banner.story', 'wait');

    expect(opening).toContain(PROLOGUE);
    expect(opening).toContain(ROOM);
    expect(opening).not.toContain(BANNER);
    expect(rest).not.toContain(BANNER);
  });

  it('a block with no prologue never prints it', () => {
    const { opening, rest } = exec('quay-no-prologue.story', 'wait');

    expect(opening).toContain(BANNER);
    expect(opening).not.toContain(PROLOGUE);
    expect(rest).not.toContain(PROLOGUE);
  });

  it('an empty block prints nothing before the first command', () => {
    const { opening } = exec('quay-empty.story', 'wait');

    expect(opening).toBe('');
  });
});

describe('a RESTART opens the new game', () => {
  it('prints the opening again after the acknowledgement, in the story\'s order', () => {
    const { rest } = exec('quay-reordered.story', 'wait/restart');

    const afterRestart = rest.slice(rest.indexOf('> restart'));
    const ack = afterRestart.indexOf('The story restarts.');
    const prologue = afterRestart.indexOf(PROLOGUE);
    const room = afterRestart.indexOf(ROOM);
    const banner = afterRestart.indexOf(BANNER);
    expect(ack).toBeGreaterThan(-1);
    expect(prologue).toBeGreaterThan(ack);
    expect(room).toBeGreaterThan(prologue);
    expect(banner).toBeGreaterThan(room);
  });
});

describe('nothing has run when the first command is typed', () => {
  it("the clocks answer the first wait, not the opening", () => {
    const { opening, rest } = exec('quay-clock.story', 'wait');

    expect(opening).toContain(ROOM);
    expect(opening).not.toContain(TIDE);
    expect(opening).not.toContain(HUNGER);
    expect(rest).toContain(TIDE);
    expect(rest).toContain(HUNGER);
  });
});
