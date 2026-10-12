/**
 * run.test.ts — the run column's fold (design §7, ADR-306 Phase 6).
 *
 * Derived from the Behavior Statement: one result per transcript stem, the
 * first failure on one line, replays never rows, the run-end tally, and the
 * stream-less-death note. Events are built as real wire literals and folded
 * through the REAL `isRunEvent` guard — a hand-rolled shape the guard would
 * reject must not pass here.
 *
 * Owner context: tools/ide — the testing play surface's web bundle.
 */
import { describe, expect, it } from 'vitest';
import {
  beginRun, bootLookIndex, commandRowText, createRunState, finishRun, firstFailureText, foldRunLine,
  resetRun, restatesTextClaim, runRowVisitTarget, runRowsOf, type CommandOutcome,
} from '../src/run';

let seq = 0;
const line = (event: Record<string, unknown>): string =>
  JSON.stringify({ schemaVersion: 2, seq: seq++, elapsedMs: seq, ...event });

const start = (file: string, extra: Record<string, unknown> = {}): string =>
  line({ type: 'transcript-start', file, index: 0, ...extra });
const command = (file: string, extra: Record<string, unknown> = {}): string =>
  line({
    type: 'command-result', file, line: 4, input: 'look',
    passed: true, expectedFailure: false, skipped: false, ...extra,
  });
const end = (file: string, extra: Record<string, unknown> = {}): string =>
  line({
    type: 'transcript-end', file, status: 'passed',
    passed: 1, failed: 0, expectedFailures: 0, skipped: 0, duration: 5, ...extra,
  });
const runEnd = (extra: Record<string, unknown> = {}): string =>
  line({
    type: 'run-end', totalPassed: 1, totalFailed: 0, totalExpectedFailures: 0,
    totalSkipped: 0, totalErrors: 0, totalUnreached: 0, totalDuration: 9,
    exitCode: 0, ...extra,
  });

const A = '/proj/tests/arrival.transcript';
const B = '/proj/tests/boiler-east-1.transcript';

