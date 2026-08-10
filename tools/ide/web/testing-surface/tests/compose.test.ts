/**
 * compose.test.ts — pins the segment→transcript composition (ADR-306
 * Phase 4). Every composed text is ROUND-TRIPPED through branch-tester's
 * real parser (imported from source): what the surface writes must be
 * exactly what `sharpee test --tree` reads.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import { describe, expect, it } from 'vitest';
import { parseTranscript } from '@sharpee/branch-tester/parser';
import {
  composeSegmentLines, composeSegmentTranscript, composeTurnAssertionLines,
  rehydrateSegmentClaims, type TurnSource,
} from '../src/compose';
import { SessionModel } from '../src/model';

function playedSession(): SessionModel {
  const m = new SessionModel();
  m.addTurn({ ordinal: 1, command: 'look', room: 'Iron Gates', boot: true });
  m.addTurn({ ordinal: 2, command: 'north', room: 'Gravel Drive', boot: false });
  m.addTurn({ ordinal: 3, command: 'north', room: 'Fountain Court', boot: false });
  m.addTurn({ ordinal: 4, command: 'north', room: 'Entrance Hall', boot: false });
  return m;
}

const sources: Record<number, TurnSource> = {
  1: { output: 'Iron Gates\nWrought-iron gates stand open.', channelValues: { 'room-name': ['Iron Gates'] } },
  2: { output: 'Gravel Drive\nThe drive curves north.', channelValues: { 'room-name': ['Gravel Drive'] } },
  3: { output: 'Fountain Court\nA paved court.', channelValues: { 'room-name': ['Fountain Court'] } },
  4: { output: 'Entrance Hall\nThe heart of the house.', channelValues: { 'room-name': ['Entrance Hall'] } },
};
const source = (n: number) => sources[n];

const parse = (text: string) => {
  const transcript = parseTranscript(text, 'probe.transcript');
  expect(transcript.parseErrors ?? []).toEqual([]);
  return transcript;
};

describe('composeSegmentTranscript', () => {
  it('a root carries title + seed and [SKIP] ancestry before the range', () => {
    const m = playedSession();
    m.tick(2);
    m.tick(3);
    const { title, text } = composeSegmentTranscript({
      model: m, segment: m.segmentOf(2)!, seed: 42, source,
    });
    expect(title).toBe('iron-gates-to-fountain-court-2');
    const parsed = parse(text);
    expect(parsed.header.title).toBe(title);
    expect(parsed.header.seed).toBe('42');
    expect(parsed.header.continues).toBeUndefined();
    expect(parsed.commands.map(c => c.input)).toEqual(['look', 'north', 'north']);
    // Turn 1 rides as [SKIP] ancestry; in-range turns with no policy and no
    // claims carry the [SKIP] placeholder (6e's let-me-decide form).
    expect(parsed.commands[0].assertions.map(a => a.type)).toEqual(['skip']);
  });

  it('sequential ticks compose ONE growing file — continues: is for branch starts only', () => {
    const m = playedSession();
    m.tick(1);
    m.tick(2);   // closed 1–2
    m.tick(3);
    m.tick(4);   // extensions — the same transcript, renamed (David 2026-08-09)
    expect(m.segments).toHaveLength(1);
    const { text } = composeSegmentTranscript({
      model: m, segment: m.segmentOf(1)!, seed: 42, source,
    });
    const parsed = parse(text);
    expect(parsed.header.continues).toBeUndefined();
    expect(parsed.header.seed).toBe('42');
    expect(parsed.commands.map(c => c.input)).toEqual(['look', 'north', 'north', 'north']);
  });

  it('policy defaults synthesize through the real module when untouched', () => {
    const m = playedSession();
    m.tick(2);
    const { text } = composeSegmentTranscript({
      model: m, segment: m.segmentOf(2)!, policy: 'room-name-and-description', seed: 42, source,
    });
    const parsed = parse(text);
    // The open range walks to its extent (turn 4); turn 2 is commands[1].
    const assertions = parsed.commands[1].assertions;
    expect(assertions.some(a => a.type === 'ok-contains' && a.value === 'Gravel Drive')).toBe(true);
  });

  it('authored claims serialize in every family, and narrowing drops defaults', () => {
    const m = playedSession();
    m.tick(2);
    m.addContains(2, 'drive curves');
    m.addNotContains(2, 'troll');
    m.addState(2, 'kettle.location = hall');
    m.addEvent(2, 'if.event.actor_moved');
    m.addChannel(2, { id: 'score', is: 0 });
    m.addChannel(2, { id: 'room-name', contains: 'Gravel' });
    const { text } = composeSegmentTranscript({
      model: m, segment: m.segmentOf(2)!, policy: 'room-name-and-description', seed: 42, source,
    });
    const parsed = parse(text);
    const assertions = parsed.commands[1].assertions;
    const types = assertions.map(a => a.type);
    // Authored contains present, policy default 'Gravel Drive' NOT re-added
    // (contains non-empty → defaults withheld).
    expect(assertions.filter(a => a.type === 'ok-contains').map(a => a.value))
      .toEqual(['drive curves']);
    expect(types).toContain('ok-not-contains');
    expect(assertions.find(a => a.type === 'state-assert')?.stateExpression)
      .toBe('kettle.location = hall');
    expect(assertions.find(a => a.type === 'event-assert')?.eventType)
      .toBe('if.event.actor_moved');
    expect(assertions.find(a => a.type === 'channel-is')?.channelExpected).toBe(0);
    expect(assertions.find(a => a.type === 'channel-contains')?.value).toBe('Gravel');
  });

  it('Exact writes [OK] + the whole turn as a literal block, keeping non-prose families', () => {
    const m = playedSession();
    m.tick(2);
    m.setExact(2, true);
    m.addState(2, 'score = 0');
    m.addContains(2, 'superseded');
    const { text } = composeSegmentTranscript({
      model: m, segment: m.segmentOf(2)!, policy: 'room-name-and-description', seed: 42, source,
    });
    const parsed = parse(text);
    const assertions = parsed.commands[1].assertions;
    const exact = assertions.find(a => a.type === 'ok');
    expect(exact?.block).toEqual(['Gravel Drive', 'The drive curves north.']);
    expect(assertions.some(a => a.type === 'state-assert')).toBe(true);
    expect(assertions.some(a => a.type === 'ok-contains')).toBe(false);
  });

  it('a pruned turn writes [SKIP] in place', () => {
    const m = playedSession();
    m.tick(2);
    m.tick(3);
    m.removeDefault(3, 0, []);   // pruned to nothing → demoted
    const { text } = composeSegmentTranscript({
      model: m, segment: m.segmentOf(2)!, policy: 'room-name-and-description', seed: 42, source,
    });
    const parsed = parse(text);
    expect(parsed.commands.at(-1)!.assertions.map(a => a.type)).toEqual(['skip']);
  });

  it('source lines mirror the file and carry delete refs onto the model', () => {
    const m = playedSession();
    m.tick(2);
    m.addContains(2, 'drive curves');
    const lines = composeSegmentLines({
      model: m, segment: m.segmentOf(2)!, policy: 'room-name-and-description', seed: 42, source,
    });
    expect(lines[0]).toEqual({ text: 'title: iron-gates-to-entrance-hall-3', kind: 'header' });
    expect(lines[1]).toEqual({ text: 'seed: 42', kind: 'header' });
    // Ancestry turn 1 shows its command + [SKIP], no delete ref.
    const skip = lines.find(l => l.kind === 'skip');
    expect(skip?.del).toBeUndefined();
    // The authored contains line renders the real tag with its ref.
    const authored = lines.find(l => l.del?.kind === 'contains');
    expect(authored?.text).toBe('[OK: contains "drive curves"]');
    expect(authored?.del).toEqual({ kind: 'contains', ordinal: 2, index: 0 });
    // Executing the ref against the model narrows exactly like the panel will.
    m.removeContains(2, 0);
    expect(m.isSkipped(2)).toBe(true);
  });

  it('default lines carry narrowing refs; exact renders a block with a whole-delete ref', () => {
    const m = playedSession();
    m.tick(2);
    const defaultLines = composeSegmentLines({
      model: m, segment: m.segmentOf(2)!, policy: 'room-name-and-description', seed: 42, source,
    });
    // Scope to turn 2: the open range now walks to its extent, so later
    // turns carry their own default lines.
    const defaults = defaultLines.filter(l =>
      l.del?.kind === 'default' && l.del.ordinal === 2);
    expect(defaults.length).toBeGreaterThan(0);
    const ref = defaults[0].del as { kind: 'default'; defaults: string[] };
    expect(ref.defaults.length).toBe(defaults.length);

    m.setExact(2, true);
    const exactLines = composeSegmentLines({
      model: m, segment: m.segmentOf(2)!, policy: 'room-name-and-description', seed: 42, source,
    });
    const ok = exactLines.find(l => l.del?.kind === 'exact');
    expect(ok?.text).toBe('[OK]');
    expect(exactLines.map(l => l.text)).toContain('text');
    expect(exactLines.map(l => l.text)).toContain('end text');
    expect(exactLines.map(l => l.text)).toContain('Gravel Drive');
  });

  it('a branch transcript continues from the auto-split prefix, its own turns only', () => {
    const m = playedSession();
    m.tick(1);
    m.tick(4);            // closed 1–4
    expect(m.fork(3, 'east')).toBe(2);
    // The replayed alternate landed as a fresh ordinal (replay consumed 5–8).
    m.addTurn({ ordinal: 9, command: 'east', room: 'Boiler Shed', boot: false, lineage: 2 });
    const branchSources: Record<number, TurnSource> = {
      ...sources,
      9: { output: 'Boiler Shed\nBrick, low, and bitter.', channelValues: { 'room-name': ['Boiler Shed'] } },
    };
    const { title, text } = composeSegmentTranscript({
      model: m, segment: m.segmentOf(9)!, policy: 'room-name-and-description',
      seed: 42, source: n => branchSources[n],
    });
    expect(title).toBe('gravel-drive-to-boiler-shed-1');
    const parsed = parse(text);
    // Continues from the prefix parent (across lineages), never from main.
    expect(parsed.header.continues).toBe('iron-gates-to-gravel-drive-2');
    expect(parsed.header.seed).toBeUndefined();
    // Only the branch's own turn — main-lineage turns 3–4 never leak in.
    expect(parsed.commands.map(c => c.input)).toEqual(['east']);
    expect(parsed.commands[0].assertions.some(a =>
      a.type === 'ok-contains' && a.value === 'Boiler Shed')).toBe(true);
  });

  it('a segment from the opening writes authored opening claims above the first command', () => {
    const m = playedSession();
    m.tick(0);
    m.tick(2);
    m.addContains(0, 'auction notice');
    const { text } = composeSegmentTranscript({
      model: m, segment: m.segmentOf(0)!, seed: 42, source,
    });
    const parsed = parse(text);
    expect(parsed.opening?.some(a => a.type === 'ok-contains' && a.value === 'auction notice'))
      .toBe(true);
    expect(parsed.commands[0].input).toBe('look');
  });
});

describe('rehydrateSegmentClaims (Phase 5 — files are the truth on reopen)', () => {
  /** A session with a closed 2–3 segment carrying claims in every family
   *  plus one narrowed and one untouched turn, composed to file text. */
  function authoredFile(): { text: string } {
    const m = playedSession();
    m.tick(2);
    m.tick(4);
    m.addContains(2, 'drive curves');
    m.addNotContains(2, 'troll');
    m.addState(2, 'kettle.location = hall');
    m.addEvent(2, 'if.event.actor_moved');
    m.addChannel(2, { id: 'score', is: 0 });
    m.setExact(3, true);
    // Turn 4 stays untouched — pure policy defaults.
    const { text } = composeSegmentTranscript({
      model: m, segment: m.segmentOf(2)!, policy: 'room-name-and-description',
      seed: 42, source,
    });
    return { text };
  }

  /** The reopened session: same turns replayed, segment restored, claims empty. */
  function reopened(): { m: SessionModel } {
    const m = playedSession();
    m.tick(2);
    m.tick(4);
    return { m };
  }

  it('round-trips: lifted claims recompose to the same file, byte for byte', () => {
    const { text } = authoredFile();
    const { m } = reopened();
    const result = rehydrateSegmentClaims({
      model: m, segment: m.segmentOf(2)!, policy: 'room-name-and-description',
      seed: 42, source,
    }, text);
    expect(result).toBe('attached');
    // Claims landed on the model, not just the return value.
    expect(m.claimsOf(2).contains).toEqual(['drive curves']);
    expect(m.claimsOf(2).notContains).toEqual(['troll']);
    expect(m.claimsOf(2).states).toEqual(['kettle.location = hall']);
    expect(m.claimsOf(2).events).toEqual(['if.event.actor_moved']);
    expect(m.claimsOf(2).channels).toEqual([{ id: 'score', is: 0 }]);
    expect(m.claimsOf(3).exact).toBe(true);
    const recomposed = composeSegmentTranscript({
      model: m, segment: m.segmentOf(2)!, policy: 'room-name-and-description',
      seed: 42, source,
    });
    expect(recomposed.text).toBe(text);
  });

  it('an untouched turn stays default-synthesizing after re-hydration', () => {
    const { text } = authoredFile();
    const { m } = reopened();
    rehydrateSegmentClaims({
      model: m, segment: m.segmentOf(2)!, policy: 'room-name-and-description',
      seed: 42, source,
    }, text);
    // Turn 4 was pure defaults: no authored claims, defaults still live.
    expect(m.claimsOf(4).contains).toEqual([]);
    expect(m.claimsOf(4).noDefaults).toBe(false);
  });

  it('a hand-edit within the claim grammar is adopted — files are the truth', () => {
    const { text } = authoredFile();
    const { m } = reopened();
    const edited = text.replace('drive curves', 'hand-edited fragment');
    const result = rehydrateSegmentClaims({
      model: m, segment: m.segmentOf(2)!, policy: 'room-name-and-description',
      seed: 42, source,
    }, edited);
    expect(result).toBe('attached');
    expect(m.claimsOf(2).contains).toEqual(['hand-edited fragment']);
  });

  it('a hand-edit compose cannot reproduce reports diverged — never clobbered', () => {
    const { text } = authoredFile();
    const { m } = reopened();
    // The exact block's literal text is regenerated from the live source on
    // recompose, so an edited block can never round-trip.
    const edited = text.replace('A paved court.', 'A weeded court.');
    expect(edited).not.toBe(text);
    const result = rehydrateSegmentClaims({
      model: m, segment: m.segmentOf(2)!, policy: 'room-name-and-description',
      seed: 42, source,
    }, edited);
    expect(result).toBe('diverged');
  });

  it('an unparseable file applies nothing — unmapped', () => {
    const { m } = reopened();
    const result = rehydrateSegmentClaims({
      model: m, segment: m.segmentOf(2)!, policy: 'room-name-and-description',
      seed: 42, source,
    }, 'title: x\n---\n> north\n[GARBAGE: not a real tag]\n');
    expect(result).toBe('unmapped');
    expect(m.claimsOf(2).contains).toEqual([]);
  });

  it('a command-count mismatch applies nothing — unmapped', () => {
    const { text } = authoredFile();
    const m = playedSession();
    m.tick(2);
    m.tick(3); // segment 2–3: walk (ancestry + 2 turns) is shorter than the file
    const result = rehydrateSegmentClaims({
      model: m, segment: m.segmentOf(2)!, policy: 'room-name-and-description',
      seed: 42, source,
    }, text);
    expect(result).toBe('unmapped');
    expect(m.claimsOf(2).contains).toEqual([]);
    expect(m.claimsOf(3).exact).toBe(false);
  });

  it('a structure shift with a coincidental count lands diverged, not clobbered', () => {
    const { text } = authoredFile();
    const m = playedSession();
    m.tick(3);
    m.tick(4); // segment 3–4: walk [1,2,3,4] matches the file's four commands
    const result = rehydrateSegmentClaims({
      model: m, segment: m.segmentOf(3)!, policy: 'room-name-and-description',
      seed: 42, source,
    }, text);
    // The file claims things on turn 2 that this segment writes as [SKIP] —
    // recompose cannot reproduce it, so the caller must detach the file.
    expect(result).toBe('diverged');
  });

  it('re-hydrates a [SKIP]-carrying file without disturbing the skip', () => {
    const m = playedSession();
    m.tick(2);
    m.tick(4);
    m.removeDefault(3, 0, []); // turn 3 pruned → [SKIP]
    m.addContains(2, 'drive curves');
    const { text } = composeSegmentTranscript({
      model: m, segment: m.segmentOf(2)!, policy: 'room-name-and-description',
      seed: 42, source,
    });

    const back = playedSession();
    back.tick(2);
    back.tick(4);
    back.restore(back.snapshot(), (l, p) => l === 1 ? p : undefined);
    // The sidecar restored the skip (structure), the file restores claims.
    back.removeDefault(3, 0, []);
    const result = rehydrateSegmentClaims({
      model: back, segment: back.segmentOf(2)!, policy: 'room-name-and-description',
      seed: 42, source,
    }, text);
    expect(result).toBe('attached');
    expect(back.isSkipped(3)).toBe(true);
    expect(back.claimsOf(2).contains).toEqual(['drive curves']);
  });
});

