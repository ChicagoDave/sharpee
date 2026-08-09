/**
 * test-json.test.ts — ADR-277 D1/D3: `sharpee test --json` through the REAL
 * runTestCommand path (rule 13a — no stubs of the compile/load/run chain).
 *
 * Pins: the NDJSON record stream (validated via ide-protocol's own guards —
 * rule 8b, one declaration), the error-status record a validation-broken
 * transcript now gets instead of vanishing (with exit 1), the `.story`-file
 * argument resolving to its containing folder, the `--chain` walkthroughs/
 * scan with real state persistence across files, and the bare run never
 * touching walkthroughs/.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  isRunEvent,
  type CommandResultEvent,
  type RunEndEvent,
  type RunEvent,
  type RunStartEvent,
  type TranscriptEndEvent,
} from '@sharpee/ide-protocol';
import { runTestCommand } from '../src/commands/test.js';

const STORY = `story
  title: Mini
  authors: T
  id: mini
  story-version: 0.0.1

create the Den
  a room

  A small square den.

create the brass lamp
  in the Den

  It gleams dully.

create the player
  starts in the Den

  You.
`;

const PASSING_TRANSCRIPT = `title: Mini smoke
---

> look
[OK: contains "A small square den"]

> examine the brass lamp
[OK: contains "gleams dully"]
`;

// A removed grammar form (ADR-294 D4) → validateTranscript error. The
// pre-ADR-294 shape (`> look` with no assertion) is no longer a validation
// error — the runner fails it at the D2 tier boundary instead.
const BROKEN_TRANSCRIPT = `title: Mini broken
---

> look
[ENSURES: player in Den]
`;

// NOTE: bare [OK] is exact-match-vs-expected-output (empty here → always
// fails); contains is the right presence assertion. ADR-277 Q4b's capture
// format assumed [OK] was presence-only — flagged for a Phase 4 correction.
const WT_01 = `title: Chain step 1
---

> take the brass lamp
[OK: contains "Taken"]
`;

const WT_02 = `title: Chain step 2
---

> inventory
[OK: contains "brass lamp"]
`;

let projectDir: string;

beforeAll(() => {
  projectDir = mkdtempSync(join(tmpdir(), 'devkit-test-json-'));
  writeFileSync(join(projectDir, 'mini.story'), STORY);
  mkdirSync(join(projectDir, 'tests', 'transcripts'), { recursive: true });
  writeFileSync(join(projectDir, 'tests', 'transcripts', 'a-smoke.transcript'), PASSING_TRANSCRIPT);
  mkdirSync(join(projectDir, 'walkthroughs'), { recursive: true });
  writeFileSync(join(projectDir, 'walkthroughs', 'wt-01-take.transcript'), WT_01);
  writeFileSync(join(projectDir, 'walkthroughs', 'wt-02-carry.transcript'), WT_02);
});

afterAll(() => rmSync(projectDir, { recursive: true, force: true }));

/** Run runTestCommand capturing stdout (NDJSON) and stderr; muting console.log. */
async function run(args: string[]): Promise<{ code: number; records: RunEvent[]; err: string }> {
  let stdout = '';
  const outSpy = vi.spyOn(process.stdout, 'write').mockImplementation(((chunk: unknown) => {
    stdout += String(chunk);
    return true;
  }) as never);
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const errs: string[] = [];
  const errSpy = vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => {
    errs.push(a.map(String).join(' '));
  });
  try {
    const code = await runTestCommand(args);
    const records = stdout
      .split('\n')
      .filter((line) => line.length > 0)
      .map((line): RunEvent => {
        const parsed: unknown = JSON.parse(line);
        expect(isRunEvent(parsed), `guard-valid event: ${line}`).toBe(true);
        return parsed as RunEvent;
      });
    return { code, records, err: errs.join('\n') };
  } finally {
    outSpy.mockRestore();
    logSpy.mockRestore();
    errSpy.mockRestore();
  }
}