describe('foldRunLine', () => {
  it('a passing file lands one PASS row keyed by stem, with its turn count', () => {
    const state = createRunState();
    beginRun(state);
    for (const raw of [start(A), command(A), end(A, { passed: 3 })]) foldRunLine(state, raw);

    const result = state.results.get('arrival');
    expect(result?.status).toBe('passed');
    expect(result?.passed).toBe(3);
    expect(result?.firstFailure).toBeUndefined();
  });

  it('a failed file carries its FIRST failure one-line (wire failure message + turn), and counts the rest', () => {
    const state = createRunState();
    beginRun(state);
    for (const raw of [
      start(A),
      command(A, { passed: false, turn: 3, failure: 'Output does not contain "boiler"' }),
      command(A, { passed: false, turn: 4, failure: 'Output does not contain "shed"' }),
      end(A, { status: 'failed', passed: 1, failed: 2 }),
    ]) foldRunLine(state, raw);

    const result = state.results.get('arrival');
    expect(result?.status).toBe('failed');
    expect(result?.firstFailure).toEqual({ where: 'turn 3', message: 'Output does not contain "boiler"', command: 0 });
    expect(result?.moreFailures).toBe(1);
  });

  it("a failed command keeps what the story printed; a passing one and an empty string carry none (F-10)", () => {
    const state = createRunState();
    beginRun(state);
    for (const raw of [
      start(A),
      command(A, { input: 'look', passed: true }),
      command(A, {
        input: 'wear satchel', passed: false, turn: 3,
        failure: 'Output does not contain "You put on the mail satchel."',
        actualOutput: "You can't see any such thing.",
        assertionResults: [
          { description: 'contains "You put on the mail satchel."', passed: false,
            message: 'Output does not contain "You put on the mail satchel."' },
        ],
      }),
      command(A, { input: 'inventory', passed: false, turn: 3, failure: 'engine exploded', actualOutput: '' }),
      end(A, { status: 'failed', passed: 1, failed: 2 }),
    ]) foldRunLine(state, raw);

    const commands = state.results.get('arrival')?.commands ?? [];
    expect(commands.map((c) => c.output)).toEqual([
      undefined,
      "You can't see any such thing.",
      undefined,
    ]);
    // The claim's own message still rides the verdict; the renderer decides.
    expect(commands[1]?.assertions[0]?.message).toBe('Output does not contain "You put on the mail satchel."');
  });

  it('a failed command keeps the cause the wire named; a passing one never carries it (F-15)', () => {
    const cause = {
      kind: 'placed-nowhere' as const,
      entity: 'mail-satchel',
      name: 'mail satchel',
      word: 'satchel',
      says: '"satchel" is the mail satchel, which is placed nowhere and never moved into play.',
      fix: 'Give it a place (in the Sorting Room) or move it into play.',
    };
    const state = createRunState();
    beginRun(state);
    for (const raw of [
      start(A),
      command(A, { input: 'look', passed: true, cause }),
      command(A, {
        input: 'wear satchel', passed: false, turn: 3,
        failure: 'Output does not contain "You put on the mail satchel."',
        actualOutput: "You can't see any such thing.",
        cause,
      }),
      end(A, { status: 'failed', passed: 1, failed: 1 }),
    ]) foldRunLine(state, raw);

    const commands = state.results.get('arrival')?.commands ?? [];
    expect(commands.map((c) => c.cause)).toEqual([undefined, cause]);
    expect(commands[1]?.cause?.says).toBe('"satchel" is the mail satchel, which is placed nowhere and never moved into play.');
  });

  it('only a text claim\'s message restates the claim; a state claim\'s message carries its actual value (F-14)', () => {
    expect(restatesTextClaim('Output does not contain "rattles"')).toBe(true);
    expect(restatesTextClaim('Output should not contain "rattles"')).toBe(true);
    expect(restatesTextClaim('Output did not match expected')).toBe(true);
    expect(restatesTextClaim('Output does not contain the text block fragment')).toBe(true);
    expect(restatesTextClaim('player.location = dock (actual: sorting-room)')).toBe(false);
    expect(restatesTextClaim('Channel "status.score" does not contain "10" (0)')).toBe(false);
  });

  it('a runtime throw without an assertion message falls back to the error text and source line', () => {
    const state = createRunState();
    beginRun(state);
    for (const raw of [
      start(A),
      command(A, { passed: false, error: 'engine exploded' }),
      end(A, { status: 'failed', passed: 0, failed: 1 }),
    ]) foldRunLine(state, raw);

    expect(state.results.get('arrival')?.firstFailure).toEqual({ where: 'line 4', message: 'engine exploded', command: 0 });
  });

  it("a document run's failure (no turn, line 0) shows the message alone — never 'line 0 —'", () => {
    const state = createRunState();
    beginRun(state);
    for (const raw of [
      start('opening-den'),
      command('opening-den', { passed: false, line: 0, failure: 'Output does not contain "roses"' }),
      end('opening-den', { status: 'failed', passed: 0, failed: 1 }),
    ]) foldRunLine(state, raw);

    const failure = state.results.get('opening-den')?.firstFailure;
    expect(failure).toEqual({ message: 'Output does not contain "roses"', command: 0 });
    expect(firstFailureText(failure!, false)).toBe('Output does not contain "roses"');
  });

  it("the first failure's command index counts the opening row, so the header can tell the boot look (F-13)", () => {
    const state = createRunState();
    beginRun(state);
    for (const raw of [
      start('main'),
      command('main', { input: '(opening)', line: 0, passed: true }),
      command('main', { input: 'look', line: 0, passed: false, turn: 1, failure: 'Output does not contain "rattles"' }),
      command('main', { input: 'look', line: 0, passed: false, turn: 2, failure: 'Output does not contain "rattles"' }),
      end('main', { status: 'failed', passed: 1, failed: 2 }),
    ]) foldRunLine(state, raw);

    const result = state.results.get('main');
    expect(result?.firstFailure).toEqual({ where: 'turn 1', message: 'Output does not contain "rattles"', command: 1 });
    expect(bootLookIndex(result!.commands, true)).toBe(1);
    expect(firstFailureText(result!.firstFailure!, true)).toBe('turn 1 · boot — Output does not contain "rattles"');
    expect(result!.commands.map((c, i) => commandRowText(c, i === 1))).toEqual(['(opening)', '(boot look)', '> look']);
  });

  it('a line with no boot card has no boot look, and the row text is the typed command (F-13)', () => {
    const commands: CommandOutcome[] = [
      { input: '(opening)', passed: true, skipped: false, assertions: [] },
      { input: 'look', passed: true, skipped: false, assertions: [] },
    ];
    expect(bootLookIndex(commands, false)).toBeUndefined();
    expect(bootLookIndex([commands[0]], true)).toBeUndefined();
    expect(bootLookIndex(commands.slice(1), true)).toBe(0);
    expect(commandRowText(commands[1], false)).toBe('> look');
    expect(firstFailureText({ message: 'engine exploded' }, true)).toBe('boot look — engine exploded');
    expect(firstFailureText({ where: 'turn 3', message: 'no satchel' }, false)).toBe('turn 3 — no satchel');
  });

  it('a replayed execution is never a row, and the authored one still is', () => {
    const state = createRunState();
    beginRun(state);
    for (const raw of [
      // The authored run of A…
      start(A), command(A), end(A),
      // …then A replayed to build B's state: its (possibly diverging)
      // events must not overwrite the authored row.
      start(A, { replayed: true, index: 1 }),
      command(A, { passed: false, turn: 1, failure: 'replay noise' }),
      end(A, { status: 'failed', passed: 0, failed: 1 }),
      start(B, { index: 2, parent: A }), command(B), end(B),
    ]) foldRunLine(state, raw);

    expect(state.results.get('arrival')?.status).toBe('passed');
    expect(state.results.get('boiler-east-1')?.status).toBe('passed');
  });

  it('error and unreached files say why on their one line', () => {
    const state = createRunState();
    beginRun(state);
    for (const raw of [
      end(A, { status: 'error', passed: 0, failed: 0, errorMessage: '2 parse error(s)' }),
      end(B, { status: 'unreached', passed: 0, failed: 0, blockedBy: A }),
    ]) foldRunLine(state, raw);

    expect(state.results.get('arrival')?.firstFailure).toEqual({ message: '2 parse error(s)' });
    expect(state.results.get('boiler-east-1')?.firstFailure).toEqual({ message: 'blocked by arrival' });
  });

  it('run-end closes the run with a tally counting CARDS and ASSERTIONS from the detail; undecodable lines never throw', () => {
    const state = createRunState();
    beginRun(state);
    expect(state.inFlight).toBe(true);
    foldRunLine(state, 'not json at all');
    foldRunLine(state, '{"type":"command-result"}');   // fails the guard
    for (const raw of [
      // One passed line: one card, three passing assertions.
      start(A),
      command(A, {
        assertionResults: [
          { description: 'contains "hall"', passed: true },
          { description: 'contains "door"', passed: true },
          { description: 'state lamp.location = player', passed: true },
        ],
      }),
      end(A, { passed: 3 }),
      // One failed line: a skipped card (joins neither side), then a failed
      // card with one passing and two failing assertions.
      start(B),
      command(B, { skipped: true }),
      command(B, {
        passed: false, turn: 2, failure: 'no boiler',
        assertionResults: [
          { description: 'contains "shed"', passed: true },
          { description: 'contains "boiler"', passed: false, message: 'no boiler' },
          { description: 'contains "coal"', passed: false, message: 'no coal' },
        ],
      }),
      end(B, { status: 'failed', passed: 4, failed: 2 }),
      end('/proj/tests/broken.transcript',
          { status: 'error', passed: 0, failed: 0, errorMessage: 'parse' }),  // one errored line
      end('/proj/tests/late.transcript',
          { status: 'unreached', passed: 0, failed: 0, blockedBy: B }),       // one unreached line
      // Wire totals — the tally must never copy them; the detail is its source.
      runEnd({ totalPassed: 7, totalFailed: 2, totalUnreached: 1 }),
    ]) foldRunLine(state, raw);

    expect(state.inFlight).toBe(false);
    expect(state.tally).toEqual({
      cardsPassed: 1,
      cardsFailed: 1,
      assertionsPassed: 4,
      assertionsFailed: 2,
      errors: 1,
      unreached: 1,
    });
  });

  it('a stream-less death leaves a note; a clean close never does', () => {
    const dead = createRunState();
    beginRun(dead);
    finishRun(dead, false, 'sharpee not found');
    expect(dead.note).toBe('sharpee not found');

    const clean = createRunState();
    beginRun(clean);
    foldRunLine(clean, runEnd());
    finishRun(clean, true);
    expect(clean.note).toBeUndefined();
  });

  it('a run that closed its stream having run nothing keeps the exit note — the refusal is the report', () => {
    // A document refused at validation: run-start, run-end (exit 2, zeros),
    // no line ever announced. Before 2026-09-27 the zero tally suppressed
    // the note and the column showed nothing but zeros.
    const refused = createRunState();
    beginRun(refused);
    foldRunLine(refused, runEnd());
    expect(refused.tally).toBeDefined();
    finishRun(refused, false, 'The run exited 2.\nTree document is malformed — 1 defect(s); nothing ran.');
    expect(refused.note).toBe('The run exited 2.\nTree document is malformed — 1 defect(s); nothing ran.');

    // A failing run that DID run lines carries its failures in the rows —
    // no note on top of them.
    const failing = createRunState();
    beginRun(failing);
    for (const raw of [start(A), command(A), end(A), runEnd()]) foldRunLine(failing, raw);
    finishRun(failing, false, 'The run exited 1.');
    expect(failing.note).toBeUndefined();
  });

  it('beginRun clears the previous run — the column reports THIS run only', () => {
    const state = createRunState();
    beginRun(state);
    for (const raw of [start(A), command(A), end(A), runEnd()]) foldRunLine(state, raw);
    expect(state.results.size).toBe(1);
    expect(state.tally).toBeDefined();

    beginRun(state);
    expect(state.inFlight).toBe(true);
    expect(state.results.size).toBe(0);
    expect(state.tally).toBeUndefined();
  });
});

