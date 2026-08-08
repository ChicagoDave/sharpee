/**
 * model.test.ts — the run-event fold, driven by real stream shapes.
 *
 * Purpose: every assertion here traces to a line of `applyEvent`'s behaviour
 *   statement — what the model holds after a given event, not what the function
 *   returned. The cases that earn their keep are the two the wire exists to
 *   express and that a naive fold gets wrong: a REPLAYED execution must leave
 *   the node's own result untouched while still counting its commands, and an
 *   UNREACHED node must be present and named without being a failure.
 * Owner context: tools/ide — the Testing tab's web bundle.
 */

import { describe, expect, it } from 'vitest';
import {
  RUN_EVENT_SCHEMA_VERSION,
  type CommandResultEvent,
  type RunEvent,
  type TranscriptEndEvent,
  type TranscriptStartEvent,
} from '@sharpee/ide-protocol/run-events';
import {
  ancestry,
  applyEvent,
  createModel,
  descendantCount,
  reparentCandidates,
  storyEnd,
  STORY_OVER_ERROR,
  subtreeFailureCount,
} from '../src/model';

let seq = 0;
const envelope = () => ({ schemaVersion: RUN_EVENT_SCHEMA_VERSION, seq: seq++, elapsedMs: seq });

const ROOT = '/s/tests/arrival.transcript';
const KEY = '/s/tests/key.transcript';
const DEEP = '/s/tests/smoke.transcript';

function start(file: string, extra: Partial<TranscriptStartEvent> = {}): RunEvent {
  return { ...envelope(), type: 'transcript-start', file, index: 0, ...extra } as RunEvent;
}
function command(file: string, extra: Partial<CommandResultEvent> = {}): RunEvent {
  return {
    ...envelope(),
    type: 'command-result',
    file,
    line: 4,
    input: 'north',
    passed: true,
    expectedFailure: false,
    skipped: false,
    ...extra,
  } as RunEvent;
}
function end(file: string, extra: Partial<TranscriptEndEvent> = {}): RunEvent {
  return {
    ...envelope(),
    type: 'transcript-end',
    file,
    status: 'passed',
    passed: 1,
    failed: 0,
    expectedFailures: 0,
    skipped: 0,
    duration: 5,
    ...extra,
  } as RunEvent;
}

/** Applies a whole stream to a fresh model. */
function fold(events: RunEvent[]) {
  seq = 0;
  const model = createModel();
  events.forEach((event) => applyEvent(model, event));
  return model;
}

