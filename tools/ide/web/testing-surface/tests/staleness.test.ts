/**
 * staleness.test.ts — ADR-357 D11: a result goes stale, it never vanishes.
 *
 * The baseline is captured over the real `TreeSessionModel`, and each rule
 * is proved in both directions: an edit that D11 names makes the line stale,
 * an edit it exempts (a fork added below a card) does not. The stored run
 * round-trips through the shape the sidecar keeps, and junk restores nothing.
 */
import { describe, expect, it } from 'vitest';
import { emptyTreeDocument, type TreeCard, type TreeDocument } from '@sharpee/branch-tester/tree-document';
import { TreeSessionModel } from '../src/model';
import { beginRun, createRunState, finishRun, foldRunLine } from '../src/run';
import { verdictOfResult } from '../src/line-verdict';
import {
  areDerivedStale,
  captureBaseline,
  cardFingerprint,
  evaluateStaleness,
  isLineStale,
  restoreRun,
  storedRunOf,
} from '../src/staleness';
import { resetRun } from '../src/run';

const card = (id: string, command: string, extra: Partial<TreeCard> = {}): TreeCard => ({
  id, type: 'turn', command, assertions: { contains: [`did ${command}`] }, ...extra,
});

/** A main line of three turns with a two-card branch off the second. */
function document(): TreeDocument {
  return {
    ...emptyTreeDocument('teststory', 42, 'main'),
    cards: [
      { id: 'c-open', type: 'opening' },
      card('c1', 'look'),
      card('c2', 'north', { branches: [{ id: 'side', cards: [card('s1', 'east'), card('s2', 'west')] }] }),
      card('c3', 'south'),
    ],
  };
}

function loaded(): TreeSessionModel {
  const model = new TreeSessionModel('teststory', 42);
  model.load(document());
  return model;
}

describe('captureBaseline', () => {
  it('records every line\'s path as card ids, root through the fork card then its own cards, and a fingerprint per card', () => {
    const model = loaded();
    const baseline = captureBaseline(model, 'build-1');
    expect(baseline.build).toBe('build-1');
    expect(baseline.paths['main']).toEqual(['c-open', 'c1', 'c2', 'c3']);
    expect(baseline.paths['side']).toEqual(['c-open', 'c1', 'c2', 's1', 's2']);
    expect(Object.keys(baseline.fingerprints).sort()).toEqual(['c-open', 'c1', 'c2', 'c3', 's1', 's2']);
  });

  it('a fingerprint ignores branches and continuation, and key order', () => {
    const plain = card('c2', 'north');
    const forked = card('c2', 'north', { branches: [{ id: 'x', cards: [] }], continuation: 'cont' });
    expect(cardFingerprint(forked)).toBe(cardFingerprint(plain));
    const reordered = { assertions: { contains: ['did north'] }, command: 'north', type: 'turn', id: 'c2' } as TreeCard;
    expect(cardFingerprint(reordered)).toBe(cardFingerprint(plain));
  });
});