describe('resetRun (David 2026-08-09: a changed suite voids the results)', () => {
  it('drops results, tally, and note back to not-run', () => {
    const state = createRunState();
    beginRun(state);
    for (const raw of [start(A), command(A), end(A), runEnd()]) foldRunLine(state, raw);
    finishRun(state, false, 'stale note');
    expect(state.results.size).toBe(1);

    resetRun(state);

    expect(state.inFlight).toBe(false);
    expect(state.results.size).toBe(0);
    expect(state.tally).toBeUndefined();
    expect(state.note).toBeUndefined();
  });
});

// ── the derived tier on the same stream (ADR-356 D5, GH #524 Phase 2) ──────

const derived = (label: string, extra: Record<string, unknown> = {}): string =>
  line({ type: 'derived-branch', label, span: { line: 12, column: 3, endLine: 12, endColumn: 9 }, status: 'passed', ...extra });
const summary = (extra: Record<string, unknown> = {}): string =>
  line({
    type: 'derived-summary',
    branches: { declared: 4, exercised: 2, passed: 1, failed: 1, gaps: [] },
    endings: { declared: 1, reached: 1, unreached: [], unnamed: [] },
    rooms: { declared: 3, entered: 3, unentered: [] },
    ...extra,
  });

describe('foldRunLine — derived rows and the summary', () => {
  it('keeps one row per derived-branch in arrival order, distinguishable by FIELD: skipped carries its shape, failed its failure, error its detail', () => {
    const state = createRunState();
    beginRun(state);
    for (const raw of [
      derived('vine · on pruning · when seedling'),
      derived('vine · on pruning · when fruiting', { status: 'skipped', shape: 'timer-phase', detail: 'the phase is a timer' }),
      derived('Tobias · topic boiler', {
        status: 'failed', failure: 'emitted tobias-boiler-reply: not emitted',
        command: 'ask tobias about boiler', arranged: ['player.location = Cellar'],
      }),
      derived('story · on turn', { status: 'error', detail: 'engine threw', span: null }),
    ]) foldRunLine(state, raw);

    expect(state.derived.map(row => row.label)).toEqual([
      'vine · on pruning · when seedling',
      'vine · on pruning · when fruiting',
      'Tobias · topic boiler',
      'story · on turn',
    ]);
    expect(state.derived[0]).toEqual({ label: 'vine · on pruning · when seedling', span: { line: 12, column: 3, endLine: 12, endColumn: 9 }, status: 'passed' });
    // D5a on the wire and in the state: SKIPPED is its own status with a shape, never `failed`.
    expect(state.derived[1]?.status).toBe('skipped');
    expect(state.derived[1]?.shape).toBe('timer-phase');
    expect(state.derived[1]?.failure).toBeUndefined();
    expect(state.derived[2]?.status).toBe('failed');
    expect(state.derived[2]?.failure).toBe('emitted tobias-boiler-reply: not emitted');
    expect(state.derived[2]?.command).toBe('ask tobias about boiler');
    expect(state.derived[2]?.arranged).toEqual(['player.location = Cellar']);
    expect(state.derived[2]?.shape).toBeUndefined();
    expect(state.derived[3]?.status).toBe('error');
    expect(state.derived[3]?.detail).toBe('engine threw');
    expect(state.derived[3]?.span).toBeNull();
  });

  it('a derived-branch with a status the wire does not define is rejected by the guard, not folded', () => {
    const state = createRunState();
    beginRun(state);
    foldRunLine(state, derived('vine · on pruning', { status: 'maybe' }));
    expect(state.derived).toHaveLength(0);
  });

  it('keeps the latest derived-summary and never merges', () => {
    const state = createRunState();
    beginRun(state);
    foldRunLine(state, summary());
    foldRunLine(state, summary({ rooms: { declared: 3, entered: 2, unentered: ['r_cellar'] } }));
    expect(state.derivedSummary?.branches).toEqual({ declared: 4, exercised: 2, passed: 1, failed: 1, gaps: [] });
    expect(state.derivedSummary?.rooms).toEqual({ declared: 3, entered: 2, unentered: ['r_cellar'] });
  });

  it('run-end adds the rules tally from the ROWS — passed, failed, skipped, errors each their own count — and only when the tier ran', () => {
    const state = createRunState();
    beginRun(state);
    for (const raw of [start(A), command(A), end(A), runEnd()]) foldRunLine(state, raw);
    expect(state.tally?.rules).toBeUndefined();

    beginRun(state);
    for (const raw of [
      start(A), command(A), end(A),
      derived('a'), derived('b'),
      derived('c', { status: 'skipped', shape: 'negation' }),
      derived('d', { status: 'failed', failure: 'x' }),
      derived('e', { status: 'error', detail: 'boom' }),
      summary(),
      runEnd(),
    ]) foldRunLine(state, raw);
    expect(state.tally?.rules).toEqual({ passed: 2, failed: 1, skipped: 1, errors: 1 });
    expect(state.tally?.cardsPassed).toBe(1);
  });

  it('beginRun and resetRun drop the derived rows and the summary with everything else', () => {
    const state = createRunState();
    beginRun(state);
    for (const raw of [derived('a'), summary()]) foldRunLine(state, raw);
    expect(state.derived).toHaveLength(1);
    expect(state.derivedSummary).toBeDefined();

    beginRun(state);
    expect(state.derived).toHaveLength(0);
    expect(state.derivedSummary).toBeUndefined();

    for (const raw of [derived('a'), summary()]) foldRunLine(state, raw);
    resetRun(state);
    expect(state.derived).toHaveLength(0);
    expect(state.derivedSummary).toBeUndefined();
  });
});