const ofType = <T extends RunEvent>(records: RunEvent[], type: T['type']): T[] =>
  records.filter((r): r is T => r.type === type);

describe('sharpee test --json (real story, real runner)', () => {
  it('emits run-start → transcript records → run-end, all guard-valid, exit 0', async () => {
    const { code, records } = await run(['--json', projectDir]);
    expect(code).toBe(0);
    const first = records[0] as RunStartEvent;
    expect(first.type).toBe('run-start');
    expect(first.mode).toBe('tests');
    expect(first.transcriptCount).toBe(1);
    const last = records[records.length - 1] as RunEndEvent;
    expect(last.type).toBe('run-end');
    expect(last.exitCode).toBe(0);
    expect(last.totalErrors).toBe(0);
    const ends = ofType<TranscriptEndEvent>(records, 'transcript-end');
    expect(ends).toHaveLength(1);
    expect(ends[0].status).toBe('passed');
    const commands = ofType<CommandResultEvent>(records, 'command-result');
    expect(commands.map((c) => c.input)).toEqual(['look', 'examine the brass lamp']);
    // Click-through carriage: `> look` sits on line 4 of the transcript file.
    expect(commands[0].line).toBe(4);
    expect(commands[0].file).toEqual(ends[0].file);
  });

  it('announces the transcript BEFORE its commands, and sequences the whole stream', async () => {
    // Phase 2's actual claim, pinned on the real CLI: under the superseded
    // record stream every event for a transcript was constructed from its
    // FINISHED result and written in one burst, so `transcript-start` — "a
    // transcript is about to run" — was emitted after it had already run. A
    // consumer cannot show what is currently running unless this order holds.
    const { code, records } = await run(['--json', projectDir]);
    expect(code).toBe(0);

    const startIndex = records.findIndex((r) => r.type === 'transcript-start');
    const firstCommandIndex = records.findIndex((r) => r.type === 'command-result');
    const endIndex = records.findIndex((r) => r.type === 'transcript-end');
    expect(startIndex).toBeGreaterThanOrEqual(0);
    expect(startIndex).toBeLessThan(firstCommandIndex);
    expect(firstCommandIndex).toBeLessThan(endIndex);

    // The count rides the start event, so a consumer can draw a real progress
    // bar rather than a spinner — and it must match what actually ran.
    const start = records[startIndex] as { commandCount?: number };
    expect(start.commandCount).toBe(2);
    expect(ofType<CommandResultEvent>(records, 'command-result')).toHaveLength(2);

    // The envelope: monotonic from zero, and a clock that never goes backwards.
    expect(records.map((r) => r.seq)).toEqual(records.map((_, i) => i));
    for (let i = 1; i < records.length; i++) {
      expect(records[i].elapsedMs).toBeGreaterThanOrEqual(records[i - 1].elapsedMs);
    }
  });

  it('reports compile and load before the first transcript, in that order', async () => {
    // The stretch this covers used to be silent: a Chord project compiles and
    // then assembles before any command runs, and the stream said nothing until
    // the first transcript. `elapsedMs` on the pairs is what makes "where did
    // the time go" answerable from the stream alone.
    const { code, records } = await run(['--json', projectDir]);
    expect(code).toBe(0);

    const phases = records.filter((r) => r.type === 'phase') as Array<{
      name: string;
      status: string;
      seq: number;
      elapsedMs: number;
      detail?: string;
    }>;
    expect(phases.map((p) => `${p.name}/${p.status}`)).toEqual([
      'compile/started',
      'compile/finished',
      'load/started',
      'load/finished',
    ]);
    expect(phases.every((p) => p.detail?.endsWith('.story'))).toBe(true);

    // Every phase lands before the run's first transcript is announced.
    const firstStart = records.findIndex((r) => r.type === 'transcript-start');
    expect(Math.max(...phases.map((p) => p.seq))).toBeLessThan(records[firstStart].seq);

    // Each pair encloses real elapsed time rather than being stamped together.
    const [compileStart, compileEnd, loadStart, loadEnd] = phases;
    expect(compileEnd.elapsedMs).toBeGreaterThanOrEqual(compileStart.elapsedMs);
    expect(loadStart.elapsedMs).toBeGreaterThanOrEqual(compileEnd.elapsedMs);
    expect(loadEnd.elapsedMs).toBeGreaterThanOrEqual(loadStart.elapsedMs);
  });

  it('a validation-broken transcript is an error record with exit 1 — it never vanishes', async () => {
    const broken = join(projectDir, 'tests', 'transcripts', 'b-broken.transcript');
    writeFileSync(broken, BROKEN_TRANSCRIPT);
    try {
      const { code, records, err } = await run(['--json', projectDir]);
      expect(code).toBe(1);
      const ends = ofType<TranscriptEndEvent>(records, 'transcript-end');
      expect(ends).toHaveLength(2); // both transcripts present — the old code dropped one
      const errorEnd = ends.find((e) => e.status === 'error');
      expect(errorEnd).toBeDefined();
      expect(errorEnd!.file).toBe(broken);
      expect(errorEnd!.errorMessage).toContain('validation failed');
      expect(ends.some((e) => e.status === 'passed')).toBe(true);
      const last = records[records.length - 1] as RunEndEvent;
      expect(last.totalErrors).toBe(1);
      expect(last.exitCode).toBe(1);
      expect(err).toContain('Errors in');
    } finally {
      rmSync(broken);
    }
  });

  it('a malformed ADR-287 fence is an error record carrying its line number', async () => {
    // ADR-287 D3 parity: the block grammar lands once in transcript-tester, and
    // BOTH consumers inherit it. The bundle's reporter is the other one; this
    // pins the consumer the IDE test panel actually reads (ADR-277 D1/AC2), so
    // AC4's "never silently dropped" is proven where an author would see it.
    // (Updated 2026-08-02: the ``` fence delimiter became `text`/`end text` in
    // ADR-287's recut — same intent, current grammar.)
    const fenced = join(projectDir, 'tests', 'transcripts', 'c-bad-fence.transcript');
    writeFileSync(fenced, 'title: Bad block\n---\n\n> look\n[OK]\ntext\nA small square den.\n');
    try {
      const { code, records } = await run(['--json', projectDir]);
      expect(code).toBe(1);
      const errorEnd = ofType<TranscriptEndEvent>(records, 'transcript-end').find(
        (e) => e.file === fenced,
      );
      expect(errorEnd?.status).toBe('error');
      expect(errorEnd!.errorMessage).toContain('Line 6: Unclosed text block');
    } finally {
      rmSync(fenced);
    }
  });

  it('--coverage emits one guard-valid coverage record immediately before run-end (ADR-293 D15)', async () => {
    const { code, records } = await run(['--json', '--coverage', projectDir]);
    expect(code).toBe(0);
    // Every line was already guard-validated by run(); pin type and position.
    const coverageIndexes = records
      .map((r, i) => (r.type === 'coverage' ? i : -1))
      .filter((i) => i >= 0);
    expect(coverageIndexes).toHaveLength(1);
    expect(records[coverageIndexes[0] + 1].type).toBe('run-end');
    const coverage = records[coverageIndexes[0]] as Extract<RunEvent, { type: 'coverage' }>;
    expect(coverage.pointsFired + coverage.pointsNeverFired).toBe(coverage.points.length);
  });

  it('without --coverage no coverage record is emitted', async () => {
    const { records } = await run(['--json', projectDir]);
    expect(records.some((r) => r.type === 'coverage')).toBe(false);
  });

  // ADR-299 replay capture: the skein replay shape — a [SKIP]-only transcript
  // at a pinned seed, every command's actual output exposed on the stream.
  it('--capture-output carries actualOutput on every executed command, passing and skipped', async () => {
    const replay = join(projectDir, 'replay-thread.transcript');
    writeFileSync(replay, 'title: Replay thread\nseed: 42\n---\n\n> look\n[SKIP]\n\n> examine the brass lamp\n[OK: contains "gleams dully"]\n');
    try {
      const { code, records } = await run(['--json', '--capture-output', projectDir, replay]);
      expect(code).toBe(0);
      const commands = ofType<CommandResultEvent>(records, 'command-result');
      expect(commands.map((c) => c.input)).toEqual(['look', 'examine the brass lamp']);
      // The [SKIP]'d command (skipped, passed) carries real story prose...
      expect(commands[0].skipped).toBe(true);
      expect(commands[0].actualOutput).toContain('A small square den');
      // ...and so does the asserted-and-passing one.
      expect(commands[1].passed).toBe(true);
      expect(commands[1].actualOutput).toContain('gleams dully');
    } finally {
      rmSync(replay);
    }
  });

  it('without --capture-output passing commands still omit actualOutput', async () => {
    const { records } = await run(['--json', projectDir]);
    const commands = ofType<CommandResultEvent>(records, 'command-result');
    expect(commands.length).toBeGreaterThan(0);
    for (const command of commands) {
      expect(command.passed).toBe(true);
      expect('actualOutput' in command).toBe(false);
    }
  });

  it('accepts a .story FILE argument, resolving the containing folder (D1)', async () => {
    const viaFile = await run(['--json', join(projectDir, 'mini.story')]);
    const viaDir = await run(['--json', projectDir]);
    expect(viaFile.code).toBe(0);
    const files = (r: typeof viaFile) =>
      ofType<TranscriptEndEvent>(r.records, 'transcript-end').map((e) => e.file);
    expect(files(viaFile)).toEqual(files(viaDir));
  });
});