describe('isLineStale', () => {
  it('nothing is stale against the unchanged tree and the same build', () => {
    const model = loaded();
    const baseline = captureBaseline(model, 'build-1');
    for (const id of model.lineIds()) expect(isLineStale(baseline, model, id, 'build-1')).toBe(false);
    expect(areDerivedStale(baseline, 'build-1')).toBe(false);
  });

  it('a build change makes every line and the derived tier stale', () => {
    const model = loaded();
    const baseline = captureBaseline(model, 'build-1');
    for (const id of model.lineIds()) expect(isLineStale(baseline, model, id, 'build-2')).toBe(true);
    expect(areDerivedStale(baseline, 'build-2')).toBe(true);
  });

  it('an unknown build on either side never marks anything stale by build', () => {
    const model = loaded();
    expect(isLineStale(captureBaseline(model), model, 'main', 'build-2')).toBe(false);
    expect(isLineStale(captureBaseline(model, 'build-1'), model, 'main', undefined)).toBe(false);
    expect(areDerivedStale(captureBaseline(model), 'build-2')).toBe(false);
  });

  it('editing a card\'s claims makes its own line and every line through it stale, and no other', () => {
    const model = loaded();
    const baseline = captureBaseline(model, 'build-1');
    // c1 is on both paths; c3 is on the main line only.
    const main = model.document.cards;
    main[3].assertions = { contains: ['did south', 'and more'] };
    expect(isLineStale(baseline, model, 'main', 'build-1')).toBe(true);
    expect(isLineStale(baseline, model, 'side', 'build-1')).toBe(false);
    main[1].assertions = { contains: ['changed'] };
    expect(isLineStale(baseline, model, 'side', 'build-1')).toBe(true);
  });

  it('inserting, removing or reordering cards changes the path and makes the line stale', () => {
    const model = loaded();
    const baseline = captureBaseline(model, 'build-1');
    const main = model.document.cards;
    main.splice(3, 0, card('c-new', 'wait'));
    expect(isLineStale(baseline, model, 'main', 'build-1')).toBe(true);
    main.splice(3, 1);
    expect(isLineStale(baseline, model, 'main', 'build-1')).toBe(false);
    const [c3] = main.splice(3, 1);
    expect(c3.id).toBe('c3');
    expect(isLineStale(baseline, model, 'main', 'build-1')).toBe(true);
  });

  it('a fork added below a card is not an edit to it — the lines through that card stay current', () => {
    const model = loaded();
    const baseline = captureBaseline(model, 'build-1');
    const c1 = model.document.cards[1];
    c1.branches = [{ id: 'other', cards: [card('o1', 'up')] }];
    expect(isLineStale(baseline, model, 'main', 'build-1')).toBe(false);
    expect(isLineStale(baseline, model, 'side', 'build-1')).toBe(false);
  });

  it('a line the baseline never saw is not judged — an unknown never marks a result stale', () => {
    const model = loaded();
    const baseline = captureBaseline(model, 'build-1');
    expect(isLineStale(baseline, model, 'added-later', 'build-1')).toBe(false);
  });

  it('a line the baseline knew that the tree no longer holds is stale', () => {
    const model = loaded();
    const baseline = captureBaseline(model, 'build-1');
    expect(model.deleteBranch('side')).not.toBeNull();
    expect(isLineStale(baseline, model, 'side', 'build-1')).toBe(true);
  });
});

