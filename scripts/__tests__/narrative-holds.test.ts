/**
 * narrative-holds.test.ts — the author narrative's beats, as claims about any
 * story rather than measurements of fernhill. The other `narrative-*` suites
 * pin fernhill's own numbers (34 of 63, "Iron Gates", line 636); this one
 * asks whether each beat holds on whatever story it is pointed at: fernhill
 * always, and the story `NARRATIVE_STORY` names alongside it.
 *
 *   NARRATIVE_STORY=branch-stories/<story> pnpm test:scripts narrative-holds
 *
 * Two kinds of claim live here, in separate cases so a red one says which.
 * Tool claims (the report agrees with itself, every gap is named, the tree is
 * canonical, a replay is deterministic) are failures of the tester when they
 * break. Story claims (every card passes, every room is reachable, no derived
 * row fails) are findings about the story when they break — the checkpoint
 * reads them, and the diff names the cards, rooms or rows.
 *
 * Fernhill-only beats stay in their own suites: the planted-rule mutations,
 * the removed END STATE card, the Tobias rows and the exit-2 corruptions are
 * fixtures written against fernhill's source, not claims every story makes.
 *
 * Owner context: repo tooling — `scripts/__tests__/`.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { RunEvent, TranscriptEndEvent, TranscriptStartEvent } from '@sharpee/ide-protocol';
import {
  TREE_MANIFEST_FILE_NAME,
  checkCanonicalTree,
  type TreeCard,
} from '../../packages/branch-tester/src/tree-document';
import {
  commandResults,
  composeIR,
  derivedBranches,
  derivedSummary,
  runEnd,
  runWorldIndex,
  type TestRun,
} from './support/fernhill-run';
import { readTree, readTreeFiles } from './support/scratch-story';
import { runStoryTest, runTestJsonAsync, storiesUnderTest, type StoryUnderTest } from './support/story-under-test';

/** Pair each transcript-start with the next transcript-end — positional, as the wire contract says. */
function lines(events: RunEvent[]): Array<{ start: TranscriptStartEvent; end: TranscriptEndEvent }> {
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

/** Every card in the tree, main line and branches, depth first. */
function allCards(cards: TreeCard[]): TreeCard[] {
  return cards.flatMap((card) => [card, ...(card.branches ?? []).flatMap((branch) => allCards(branch.cards))]);
}

describe.each(storiesUnderTest().map((story) => [story.id, story] as const))('%s', (_id, story: StoryUnderTest) => {
  let run: TestRun;

  beforeAll(async () => {
    run = await runStoryTest(story);
    // Every beat below reads this run, so a run that produced nothing must fail here.
    expect(run.events[0]?.type).toBe('run-start');
    expect(run.events.at(-1)?.type).toBe('run-end');
  }, 300_000);

  describe('the first rooms: the World tab', () => {
    let dir: string;
    let document: {
      ok: boolean;
      story: { id: string };
      map: { positions: Array<{ room: string }>; unplaced: unknown[] };
      reach: { rooms: { total: number; reachable: string[]; unreached: string[] } };
      incomplete: { counts: Record<string, number>; noObject: unknown[]; undescribed: unknown[] };
    };

    beforeAll(() => {
      dir = mkdtempSync(join(tmpdir(), `narrative-holds-${story.id}-`));
      const irFile = join(dir, `${story.id}.ir.json`);
      composeIR(story.storyFile, irFile);
      const result = runWorldIndex(irFile);
      expect(result.status).toBe(0);
      document = result.document as unknown as typeof document;
    }, 120_000);

    afterAll(() => {
      if (dir) rmSync(dir, { recursive: true, force: true });
    });

    it('the analysis reads the story, every room is placed on the Map or named as unplaced, and its counts match its lists', () => {
      expect(document.ok).toBe(true);
      expect(document.story.id).toBe(story.id);
      expect(document.map.positions.length + document.map.unplaced.length).toBe(document.reach.rooms.total);
      const { reachable, unreached, total } = document.reach.rooms;
      expect(reachable.length + unreached.length).toBe(total);
      expect(document.incomplete.counts.noObject).toBe(document.incomplete.noObject.length);
      expect(document.incomplete.counts.undescribed).toBe(document.incomplete.undescribed.length);
    });

    it('story: the Map places every room', () => {
      expect(document.map.unplaced).toEqual([]);
    });

    it('story: Reach finds no room play never arrives at', () => {
      expect(document.reach.rooms.unreached).toEqual([]);
    });
  });

  describe('pinning the prose: every card is evaluated', () => {
    it('every executed command carries its verdicts, and its pass agrees with them', () => {
      const executed = commandResults(run).filter((result) => !result.skipped);
      expect(executed.length).toBeGreaterThan(0);
      for (const result of executed) {
        expect(result.assertionResults?.length, `${result.file} turn ${result.turn} "${result.input}" evaluated nothing`).toBeGreaterThan(0);
        if (result.error === undefined) {
          expect(result.passed, `${result.file} "${result.input}"`).toBe(result.assertionResults!.every((verdict) => verdict.passed));
        }
      }
    });

    it('story: every card passes', () => {
      const failed = commandResults(run)
        .filter((result) => !result.passed && !result.expectedFailure)
        .map((result) => `${result.file} "${result.input}": ${result.failure ?? result.error}`);
      expect(failed).toEqual([]);
    });
  });

  describe('playing through and branching: lines, forks and replay', () => {
    it('each line opens and closes once, in order, and every branch names a line that ran before it', () => {
      const played = lines(run.events);
      expect(played.length).toBeGreaterThan(0);
      expect(played.map(({ start }) => start.index)).toEqual([...Array(played.length).keys()]);
      for (const { start, end } of played) expect(end.file).toBe(start.file);
      expect(played[0].start.parent).toBeUndefined();
      expect(played[0].start.file).toBe(readTree(story.treeDir).id);
      const seen = new Set<string>();
      for (const { start } of played) {
        if (start !== played[0].start) expect(seen.has(start.parent ?? ''), `${start.label ?? start.file} forks from an unknown line`).toBe(true);
        seen.add(start.file);
      }
    });

    it('a replay at the pinned seed is the line that would run: a second process produces the same events, timing aside', async () => {
      const again = await runTestJsonAsync(story.dir);
      const strip = (events: RunEvent[]) =>
        events.map((event) => {
          const copy: Record<string, unknown> = { ...event };
          delete copy.elapsedMs;
          delete copy.duration;
          delete copy.totalDuration;
          return copy;
        });
      expect(strip(again.events)).toEqual(strip(run.events));
      expect(again.stderr).toEqual(run.stderr);
      expect(again.status).toBe(run.status);
    }, 300_000);
  });

  describe('endings: END STATE cards and the ending ratio', () => {
    it('every END STATE card in the tree is asserted from the engine\'s record on some executed command', () => {
      const declared = allCards(readTree(story.treeDir).cards).flatMap((card) => (card.ending ? [card.ending] : []));
      const asserted = new Set(
        commandResults(run).flatMap((result) => (result.assertionResults ?? []).map((verdict) => verdict.description)),
      );
      for (const ending of declared) expect(asserted.has(`ending ${ending}`), `END STATE ${ending} never asserted`).toBe(true);
    });

    it('declared endings are reached or listed as unreached, each by source line, in the report as on the wire', () => {
      const { endings } = derivedSummary(run);
      expect(endings.reached + endings.unreached.length).toBe(endings.declared);
      expect(run.stderr).toContain(`Endings reached: ${endings.reached} / ${endings.declared}`);
      for (const ending of endings.unreached) {
        expect(ending.line, `unreached ${ending.id} carries no source line`).not.toBeNull();
        const printed = `:${ending.line} · ${ending.id} (${ending.statement})`;
        expect(run.stderr.some((line) => line.endsWith(printed)), `unreached ${ending.id} not in the report`).toBe(true);
      }
    });
  });

  describe('reading the numbers: three ratios, every gap listed', () => {
    it('Branches: every declared branch has one event, and every unexercised one is a named, located gap', () => {
      const { branches } = derivedSummary(run);
      const events = derivedBranches(run);
      expect(events).toHaveLength(branches.declared);
      expect(branches.exercised).toBe(branches.passed + branches.failed);
      expect(branches.gaps).toHaveLength(branches.declared - branches.exercised);
      // A gap is a skip or an engine error — both unexercised, both listed.
      expect(events.filter((event) => event.status === 'skipped' || event.status === 'error')).toHaveLength(branches.gaps.length);
      for (const gap of branches.gaps) {
        if (gap.status === 'skipped') expect(typeof gap.shape, `skip ${gap.label} has no shape`).toBe('string');
        expect(gap.span, `gap ${gap.label} has no span`).not.toBeNull();
      }
      expect(run.stderr).toContain(`Branches exercised: ${branches.exercised} / ${branches.declared}`);
      if (branches.gaps.length > 0) expect(run.stderr).toContain(`Not exercised (${branches.gaps.length}):`);
    });

    it('Rooms: every declared room is entered or listed as unentered, in the report as on the wire', () => {
      const { rooms } = derivedSummary(run);
      expect(rooms.entered + rooms.unentered.length).toBe(rooms.declared);
      expect(run.stderr).toContain(`Rooms entered: ${rooms.entered} / ${rooms.declared}`);
    });
  });

  describe('the derived tier and what runs when', () => {
    it('the exit code is 1 exactly when a line or a derived row failed or errored — a skip never moves it', () => {
      const end = runEnd(run);
      const brokenLines = lines(run.events).filter(({ end: line }) => line.status === 'failed' || line.status === 'error').length;
      const brokenRows = derivedBranches(run).filter((event) => event.status === 'failed' || event.status === 'error').length;
      expect(run.status).toBe(end.exitCode);
      expect(end.exitCode).toBe(brokenLines > 0 || brokenRows > 0 ? 1 : 0);
    });

    it('story: no derived row fails or errors', () => {
      const failed = derivedBranches(run)
        .filter((event) => event.status === 'failed' || event.status === 'error')
        .map((event) => `${event.label}: ${event.failure ?? event.detail}`);
      expect(failed).toEqual([]);
    });
  });

  describe('the test tree on disk', () => {
    it('is canonical, one file per segment named by its stable id, its manifest naming this story', () => {
      const files = readTreeFiles(story.treeDir);
      expect(checkCanonicalTree(files)).toEqual({ status: 'canonical' });
      const segments = Object.keys(files).filter((name) => name !== TREE_MANIFEST_FILE_NAME && !name.startsWith('.'));
      expect(segments.length).toBeGreaterThan(0);
      for (const name of segments) expect(name).toMatch(/^[a-z0-9]{8}\.json$/);
      expect(readTree(story.treeDir).story).toBe(story.id);
    });
  });
});