describe('the run-event fold', () => {
  it('marks a transcript running before any command and passed at its end', () => {
    const model = createModel();
    applyEvent(model, { ...envelope(), type: 'run-start', mode: 'tests', transcriptCount: 1 } as RunEvent);
    applyEvent(model, start(ROOT, { commandCount: 2 }));

    const node = model.nodes.get(ROOT)!;
    expect(node.status).toBe('running');
    expect(model.running).toBe(node);
    expect(node.commandCount).toBe(2);
    expect(node.turns).toHaveLength(0);

    applyEvent(model, command(ROOT, { line: 10 }));
    expect(node.turns.map((t) => t.line)).toEqual([10]);
    expect(model.authoredCommands).toBe(1);

    applyEvent(model, end(ROOT, { passed: 1, duration: 7 }));
    expect(node.status).toBe('passed');
    expect(node.passed).toBe(1);
    expect(node.duration).toBe(7);
    expect(model.running).toBeNull();
  });

  it('builds parentage from the wire and keeps a node under one parent across executions', () => {
    const model = fold([
      start(ROOT),
      end(ROOT),
      start(KEY, { parent: ROOT }),
      end(KEY),
      // The same node announced again as a replay, carrying its parent again.
      start(KEY, { parent: ROOT, replayed: true }),
      end(KEY),
    ]);

    const root = model.nodes.get(ROOT)!;
    expect(model.roots.map((n) => n.file)).toEqual([ROOT]);
    expect(root.children.map((n) => n.file)).toEqual([KEY]);
    expect(root.children).toHaveLength(1);
  });

  it('re-parents a node first seen as a root once its parent arrives', () => {
    // The tree runner can execute a child before the parent is announced with
    // parentage; a node must not be stranded at the top level when that happens.
    const model = fold([start(KEY), end(KEY), start(ROOT), end(ROOT), start(KEY, { parent: ROOT }), end(KEY)]);
    expect(model.roots.map((n) => n.file)).toEqual([ROOT]);
    expect(model.nodes.get(ROOT)!.children.map((n) => n.file)).toEqual([KEY]);
  });

  // ADR-302 D17. This is the case a naive fold gets wrong: it would clear the
  // node's turns and re-run its status from a replay that is not its own test.
  it('counts a replayed execution as replayed commands and leaves the node untouched', () => {
    const model = fold([
      start(ROOT, { commandCount: 1 }),
      command(ROOT, { input: 'north', line: 10 }),
      end(ROOT, { passed: 1, duration: 3 }),
      // Re-executed to rebuild a sibling's state.
      start(ROOT, { commandCount: 1, replayed: true }),
      command(ROOT, { input: 'north', line: 10 }),
      end(ROOT, { passed: 1, duration: 3 }),
    ]);

    const node = model.nodes.get(ROOT)!;
    expect(node.replays).toBe(1);
    expect(node.turns).toHaveLength(1);
    expect(node.status).toBe('passed');
    expect(model.authoredCommands).toBe(1);
    expect(model.replayedCommands).toBe(1);
  });

  it('a replay of a FAILED node does not overwrite its failure', () => {
    const model = fold([
      start(ROOT),
      command(ROOT, { passed: false, error: 'no exit that way' }),
      end(ROOT, { status: 'failed', passed: 0, failed: 1 }),
      start(ROOT, { replayed: true }),
      end(ROOT, { status: 'passed', passed: 1, failed: 0 }),
    ]);
    expect(model.nodes.get(ROOT)!.status).toBe('failed');
    expect(model.nodes.get(ROOT)!.failed).toBe(1);
  });

  // ADR-302 D13.
  it('records an unreached node with what blocked it, and never as a failure', () => {
    const model = fold([
      start(ROOT),
      command(ROOT, { passed: false }),
      end(ROOT, { status: 'failed', passed: 0, failed: 1 }),
      start(DEEP, { parent: ROOT }),
      end(DEEP, {
        status: 'unreached',
        passed: 0,
        failed: 0,
        duration: 0,
        blockedBy: ROOT,
      }),
    ]);

    const blocked = model.nodes.get(DEEP)!;
    expect(blocked.status).toBe('unreached');
    expect(blocked.blockedBy).toBe(ROOT);
    expect(blocked.turns).toHaveLength(0);
    expect(blocked.failed).toBe(0);
    // One failure, plus a count of what it blocked — not a wall of red.
    expect(subtreeFailureCount(model.nodes.get(ROOT)!)).toBe(0);
  });

  it('counts failures and errors beneath a node, so a failure off the selected path is visible', () => {
    const model = fold([
      start(ROOT),
      end(ROOT),
      start(KEY, { parent: ROOT }),
      end(KEY, { status: 'failed', passed: 0, failed: 1 }),
      start(DEEP, { parent: KEY }),
      end(DEEP, { status: 'error', errorMessage: 'story load failed' }),
    ]);
    expect(subtreeFailureCount(model.nodes.get(ROOT)!)).toBe(2);
    expect(subtreeFailureCount(model.nodes.get(KEY)!)).toBe(1);
    expect(model.nodes.get(ROOT)!.status).toBe('passed');
  });

  it('drops a command that arrives with no open execution rather than misattributing it', () => {
    const model = fold([start(ROOT), end(ROOT), command(ROOT)]);
    expect(model.nodes.get(ROOT)!.turns).toHaveLength(0);
    expect(model.authoredCommands).toBe(0);
  });

  it('keeps the engine turn a command executed as, and its absence when the wire had none', () => {
    const model = fold([
      start(ROOT),
      command(ROOT, { turn: 1 }),
      command(ROOT, { line: 6, input: 'score', turn: 2 }),
      // A meta command shares its turn with the next action — the model must
      // hold what the wire said, never re-derive a count of its own.
      command(ROOT, { line: 8, input: 'east', turn: 2 }),
      command(ROOT, { line: 10, input: 'west' }),
      end(ROOT),
    ]);
    const turns = model.nodes.get(ROOT)!.turns;
    expect(turns.map((t) => t.turn)).toEqual([1, 2, 2, undefined]);
  });

  it('counts every transcript beneath a node — the blast radius of a turn-count edit', () => {
    const model = fold([
      start(ROOT),
      end(ROOT),
      start(KEY, { parent: ROOT }),
      end(KEY),
      start(DEEP, { parent: KEY }),
      end(DEEP),
    ]);
    expect(descendantCount(model.nodes.get(ROOT)!)).toBe(2);
    expect(descendantCount(model.nodes.get(KEY)!)).toBe(1);
    expect(descendantCount(model.nodes.get(DEEP)!)).toBe(0);
  });

  it('pairs phase events and keeps their elapsed span', () => {
    const model = fold([
      { ...envelope(), type: 'run-start', mode: 'tree' } as RunEvent,
      { schemaVersion: RUN_EVENT_SCHEMA_VERSION, seq: 1, elapsedMs: 2, type: 'phase', name: 'compile', status: 'started' } as RunEvent,
      { schemaVersion: RUN_EVENT_SCHEMA_VERSION, seq: 2, elapsedMs: 12, type: 'phase', name: 'compile', status: 'finished' } as RunEvent,
      { schemaVersion: RUN_EVENT_SCHEMA_VERSION, seq: 3, elapsedMs: 12, type: 'phase', name: 'load', status: 'started' } as RunEvent,
    ]);
    expect(model.phases).toHaveLength(2);
    expect(model.phases[0]).toMatchObject({ name: 'compile', finishedAt: 12, startedAt: 2 });
    expect(model.phases[1].finishedAt).toBeUndefined();
  });

  it('closes the run and stops reporting anything as running', () => {
    const model = fold([
      start(ROOT),
      {
        ...envelope(),
        type: 'run-end',
        totalPassed: 1,
        totalFailed: 0,
        totalExpectedFailures: 0,
        totalSkipped: 0,
        totalErrors: 0,
        totalUnreached: 2,
        totalDuration: 40,
        exitCode: 0,
      } as RunEvent,
    ]);
    expect(model.running).toBeNull();
    expect(model.inFlight).toBe(false);
    expect(model.summary?.totalUnreached).toBe(2);
  });

  it('ignores an event type it does not know, per the wire additive contract', () => {
    const model = fold([start(ROOT)]);
    const before = model.nodes.size;
    applyEvent(model, { ...envelope(), type: 'finding', detail: 'softlock' } as unknown as RunEvent);
    expect(model.nodes.size).toBe(before);
  });

  it('walks ancestry root-first and terminates on a cycle rather than hanging', () => {
    const model = fold([
      start(ROOT),
      end(ROOT),
      start(KEY, { parent: ROOT }),
      end(KEY),
      start(DEEP, { parent: KEY }),
      end(DEEP),
    ]);
    expect(ancestry(model, model.nodes.get(DEEP)!).map((n) => n.stem)).toEqual([
      'arrival',
      'key',
      'smoke',
    ]);

    // A malformed stream naming a node its own ancestor must not loop forever.
    const cyclic = model.nodes.get(ROOT)!;
    cyclic.parent = DEEP;
    expect(ancestry(model, cyclic).length).toBeLessThanOrEqual(model.nodes.size);
  });
});