describe('sharpee test --chain (walkthroughs/, D3)', () => {
  it('with no file args runs walkthroughs/ in filename order with state persisting', async () => {
    const { code, records } = await run(['--json', '--chain', projectDir]);
    expect(code).toBe(0);
    const start = records[0] as RunStartEvent;
    expect(start.mode).toBe('chain');
    const ends = ofType<TranscriptEndEvent>(records, 'transcript-end');
    expect(ends.map((e) => e.file)).toEqual([
      join(projectDir, 'walkthroughs', 'wt-01-take.transcript'),
      join(projectDir, 'walkthroughs', 'wt-02-carry.transcript'),
    ]);
    // wt-02's inventory assertion only passes if wt-01's take persisted.
    expect(ends.map((e) => e.status)).toEqual(['passed', 'passed']);
  });

  it('a bare run never touches walkthroughs/', async () => {
    const only = mkdtempSync(join(tmpdir(), 'devkit-wt-only-'));
    try {
      writeFileSync(join(only, 'mini.story'), STORY);
      mkdirSync(join(only, 'walkthroughs'), { recursive: true });
      writeFileSync(join(only, 'walkthroughs', 'wt-01-take.transcript'), WT_01);
      const { code, err } = await run([only]);
      expect(code).toBe(2); // no tests/ → nothing found; walkthroughs/ not scanned
      expect(err).toContain('no transcript files found');
    } finally {
      rmSync(only, { recursive: true, force: true });
    }
  });
});