describe('open ranges compose as growing files (David 2026-08-09)', () => {
  it('an open range composes header + its walk so far, and parses clean', () => {
    const m = playedSession();
    m.tick(2);
    const { title, text } = composeSegmentTranscript({
      model: m, segment: m.openSegment()!, policy: 'room-name-and-description',
      seed: 42, source,
    });
    expect(title).toBe('iron-gates-to-entrance-hall-3');
    const parsed = parse(text);
    expect(parsed.header.seed).toBe('42');
    expect(parsed.commands.map(c => c.input)).toEqual(['look', 'north', 'north', 'north']);
    // Every in-range turn carries live policy defaults — the file is the
    // recording as it stands, not a preview of the start alone.
    expect(parsed.commands.at(-1)!.assertions.some(a =>
      a.type === 'ok-contains' && a.value === 'Entrance Hall')).toBe(true);
  });

  it('an opening-only open range is a file: header, opening claims, boot look', () => {
    const m = new SessionModel();
    m.addTurn({ ordinal: 1, command: 'look', room: 'Iron Gates', boot: true });
    m.tick(0);
    m.addContains(0, 'auction notice');
    const { title, text } = composeSegmentTranscript({
      model: m, segment: m.openSegment()!, seed: 42, source,
    });
    expect(title).toBe('opening-iron-gates');
    const parsed = parse(text);
    expect(parsed.opening?.some(a => a.type === 'ok-contains' && a.value === 'auction notice'))
      .toBe(true);
    expect(parsed.commands.map(c => c.input)).toEqual(['look']);
  });

  it('an open range rehydrates from its file on reopen', () => {
    const m = playedSession();
    m.tick(2);
    m.addContains(3, 'paved court');
    const { text } = composeSegmentTranscript({
      model: m, segment: m.openSegment()!, policy: 'room-name-and-description',
      seed: 42, source,
    });

    const back = playedSession();
    back.tick(2);
    const result = rehydrateSegmentClaims({
      model: back, segment: back.openSegment()!, policy: 'room-name-and-description',
      seed: 42, source,
    }, text);
    expect(result).toBe('attached');
    expect(back.claimsOf(3).contains).toEqual(['paved court']);
  });
});