// R9: after an ending, every further command errors as EXACTLY the runner's
// normalized string — the one wire signal there is. The derivation must split
// the run at the first such error, never guess beyond the evidence, and never
// fire on an ordinary failure.
describe('storyEnd', () => {
  it('is null for a run that never showed an ending — including ordinary failures', () => {
    const model = fold([
      start(ROOT),
      command(ROOT),
      command(ROOT, { line: 6, passed: false, error: 'Expected output not found' }),
      end(ROOT, { status: 'failed', passed: 1, failed: 1 }),
    ]);
    expect(storyEnd(model.nodes.get(ROOT)!)).toBeNull();
  });

  it('names the ender and the dead tail, split at the first stopped-engine error', () => {
    const model = fold([
      start(ROOT),
      command(ROOT, { input: 'wait' }),
      command(ROOT, { line: 6, input: 'cut the fuse' }),
      command(ROOT, { line: 8, input: 'look', passed: false, error: STORY_OVER_ERROR }),
      command(ROOT, { line: 10, input: 'inventory', passed: false, error: STORY_OVER_ERROR }),
      end(ROOT, { status: 'failed', passed: 2, failed: 2 }),
    ]);
    const found = storyEnd(model.nodes.get(ROOT)!);
    expect(found?.endsAt?.input).toBe('cut the fuse');
    expect(found?.dead.map((turn) => turn.input)).toEqual(['look', 'inventory']);
  });

  it('has no ender when the story was over before the first command — the ending is an ancestor\'s', () => {
    const model = fold([
      start(ROOT),
      command(ROOT, { passed: false, error: STORY_OVER_ERROR }),
      end(ROOT, { status: 'failed', passed: 0, failed: 1 }),
    ]);
    const found = storyEnd(model.nodes.get(ROOT)!);
    expect(found).not.toBeNull();
    expect(found?.endsAt).toBeNull();
    expect(found?.dead).toHaveLength(1);
  });
});

// The exclusions are by construction, not refusal-after-the-fact: what the
// picker never offers, the author can never write.
describe('reparentCandidates', () => {
  it('excludes the node itself and everything beneath it — a cycle by construction', () => {
    const model = fold([
      start(ROOT),
      end(ROOT),
      start(KEY, { parent: ROOT }),
      end(KEY),
      start(DEEP, { parent: KEY }),
      end(DEEP),
    ]);
    const forKey = reparentCandidates(model, model.nodes.get(KEY)!).map((n) => n.stem);
    expect(forKey).toEqual(['arrival']);
    const forRoot = reparentCandidates(model, model.nodes.get(ROOT)!);
    expect(forRoot).toEqual([]);
  });

  it('excludes a file whose run reached the story\'s ending — its children would die', () => {
    const model = fold([
      start(ROOT),
      end(ROOT),
      start(KEY, { parent: ROOT }),
      command(KEY, { passed: false, error: STORY_OVER_ERROR }),
      end(KEY, { status: 'failed', passed: 0, failed: 1 }),
      start(DEEP, { parent: ROOT }),
      end(DEEP),
    ]);
    const stems = reparentCandidates(model, model.nodes.get(DEEP)!).map((n) => n.stem);
    expect(stems).toEqual(['arrival']);
  });
});