describe('tree lines keyed by id, titled by label (ADR-355 D5, GH #494)', () => {
  // Two lines sharing one derived label — the measured condition: 31 of 61
  // lines in secret-letter shared a label with another line.
  const MAIN = 'root0000';
  const FIRST = 'branch01';
  const SECOND = 'branch02';
  const SHARED = 'den · east';

  it('two lines sharing a label fold into two results, each carrying the label', () => {
    const state = createRunState();
    beginRun(state);
    for (const raw of [
      start(FIRST, { label: SHARED, parent: MAIN }),
      command(FIRST),
      end(FIRST),
      start(SECOND, { label: SHARED, parent: MAIN }),
      command(SECOND, { passed: false, turn: 2, failure: 'Output does not contain "shed"' }),
      end(SECOND, { status: 'failed', passed: 0, failed: 1 }),
    ]) foldRunLine(state, raw);

    expect([...state.results.keys()]).toEqual([FIRST, SECOND]);
    expect(state.results.get(FIRST)).toMatchObject({ status: 'passed', label: SHARED });
    expect(state.results.get(SECOND)).toMatchObject({
      status: 'failed',
      label: SHARED,
      firstFailure: { where: 'turn 2', message: 'Output does not contain "shed"', command: 0 },
    });
    expect(state.results.get(FIRST)?.commands).toHaveLength(1);
    expect(state.results.get(SECOND)?.commands).toHaveLength(1);
  });

  it('an unreached line names its blocker by label, not by id', () => {
    const state = createRunState();
    beginRun(state);
    for (const raw of [
      start(MAIN, { label: 'opening-den' }),
      end(MAIN, { status: 'error', errorMessage: 'boom' }),
      start(FIRST, { label: SHARED }),
      end(FIRST, { status: 'unreached', blockedBy: MAIN }),
    ]) foldRunLine(state, raw);

    expect(state.results.get(FIRST)?.firstFailure).toEqual({ message: 'blocked by opening-den' });
  });

  it('beginRun and resetRun clear the announced labels', () => {
    const state = createRunState();
    beginRun(state);
    foldRunLine(state, start(FIRST, { label: SHARED }));
    expect(state.labels.get(FIRST)).toBe(SHARED);
    resetRun(state);
    expect(state.labels.size).toBe(0);
    foldRunLine(state, start(FIRST, { label: SHARED }));
    beginRun(state);
    expect(state.labels.size).toBe(0);
  });
});

