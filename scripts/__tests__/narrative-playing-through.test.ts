/**
 * narrative-playing-through.test.ts — beat 4 of the author narrative
 * ("Playing through, and branching"): the tree is eleven lines forked from
 * the main line, the Hive Yard's three-way fork among them, and a replay at the
 * pinned seed is the line that would run — two independent processes
 * produce the same events, timing aside.
 *
 * Owner context: repo tooling — `scripts/__tests__/`.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { RunEvent, TranscriptEndEvent, TranscriptStartEvent } from '@sharpee/ide-protocol';
import { STORY_DIR, STORY_TREE, commandResults, runOrchardTest, runTestJson, type TestRun } from './support/story-run';
import { readTree } from './support/scratch-story';

let run: TestRun;

beforeAll(() => {
  run = runOrchardTest();
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
  it('is four lines, each opened and closed once, in order, every one passing', () => {
    const lines = pairs(run.events);
    expect(lines).toHaveLength(4);
    for (const { start, end } of lines) expect(end.file).toBe(start.file);
    expect(lines.map(({ start }) => start.index)).toEqual([...Array(4).keys()]);
    expect(lines.every(({ end }) => end.status === 'passed')).toBe(true);
    // The main line first, then every branch forked from it.
    // A line's identity is the id of the segment it begins with; its derived
    // name rides as the label (ADR-355 D5).
    expect(lines[0].start.file).toBe(readTree(STORY_TREE).id);
    expect(lines[0].start.label).toBe('opening-gate');
    expect(lines[0].start.parent).toBeUndefined();
    // A branch names its parent line by the id of the segment that line begins
    // with — for these, the main line's root segment (ADR-355 D5).
    expect(lines.slice(1).every(({ start }) => start.parent === readTree(STORY_TREE).id)).toBe(true);
  });

  it('forks three ways at the Hive Yard: take the honeycomb, examine the hive, or wait — each branch starts with its own command on the same turn', () => {
    const lines = pairs(run.events);
    const fork = lines.filter(({ start }) => start.label?.startsWith('hive-yard · '));
    expect(fork).toHaveLength(3);
    const firstCommands = fork.map(({ start }) => {
      const at = run.events.indexOf(start);
      const first = run.events.slice(at + 1).find((event) => event.type === 'command-result');
      if (!first || first.type !== 'command-result') throw new Error(`${start.file} ran no command`);
      return first;
    });
    expect(firstCommands.map((command) => command.input)).toEqual(['take honeycomb', 'examine hive', 'wait']);
    expect(new Set(firstCommands.map((command) => command.turn)).size).toBe(1);
  });

  it('records every card the author played: 21 commands, each with its verdict', () => {
    const results = commandResults(run);
    expect(results).toHaveLength(21);
    expect(results.every((result) => result.passed)).toBe(true);
  });
});

describe('a replay at the pinned seed is the line that would run', () => {
  it('two independent processes produce the same events, timing aside', () => {
    const first = runTestJson(STORY_DIR);
    const second = runTestJson(STORY_DIR);
    const strip = (events: RunEvent[]) =>
      events.map((event) => {
        const copy: Record<string, unknown> = { ...event };
        delete copy.elapsedMs;
        delete copy.duration;
        delete copy.totalDuration;
        // A claims summary carries its walks' wall-clock time (a story with a claims fragment).
        delete copy.totalWalkMs;
        return copy;
      });
    expect(first.events.length).toBeGreaterThan(40);
    expect(strip(second.events)).toEqual(strip(first.events));
    expect(second.stderr).toEqual(first.stderr);
    expect(second.status).toBe(first.status);
  }, 120_000);
});
