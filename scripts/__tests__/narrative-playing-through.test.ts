/**
 * narrative-playing-through.test.ts — beat 4 of the author narrative
 * ("Playing through, and branching"): the tree is eleven lines forked from
 * the main line, the Folly's three-way fork among them, and a replay at the
 * pinned seed is the line that would run — two independent processes
 * produce the same events, timing aside.
 *
 * Owner context: repo tooling — `scripts/__tests__/`.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { RunEvent, TranscriptEndEvent, TranscriptStartEvent } from '@sharpee/ide-protocol';
import { FERNHILL_DIR, commandResults, runFernhillTest, runTestJson, type TestRun } from './support/fernhill-run';

let run: TestRun;

beforeAll(() => {
  run = runFernhillTest();
}, 60_000);

/** Pair each transcript-start with the next transcript-end in the stream — positional, as the wire contract says. */
function pairs(events: RunEvent[]): Array<{ start: TranscriptStartEvent; end: TranscriptEndEvent }> {
  const out: Array<{ start: TranscriptStartEvent; end: TranscriptEndEvent }> = [];
  let open: TranscriptStartEvent | undefined;
  for (const event of events) {
    if (event.type === 'transcript-start') {
      if (open) throw new Error(`transcript-start ${event.file} before ${open.file} ended`);
      open = event;
    } else if (event.type === 'transcript-end') {
      if (!open) throw new Error(`transcript-end ${event.file} with nothing open`);
      out.push({ start: open, end: event });
      open = undefined;
    }
  }
  if (open) throw new Error(`transcript-start ${open.file} never ended`);
  return out;
}

describe('the tree', () => {
  it('is eleven lines, each opened and closed once, in order, every one passing', () => {
    const lines = pairs(run.events);
    expect(lines).toHaveLength(11);
    for (const { start, end } of lines) expect(end.file).toBe(start.file);
    expect(lines.map(({ start }) => start.index)).toEqual([...Array(11).keys()]);
    expect(lines.every(({ end }) => end.status === 'passed')).toBe(true);
    // The main line first, then every branch forked from it.
    expect(lines[0].start.file).toBe('opening-iron-gates');
    expect(lines[0].start.parent).toBeUndefined();
    expect(lines.slice(1).every(({ start }) => start.parent === 'main')).toBe(true);
  });

  it('forks three ways at the Folly: open the deed box, take the deed, or wait — each branch starts with its own command on the same turn', () => {
    const lines = pairs(run.events);
    const folly = lines.filter(({ start }) => start.file.startsWith('folly · '));
    expect(folly).toHaveLength(3);
    const firstCommands = folly.map(({ start }) => {
      const at = run.events.indexOf(start);
      const first = run.events.slice(at + 1).find((event) => event.type === 'command-result');
      if (!first || first.type !== 'command-result') throw new Error(`${start.file} ran no command`);
      return first;
    });
    expect(firstCommands.map((command) => command.input)).toEqual(['open deed box with locket', 'take the deed', 'wait']);
    expect(new Set(firstCommands.map((command) => command.turn)).size).toBe(1);
  });

  it('records every card the author played: 86 commands, each with its verdict', () => {
    const results = commandResults(run);
    expect(results).toHaveLength(86);
    expect(results.every((result) => result.passed)).toBe(true);
  });
});

describe('a replay at the pinned seed is the line that would run', () => {
  it('two independent processes produce the same events, timing aside', () => {
    const first = runTestJson(FERNHILL_DIR);
    const second = runTestJson(FERNHILL_DIR);
    const strip = (events: RunEvent[]) =>
      events.map((event) => {
        const copy: Record<string, unknown> = { ...event };
        delete copy.elapsedMs;
        delete copy.duration;
        delete copy.totalDuration;
        return copy;
      });
    expect(first.events.length).toBeGreaterThan(100);
    expect(strip(second.events)).toEqual(strip(first.events));
    expect(second.stderr).toEqual(first.stderr);
    expect(second.status).toBe(first.status);
  }, 120_000);
});