describe('composeTurnAssertionLines (David 2026-08-09: assertions in the card)', () => {
  it('returns one turn\'s tag lines with their delete refs', () => {
    const m = playedSession();
    m.tick(2);
    m.addContains(2, 'drive curves');
    m.addState(3, 'kettle.location = hall');
    const options = {
      model: m, segment: m.openSegment()!, policy: 'room-name-and-description' as const,
      seed: 42, source,
    };
    const turn2 = composeTurnAssertionLines(options, 2);
    expect(turn2.map(l => l.text)).toEqual(['[OK: contains "drive curves"]']);
    expect(turn2[0].del).toEqual({ kind: 'contains', ordinal: 2, index: 0 });
    // Turn 3 carries its authored state plus live policy defaults.
    const turn3 = composeTurnAssertionLines(options, 3);
    expect(turn3.some(l => l.text === '[STATE: true, kettle.location = hall]')).toBe(true);
    expect(turn3.some(l => l.del?.kind === 'default')).toBe(true);
  });

  it('the opening (ordinal 0) returns its authored claims', () => {
    const m = playedSession();
    m.tick(0);
    m.addContains(0, 'auction notice');
    const lines = composeTurnAssertionLines({
      model: m, segment: m.openSegment()!, seed: 42, source,
    }, 0);
    expect(lines.map(l => l.text)).toEqual(['[OK: contains "auction notice"]']);
    expect(lines[0].del).toEqual({ kind: 'contains', ordinal: 0, index: 0 });
  });

  it('a turn outside the segment walk returns nothing', () => {
    const m = playedSession();
    m.tick(2);
    m.tick(3);
    const lines = composeTurnAssertionLines({
      model: m, segment: m.segmentOf(2)!, seed: 42, source,
    }, 4);
    expect(lines).toEqual([]);
  });

  it('an ancestry turn shows its [SKIP], never a delete ref', () => {
    const m = playedSession();
    m.tick(2);
    m.tick(3);
    const lines = composeTurnAssertionLines({
      model: m, segment: m.segmentOf(2)!, seed: 42, source,
    }, 1);
    expect(lines).toEqual([{ text: '[SKIP]', kind: 'skip' }]);
  });
});

