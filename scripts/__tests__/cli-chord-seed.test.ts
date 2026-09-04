/**
 * Tests for chord-evaluator seed threading in the bundle CLI (ADR-293 D1).
 *
 * A Chord story's `one chance in <n>` / `randomly` draws run on the
 * story-loader evaluator's stream, seeded via `StoryLoaderOptions.seed`.
 * The CLI must hand the session's resolved master seed to `createStory`
 * alongside `EngineConfig.seed` — omitting it leaves chord draws
 * clock-seeded under a pinned `seed:` header, which is nondeterminism the
 * removed `[UNTIL]`/`contains_any` grammar used to mask (found migrating
 * fernhill, GH #209).
 *
 * Exercised end-to-end via `spawnSync` against the real compiled bundle:
 * a chance-gated every-turn phrase fires across seven waits, a golden is
 * blessed, and replays must be byte-identical — a clock-seeded evaluator
 * fails the replay almost surely.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(__dirname, '..', '..');
const BUNDLE = join(REPO_ROOT, 'dist', 'cli', 'sharpee.js');

const STORY = `story
  title: Chance Probe
  authors:
    Tests
  id: chance-probe
  story-version: 1.0.0

create the Den
  a room

  A small square den.

create the metronome
  scenery
  in the Den

  It ticks.

  on every turn and one chance in 2
    phrase tick-tock
  end on

create Alex
  a person
  playable
  starts in the Den

  You.

before the game starts
  change the player to Alex
end before

define phrase tick-tock
  The metronome clacks.
end phrase
`;

const TRANSCRIPT = `title: Chance determinism probe
seed: 4242
---

${Array.from({ length: 7 }, () => '> wait\n[SKIP]\n').join('\n')}
> look
[OK: contains "square den"]
`;

let dir: string;
let storyFile: string;
let transcriptFile: string;

function runCli(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync('node', [BUNDLE, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    timeout: 60_000
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'cli-chord-seed-'));
  storyFile = join(dir, 'chance-probe.story');
  transcriptFile = join(dir, 'chance-probe.transcript');
  writeFileSync(storyFile, STORY, 'utf-8');
  writeFileSync(transcriptFile, TRANSCRIPT, 'utf-8');
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('chord chance draws under a pinned seed', () => {
  it('a blessed golden replays green repeatedly — chance draws derive from the master seed', () => {
    const bless = runCli(['--test', transcriptFile, '--story', storyFile, '--bless']);
    expect(bless.status).toBe(0);

    // Seven 1-in-2 firings: a clock-seeded evaluator survives one replay
    // with p ≈ 1/128, two with p ≈ 1/16384 — a pass here is determinism.
    for (let run = 1; run <= 2; run++) {
      const replay = runCli(['--test', transcriptFile, '--story', storyFile]);
      expect(replay.status, `replay ${run}:\n${replay.stdout}\n${replay.stderr}`).toBe(0);
      expect(replay.stdout).toContain('8 passed');
    }
  });

  it('--seed overrides produce their own stable stream (chord draws follow the session seed)', () => {
    // Different seed, same transcript body: record and replay at 7 via
    // --seed --bless is rejected (seed pin mismatch), so assert the weaker
    // host contract directly — two identical --exec runs at the same seed
    // print byte-identical output, including any chance-gated lines.
    const a = runCli(['--exec', 'wait', '--story', storyFile, '--seed', '7']);
    const b = runCli(['--exec', 'wait', '--story', storyFile, '--seed', '7']);
    expect(a.status).toBe(0);
    expect(b.status).toBe(0);
    expect(a.stdout).toBe(b.stdout);
  });
});