describe('the stored run', () => {
  const line = (event: Record<string, unknown>): string =>
    JSON.stringify({ schemaVersion: 2, seq: 1, elapsedMs: 1, ...event });

  function finishedRun() {
    const model = loaded();
    const state = createRunState();
    beginRun(state);
    state.baseline = captureBaseline(model, 'build-1');
    for (const raw of [
      line({ type: 'transcript-start', file: 'main', index: 0, label: 'opening-south' }),
      line({ type: 'command-result', file: 'main', line: 0, input: 'look', passed: true, expectedFailure: false, skipped: false }),
      line({ type: 'command-result', file: 'main', line: 0, input: 'south', passed: false, expectedFailure: false, skipped: false, turn: 3, failure: 'Output does not contain "did south"' }),
      line({ type: 'transcript-end', file: 'main', status: 'failed', passed: 1, failed: 1, expectedFailures: 0, skipped: 0, duration: 5 }),
      line({ type: 'transcript-start', file: 'side', index: 1, label: 'north · east' }),
      line({ type: 'command-result', file: 'side', line: 0, input: 'east', passed: true, expectedFailure: false, skipped: false }),
      line({ type: 'transcript-end', file: 'side', status: 'passed', passed: 1, failed: 0, expectedFailures: 0, skipped: 0, duration: 5 }),
      line({ type: 'run-end', totalPassed: 1, totalFailed: 1, totalExpectedFailures: 0, totalSkipped: 0, totalErrors: 0, totalUnreached: 0, totalDuration: 9, exitCode: 1 }),
    ]) foldRunLine(state, raw);
    finishRun(state, false);
    return { model, state };
  }

  it('keeps verdicts, the first failure and the baseline, and drops passing commands', () => {
    const { state } = finishedRun();
    const stored = storedRunOf(state)!;
    expect(stored.version).toBe(1);
    expect(stored.baseline.build).toBe('build-1');
    expect(stored.lines.map((entry) => [entry.id, entry.status])).toEqual([['main', 'failed'], ['side', 'passed']]);
    expect(stored.lines[0].firstFailure).toEqual({ where: 'turn 3', message: 'Output does not contain "did south"', command: 1 });
    expect(JSON.stringify(stored)).not.toContain('"commands"');
  });

  it('is undefined while a run is in flight and before any run', () => {
    const state = createRunState();
    expect(storedRunOf(state)).toBeUndefined();
    beginRun(state);
    state.baseline = captureBaseline(loaded(), 'build-1');
    expect(storedRunOf(state)).toBeUndefined();
  });

  it('restores into a fresh column with the verdicts and baseline, no command detail, judged current against the same tree', () => {
    const { model, state } = finishedRun();
    const stored = JSON.parse(JSON.stringify(storedRunOf(state)));
    const fresh = createRunState();
    expect(restoreRun(fresh, stored)).toBe(true);
    expect(fresh.results.get('main')?.status).toBe('failed');
    expect(fresh.results.get('main')?.commands).toEqual([]);
    expect(fresh.results.get('side')?.label).toBe('north · east');
    expect(fresh.baseline?.build).toBe('build-1');
    expect(isLineStale(fresh.baseline!, model, 'main', 'build-1')).toBe(false);
    expect(verdictOfResult(fresh.results.get('main'))).toBe('fail');
  });

  it('a restored result judged stale reads as stale in the outline, whatever it said', () => {
    const { model, state } = finishedRun();
    const fresh = createRunState();
    restoreRun(fresh, storedRunOf(state));
    model.document.cards[3].assertions = { contains: ['edited'] };
    const result = fresh.results.get('main')!;
    result.stale = isLineStale(fresh.baseline!, model, 'main', 'build-1');
    expect(result.stale).toBe(true);
    expect(verdictOfResult(result)).toBe('stale');
  });

  it('keeps the derived tier\'s failures and errors and its summary, drops its passes, and restores them', () => {
    const { state } = finishedRun();
    state.derived = [
      { label: 'story · a', status: 'passed' },
      { label: 'story · b', status: 'failed', failure: 'x' },
      { label: 'story · c', status: 'error', detail: 'boom' },
      { label: 'story · d', status: 'skipped', shape: 'command-none' },
    ] as typeof state.derived;
    state.derivedSummary = { branches: { total: 4, passed: 1, failed: 1, skipped: 1, errors: 1 } } as unknown as typeof state.derivedSummary;
    const stored = storedRunOf(state)!;
    expect(stored.derived.map((row) => row.status)).toEqual(['failed', 'error']);
    expect(stored.derivedSummary).toEqual(state.derivedSummary);

    const fresh = createRunState();
    fresh.derivedSummary = { branches: { total: 9 } } as unknown as typeof state.derivedSummary;
    expect(restoreRun(fresh, JSON.parse(JSON.stringify(stored)))).toBe(true);
    expect(fresh.derived.map((row) => row.status)).toEqual(['failed', 'error']);
    expect(fresh.derivedSummary).toEqual(state.derivedSummary);

    const withoutSummary = createRunState();
    withoutSummary.derivedSummary = { branches: { total: 9 } } as unknown as typeof state.derivedSummary;
    restoreRun(withoutSummary, { ...stored, derivedSummary: undefined });
    expect(withoutSummary.derivedSummary).toBeUndefined();
  });

  it('restoring into a column that has already run replaces everything it held', () => {
    const { state } = finishedRun();
    state.note = 'the stream died';
    state.pendingCommands.set('main', []);
    state.replaying.add('side');
    state.inFlight = true;
    const other = createRunState();
    beginRun(other);
    other.baseline = captureBaseline(loaded(), 'build-9');
    other.results.set('elsewhere', { status: 'passed', passed: 1, failed: 0, commands: [], moreFailures: 0, label: 'Elsewhere' });
    other.labels.set('elsewhere', 'Elsewhere');
    finishRun(other, true);

    expect(restoreRun(state, storedRunOf(other))).toBe(true);
    expect([...state.results.keys()]).toEqual(['elsewhere']);
    expect([...state.labels.entries()]).toEqual([['elsewhere', 'Elsewhere']]);
    expect(state.pendingCommands.size).toBe(0);
    expect(state.replaying.size).toBe(0);
    expect(state.inFlight).toBe(false);
    expect(state.tally).toBeUndefined();
    expect(state.note).toBeUndefined();
    expect(state.baseline?.build).toBe('build-9');
  });

  it('junk restores nothing and leaves the column untouched', () => {
    const fresh = createRunState();
    for (const junk of [undefined, null, 'x', {}, { version: 2, baseline: {}, lines: [], derived: [] }, { version: 1, baseline: { paths: {}, fingerprints: {} }, lines: [{ id: 1 }], derived: [] }]) {
      expect(restoreRun(fresh, junk)).toBe(false);
    }
    expect(fresh.results.size).toBe(0);
    expect(fresh.baseline).toBeUndefined();
  });
});