describe('sharpee test --tree --json (ADR-302 over the run-event stream)', () => {
  let treeDir: string;

  beforeAll(() => {
    treeDir = mkdtempSync(join(tmpdir(), 'devkit-tree-json-'));
    writeFileSync(join(treeDir, 'mini.story'), STORY);
    mkdirSync(join(treeDir, 'tests', 'transcripts'), { recursive: true });
    // One root with TWO children on purpose: a single child continues the live
    // engine and replays nothing, so it would not exercise D17 at all.
    writeFileSync(
      join(treeDir, 'tests', 'transcripts', 'spine.transcript'),
      `title: Spine\n\n---\n\n> look\n[OK: contains "A small square den"]\n`,
    );
    writeFileSync(
      join(treeDir, 'tests', 'transcripts', 'lamp.transcript'),
      `title: Lamp\ncontinues: spine\n\n---\n\n> examine the brass lamp\n[OK: contains "gleams"]\n`,
    );
    writeFileSync(
      join(treeDir, 'tests', 'transcripts', 'den.transcript'),
      `title: Den again\ncontinues: spine\n\n---\n\n> look\n[OK: contains "A small square den"]\n`,
    );
  });

  afterAll(() => rmSync(treeDir, { recursive: true, force: true }));

  it('carries parentage and marks the replayed execution (D17)', async () => {
    const { code, records } = await run(['--json', '--tree', treeDir]);
    expect(code).toBe(0);

    expect((records[0] as RunStartEvent).mode).toBe('tree');
    expect(records.some((r) => r.type === 'phase' && r.name === 'assemble')).toBe(true);

    const starts = records.filter((r) => r.type === 'transcript-start') as Array<{
      file: string;
      parent?: string;
      replayed?: boolean;
    }>;
    const spine = join(treeDir, 'tests', 'transcripts', 'spine.transcript');

    // Four executions for three nodes: the second child forks, so the root is
    // re-executed to rebuild its state. That extra execution is the ONE thing
    // `TreeRunResult.outcomes` deliberately omits, which is why the stream is
    // driven by the observer and not by the returned result.
    expect(starts).toHaveLength(4);
    expect(starts.filter((s) => s.replayed)).toHaveLength(1);
    expect(starts.filter((s) => s.replayed)[0].file).toBe(spine);

    // Roots carry no parent; both children name the root by its absolute path,
    // the same identity domain as `file`, so a consumer joins on one key.
    const roots = starts.filter((s) => s.parent === undefined);
    expect(roots.every((s) => s.file === spine)).toBe(true);
    expect(starts.filter((s) => s.parent !== undefined).every((s) => s.parent === spine)).toBe(true);

    // The D17 arithmetic, recomputed from the stream by attributing each
    // command to its enclosing start rather than trusting the summary line.
    let current: { replayed?: boolean } | undefined;
    let authored = 0;
    let replayed = 0;
    for (const record of records) {
      if (record.type === 'transcript-start') current = record;
      else if (record.type === 'command-result') current?.replayed ? replayed++ : authored++;
    }
    expect({ authored, replayed }).toEqual({ authored: 3, replayed: 1 });
  });

  it('--capture-world carries world snapshots on node entries and command results (R3/R5)', async () => {
    const { code, records } = await run(['--json', '--tree', '--capture-world', treeDir]);
    expect(code).toBe(0);

    // Every transcript-start carries the world its node ENTERS, and every
    // command-result the world after the command — the runner names the
    // player's location with a token its own [STATE:] evaluator resolves.
    const starts = records.filter((r) => r.type === 'transcript-start') as Array<{
      world?: { location?: { name: string; token: string }; inventory: unknown[] };
    }>;
    expect(starts.length).toBeGreaterThan(0);
    for (const start of starts) {
      expect(start.world?.location?.name).toBeTruthy();
      expect(start.world?.location?.token).not.toMatch(/\s/);
      expect(Array.isArray(start.world?.inventory)).toBe(true);
    }
    const commands = records.filter((r) => r.type === 'command-result') as Array<{
      world?: { location?: { token: string } };
    }>;
    expect(commands.length).toBeGreaterThan(0);
    expect(commands.every((c) => c.world?.location?.token !== undefined)).toBe(true);

    // And without the flag, the stream stays exactly as small as it was.
    const bare = await run(['--json', '--tree', treeDir]);
    expect(
      bare.records
        .filter((r) => r.type === 'transcript-start' || r.type === 'command-result')
        .every((r) => !('world' in r)),
    ).toBe(true);
  });

  it('announces a blocked subtree as unreached, naming what blocked it (D13)', async () => {
    // A failing root blocks both children. They must appear in the stream —
    // absent nodes would render as a tree that silently lost two tests, and
    // reporting them as failures is the wall of red D13 exists to prevent.
    const broken = mkdtempSync(join(tmpdir(), 'devkit-tree-blocked-'));
    try {
      writeFileSync(join(broken, 'mini.story'), STORY);
      mkdirSync(join(broken, 'tests', 'transcripts'), { recursive: true });
      writeFileSync(
        join(broken, 'tests', 'transcripts', 'spine.transcript'),
        `title: Spine\n\n---\n\n> look\n[OK: contains "this text is not in the story"]\n`,
      );
      writeFileSync(
        join(broken, 'tests', 'transcripts', 'lamp.transcript'),
        `title: Lamp\ncontinues: spine\n\n---\n\n> examine the brass lamp\n[OK: contains "gleams"]\n`,
      );
      writeFileSync(
        join(broken, 'tests', 'transcripts', 'den.transcript'),
        `title: Den again\ncontinues: spine\n\n---\n\n> look\n[OK: contains "den"]\n`,
      );

      const { code, records } = await run(['--json', '--tree', broken]);
      expect(code).toBe(1);

      const ends = ofType<TranscriptEndEvent>(records, 'transcript-end');
      const unreached = ends.filter((e) => e.status === 'unreached');
      expect(unreached).toHaveLength(2);
      // `blockedBy` is the failing node's PATH, the same identity domain as
      // `file` and `parent` — a stem here would force a second lookup table.
      const spine = join(broken, 'tests', 'transcripts', 'spine.transcript');
      expect(unreached.every((e) => e.blockedBy === spine)).toBe(true);

      // One originating failure, not three.
      expect(ends.filter((e) => e.status === 'failed')).toHaveLength(1);

      const last = records[records.length - 1] as RunEndEvent;
      expect(last.totalUnreached).toBe(2);

      // Every unreached node was announced before it was reported unreached.
      for (const end of unreached) {
        const startIndex = records.findIndex((r) => r.type === 'transcript-start' && r.file === end.file);
        const endIndex = records.findIndex((r) => r.type === 'transcript-end' && r.file === end.file);
        expect(startIndex).toBeGreaterThanOrEqual(0);
        expect(startIndex).toBeLessThan(endIndex);
      }
    } finally {
      rmSync(broken, { recursive: true, force: true });
    }
  });

  it('an empty transcript runs as skipped and never aborts the suite (phase-6 F1, ruling 2026-08-08)', async () => {
    // The editor's designed starting state: a just-created transcript has a
    // header and no commands. Before the ruling this aborted the whole run
    // ("failed to parse — nothing ran", exit 2) — the regression this pins.
    const withEmpty = mkdtempSync(join(tmpdir(), 'devkit-tree-empty-'));
    try {
      writeFileSync(join(withEmpty, 'mini.story'), STORY);
      mkdirSync(join(withEmpty, 'tests', 'transcripts'), { recursive: true });
      writeFileSync(
        join(withEmpty, 'tests', 'transcripts', 'begin.transcript'),
        `title: Begin\nstory: mini\n\n---\n`,
      );
      writeFileSync(
        join(withEmpty, 'tests', 'transcripts', 'spine.transcript'),
        `title: Spine\n\n---\n\n> look\n[OK: contains "A small square den"]\n`,
      );

      const { code, records } = await run(['--json', '--tree', withEmpty]);
      expect(code).toBe(0);

      const ends = ofType<TranscriptEndEvent>(records, 'transcript-end');
      const begin = join(withEmpty, 'tests', 'transcripts', 'begin.transcript');
      const skipped = ends.filter((e) => e.status === 'skipped');
      expect(skipped.map((e) => e.file)).toEqual([begin]);
      // The sibling executed and passed — the suite is not poisoned.
      expect(ends.filter((e) => e.status === 'passed')).toHaveLength(1);
      // The skipped node was announced first, like every other node.
      const startIndex = records.findIndex((r) => r.type === 'transcript-start' && r.file === begin);
      const endIndex = records.findIndex((r) => r.type === 'transcript-end' && r.file === begin);
      expect(startIndex).toBeGreaterThanOrEqual(0);
      expect(startIndex).toBeLessThan(endIndex);
    } finally {
      rmSync(withEmpty, { recursive: true, force: true });
    }
  });
});