describe('runRowsOf — an unvisited line reads as unvisited, never as its namesake (ADR-353 AC-3)', () => {
  const MAIN = 'root0000';
  const RAN = 'branch01';
  const NAMESAKE = 'branch02';
  const SHARED = 'den · east';
  const lines = [
    { id: MAIN, label: 'opening-den', pending: false },
    { id: RAN, label: SHARED, pending: false },
    { id: NAMESAKE, label: SHARED, pending: false },
  ];

  it('the line the run reported carries its verdict; its namesake reads as not run', () => {
    const state = createRunState();
    beginRun(state);
    for (const raw of [start(RAN, { label: SHARED }), command(RAN), end(RAN), runEnd()]) {
      foldRunLine(state, raw);
    }

    const rows = runRowsOf(state, lines);

    expect(rows.map((row) => [row.kind, row.lineId, row.label])).toEqual([
      ['result', RAN, SHARED],
      ['unrun', MAIN, 'opening-den'],
      ['unrun', NAMESAKE, SHARED],
    ]);
    const namesake = rows.find((row) => row.lineId === NAMESAKE)!;
    expect(namesake).toEqual({ kind: 'unrun', lineId: NAMESAKE, label: SHARED, why: 'not run yet' });
  });

  it('an unrun line says why: pending branch, running, or not run yet', () => {
    const state = createRunState();
    const pendingLines = [{ id: NAMESAKE, label: SHARED, pending: true }, { id: MAIN, label: 'opening-den', pending: false }];

    expect(runRowsOf(state, pendingLines).map((row) => row.kind === 'unrun' && row.why)).toEqual([
      'pending branch',
      'not run yet',
    ]);
    beginRun(state);
    expect(runRowsOf(state, pendingLines).map((row) => row.kind === 'unrun' && row.why)).toEqual([
      'pending branch',
      'running…',
    ]);
  });

  it('a reported line the model does not hold is titled by the wire label, else its key', () => {
    const state = createRunState();
    beginRun(state);
    for (const raw of [
      start('gone0001', { label: 'hall · west' }), end('gone0001'),
      start('bare0001'), end('bare0001'),
    ]) foldRunLine(state, raw);

    expect(runRowsOf(state, []).map((row) => row.label)).toEqual(['hall · west', 'bare0001']);
  });
});