describe('evaluateStaleness — the wiring that applies the rules to the column', () => {
  const line = (event: Record<string, unknown>): string =>
    JSON.stringify({ schemaVersion: 2, seq: 1, elapsedMs: 1, ...event });

  function ranAgainst(model: TreeSessionModel) {
    const state = createRunState();
    beginRun(state);
    state.baseline = captureBaseline(model, 'build-1');
    for (const raw of [
      line({ type: 'transcript-start', file: 'main', index: 0 }),
      line({ type: 'command-result', file: 'main', line: 0, input: 'look', passed: true, expectedFailure: false, skipped: false }),
      line({ type: 'transcript-end', file: 'main', status: 'passed', passed: 1, failed: 0, expectedFailures: 0, skipped: 0, duration: 1 }),
      line({ type: 'transcript-start', file: 'side', index: 1 }),
      line({ type: 'command-result', file: 'side', line: 0, input: 'east', passed: true, expectedFailure: false, skipped: false }),
      line({ type: 'transcript-end', file: 'side', status: 'passed', passed: 1, failed: 0, expectedFailures: 0, skipped: 0, duration: 1 }),
      line({ type: 'derived-branch', label: 'story · a', status: 'passed', span: null }),
      line({ type: 'run-end', totalPassed: 2, totalFailed: 0, totalExpectedFailures: 0, totalSkipped: 0, totalErrors: 0, totalUnreached: 0, totalDuration: 2, exitCode: 0 }),
    ]) foldRunLine(state, raw);
    finishRun(state, true);
    return state;
  }

  it('a fresh fold carries no stale flag, and judging the unchanged tree sets none', () => {
    const model = loaded();
    const state = ranAgainst(model);
    expect([...state.results.values()].every((result) => result.stale === undefined)).toBe(true);
    expect(evaluateStaleness(state, model, 'build-1')).toBe(true);
    expect([...state.results.values()].every((result) => result.stale === undefined)).toBe(true);
    expect(state.derivedStale).toBeUndefined();
  });

  it('an edit sets stale on the lines through the card and nothing else; undoing it clears the flag', () => {
    const model = loaded();
    const state = ranAgainst(model);
    const original = model.document.cards[3].assertions;
    model.document.cards[3].assertions = { contains: ['edited'] };
    evaluateStaleness(state, model, 'build-1');
    expect(state.results.get('main')?.stale).toBe(true);
    expect(state.results.get('side')?.stale).toBeUndefined();
    expect(state.derivedStale).toBeUndefined();

    model.document.cards[3].assertions = original;
    evaluateStaleness(state, model, 'build-1');
    expect(state.results.get('main')?.stale).toBeUndefined();
  });

  it('a build change marks every line and the derived tier stale, and the matching build clears it', () => {
    const model = loaded();
    const state = ranAgainst(model);
    evaluateStaleness(state, model, 'build-2');
    expect([...state.results.values()].every((result) => result.stale === true)).toBe(true);
    expect(state.derivedStale).toBe(true);
    evaluateStaleness(state, model, 'build-1');
    expect([...state.results.values()].every((result) => result.stale === undefined)).toBe(true);
    expect(state.derivedStale).toBeUndefined();
  });

  it('judges nothing without a baseline or while a run is in flight', () => {
    const model = loaded();
    const noBaseline = createRunState();
    noBaseline.results.set('main', { status: 'passed', passed: 1, failed: 0, commands: [], moreFailures: 0 });
    expect(evaluateStaleness(noBaseline, model, 'build-2')).toBe(false);
    expect(noBaseline.results.get('main')?.stale).toBeUndefined();

    const inFlight = ranAgainst(model);
    inFlight.inFlight = true;
    expect(evaluateStaleness(inFlight, model, 'build-2')).toBe(false);
    expect(inFlight.results.get('main')?.stale).toBeUndefined();
  });

  it('beginRun and resetRun both drop the baseline and the derived flag', () => {
    const model = loaded();
    const state = ranAgainst(model);
    evaluateStaleness(state, model, 'build-2');
    expect(state.baseline).toBeDefined();
    expect(state.derivedStale).toBe(true);
    beginRun(state);
    expect(state.baseline).toBeUndefined();
    expect(state.derivedStale).toBeUndefined();

    const again = ranAgainst(model);
    evaluateStaleness(again, model, 'build-2');
    resetRun(again);
    expect(again.baseline).toBeUndefined();
    expect(again.derivedStale).toBeUndefined();
    expect(again.results.size).toBe(0);
  });
});