describe('the opening default (David 2026-08-09: the opening card lists one too)', () => {
  const options = (m: SessionModel) => ({
    model: m, segment: m.segmentOf(0)!, policy: 'room-name-and-description' as const,
    seed: 42, source, openingText: 'The Folly at Fernhill',
  });

  it('a policy + opening text synthesize a contains default above the first command', () => {
    const m = playedSession();
    m.tick(0);
    m.tick(2);
    const { text } = composeSegmentTranscript(options(m));
    const parsed = parse(text);
    expect(parsed.opening?.some(a =>
      a.type === 'ok-contains' && a.value === 'The Folly at Fernhill')).toBe(true);
    // The card renders the same line with a narrowing default ref.
    const lines = composeTurnAssertionLines(options(m), 0);
    expect(lines[0].text).toBe('[OK: contains "The Folly at Fernhill"]');
    expect(lines[0].del).toEqual({
      kind: 'default', ordinal: 0, index: 0, defaults: ['The Folly at Fernhill'],
    });
  });

  it('authored opening contains withhold the default; a deleted default stays gone', () => {
    const m = playedSession();
    m.tick(0);
    m.tick(2);
    m.addContains(0, 'auction notice');
    const authored = composeSegmentTranscript(options(m));
    expect(parse(authored.text).opening?.map(a => a.value))
      .toEqual(['auction notice']);

    const pruned = playedSession();
    pruned.tick(0);
    pruned.tick(2);
    pruned.removeDefault(0, 0, ['The Folly at Fernhill']);
    const { text } = composeSegmentTranscript(options(pruned));
    expect(parse(text).opening ?? []).toEqual([]);
  });

  it('no policy or no opening text means no default — absence stays the no-claim form', () => {
    const m = playedSession();
    m.tick(0);
    m.tick(2);
    const noPolicy = composeSegmentTranscript({
      model: m, segment: m.segmentOf(0)!, seed: 42, source,
      openingText: 'The Folly at Fernhill',
    });
    expect(parse(noPolicy.text).opening ?? []).toEqual([]);
    const noText = composeSegmentTranscript({
      model: m, segment: m.segmentOf(0)!, policy: 'room-name-and-description',
      seed: 42, source,
    });
    expect(parse(noText.text).opening ?? []).toEqual([]);
  });

  it('round-trips: the opening default re-hydrates and recomposes byte-identical', () => {
    const m = playedSession();
    m.tick(0);
    m.tick(2);
    const { text } = composeSegmentTranscript(options(m));

    const back = playedSession();
    back.tick(0);
    back.tick(2);
    const result = rehydrateSegmentClaims(options(back), text);
    expect(result).toBe('attached');
  });
});