describe('runRowVisitTarget — the run-column click (ADR-357 D8 step 2, AC-4)', () => {
  const MAIN = 'root0000';
  const FAILED = 'branch01';
  const ERRORED = 'branch02';
  const BLOCKED = 'branch03';
  const SKIPPED = 'branch04';
  const UNRUN = 'branch05';

  it('a failed or errored row visits its line; passed, skipped, unreached and unrun rows are inert', () => {
    const state = createRunState();
    beginRun(state);
    for (const raw of [
      start(MAIN), command(MAIN), end(MAIN),
      start(FAILED), command(FAILED, { passed: false, turn: 2, failure: 'no shed' }),
      end(FAILED, { status: 'failed', passed: 0, failed: 1 }),
      start(ERRORED), end(ERRORED, { status: 'error', passed: 0, failed: 0, errorMessage: '2 parse error(s)' }),
      start(BLOCKED), end(BLOCKED, { status: 'unreached', passed: 0, failed: 0, blockedBy: ERRORED }),
      start(SKIPPED), end(SKIPPED, { status: 'skipped', passed: 0, failed: 0 }),
    ]) foldRunLine(state, raw);

    const rows = runRowsOf(state, [{ id: UNRUN, label: 'den · up', pending: false }]);
    const targets = new Map(rows.map((row) => [row.lineId, runRowVisitTarget(row)]));
    expect(targets.get(MAIN)).toBeUndefined();
    expect(targets.get(FAILED)).toEqual({ lineId: FAILED });
    expect(targets.get(ERRORED)).toEqual({ lineId: ERRORED });
    expect(targets.get(BLOCKED)).toBeUndefined();
    expect(targets.get(SKIPPED)).toBeUndefined();
    expect(targets.get(UNRUN)).toBeUndefined();
  });

  it('a failed row visits the FIRST failing card the wire named, not a later failure and not the line top (D9)', () => {
    const state = createRunState();
    beginRun(state);
    for (const raw of [
      start(FAILED),
      command(FAILED, { input: '(opening)', line: 0, passed: true, cardId: 'c-open' }),
      command(FAILED, { passed: false, turn: 2, failure: 'no shed', cardId: 'c-shed' }),
      command(FAILED, { passed: false, turn: 3, failure: 'no lamp', cardId: 'c-lamp' }),
      end(FAILED, { status: 'failed', passed: 1, failed: 2 }),
    ]) foldRunLine(state, raw);

    const result = state.results.get(FAILED)!;
    expect(result.commands.map((c) => c.cardId)).toEqual(['c-open', 'c-shed', 'c-lamp']);
    expect(result.firstFailure).toEqual({ where: 'turn 2', message: 'no shed', command: 1, cardId: 'c-shed' });
    const [row] = runRowsOf(state, []);
    expect(runRowVisitTarget(row)).toEqual({ lineId: FAILED, cardId: 'c-shed' });
  });

  it('a failed opening claim lands on the opening card — result 0, the case that broke the index rule (D9)', () => {
    const state = createRunState();
    beginRun(state);
    for (const raw of [
      start(MAIN),
      command(MAIN, { input: '(opening)', line: 0, passed: false, failure: 'no banner', cardId: 'c-open' }),
      command(MAIN, { passed: true, turn: 1, cardId: 'c-boot' }),
      end(MAIN, { status: 'failed', passed: 1, failed: 1 }),
    ]) foldRunLine(state, raw);

    const [row] = runRowsOf(state, []);
    expect(runRowVisitTarget(row)).toEqual({ lineId: MAIN, cardId: 'c-open' });
  });
});
