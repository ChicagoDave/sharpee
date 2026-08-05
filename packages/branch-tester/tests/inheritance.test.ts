/**
 * inheritance.test.ts — ADR-302 D8: a child inherits its parent's whole header
 * and may override any field.
 *
 * Covers **AC-3** — a child declaring no seed runs at its parent's; a child
 * declaring its own runs at its own. Asserted on the RESOLVED HEADER, not on
 * output, so the test says what the rule is rather than what one story does.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import { parseTranscript } from '../src/parser.js';
import { assembleTree, effectiveConfig, effectiveHeader } from '../src/tree.js';
import type { Transcript } from '../src/types.js';

const BODY = '---\n\n> look\n[OK: contains "room"]\n';

function at(stem: string, header: string): Transcript {
  const transcript = parseTranscript(`title: ${stem}\n${header}${BODY}`);
  (transcript as { filePath: string }).filePath = `/story/${stem}.transcript`;
  return transcript;
}

/** Assemble a tree and hand back a node by stem, asserting it is sound. */
function nodeOf(transcripts: Transcript[], stem: string) {
  const tree = assembleTree(transcripts);
  expect(tree.defects).toEqual([]);
  return tree.byStem.get(stem)!;
}

describe('header inheritance (ADR-302 D8)', () => {
  it('AC-3 — a child declaring no seed runs at its parent\'s', () => {
    const child = nodeOf(
      [at('root', 'seed: 42\n'), at('child', 'continues: root\n')],
      'child',
    );
    expect(effectiveConfig(child).seeds).toEqual([42]);
  });

  it('AC-3 — a child declaring its own seed runs at its own', () => {
    const child = nodeOf(
      [at('root', 'seed: 42\n'), at('child', 'continues: root\nseed: 7\n')],
      'child',
    );
    expect(effectiveConfig(child).seeds).toEqual([7]);
  });

  it('inherits transitively — a grandchild takes the root\'s', () => {
    const grandchild = nodeOf(
      [
        at('root', 'seed: 42\n'),
        at('mid', 'continues: root\n'),
        at('leaf', 'continues: mid\n'),
      ],
      'leaf',
    );
    expect(effectiveConfig(grandchild).seeds).toEqual([42]);
  });

  it('an override applies to the overriding node\'s descendants too', () => {
    const leaf = nodeOf(
      [
        at('root', 'seed: 42\n'),
        at('mid', 'continues: root\nseed: 7\n'),
        at('leaf', 'continues: mid\n'),
      ],
      'leaf',
    );
    expect(effectiveConfig(leaf).seeds).toEqual([7]);
  });

  it('`seeds:` in a child replaces the parent\'s `seed:` rather than adding to it', () => {
    // Both keys write the same field, so a child that says `seeds: 1, 2` is not
    // additionally running the parent's 42.
    const child = nodeOf(
      [at('root', 'seed: 42\n'), at('child', 'continues: root\nseeds: 1, 2\n')],
      'child',
    );
    expect(effectiveConfig(child).seeds).toEqual([1, 2]);
  });

  it('distinguishes "declared the default" from "said nothing"', () => {
    // The reason `declaredConfigKeys` exists. `events: false` is the default,
    // so its VALUE cannot say whether the author wrote it — but a child that
    // wrote it must still override a parent's `events: true`.
    const inherits = nodeOf(
      [at('root', 'events: true\n'), at('child', 'continues: root\n')],
      'child',
    );
    expect(effectiveConfig(inherits).events).toBe(true);

    const overrides = nodeOf(
      [at('root', 'events: true\n'), at('child', 'continues: root\nevents: false\n')],
      'child',
    );
    expect(effectiveConfig(overrides).events).toBe(false);
  });

  it('inherits every config field, not a curated subset', () => {
    // D8 is ONE rule. The rejected alternative was carving the header into
    // chain-wide and per-file halves — a table to keep in sync.
    const child = nodeOf(
      [
        at('root', 'seed: 42\nchannels: score\nevents: true\nlocale: en-GB\n'),
        at('child', 'continues: root\n'),
      ],
      'child',
    );
    const config = effectiveConfig(child);
    expect(config.seeds).toEqual([42]);
    expect(config.channels).toEqual(['score']);
    expect(config.events).toBe(true);
    expect(config.locale).toBe('en-GB');
  });

  it('inherits descriptive header fields as well as config ones', () => {
    const child = nodeOf(
      [at('root', 'story: fernhill\nauthor: RP\n'), at('child', 'continues: root\n')],
      'child',
    );
    const header = effectiveHeader(child);
    expect(header.story).toBe('fernhill');
    expect(header.author).toBe('RP');
  });

  it('a child overrides an inherited descriptive field', () => {
    const child = nodeOf(
      [at('root', 'author: RP\n'), at('child', 'continues: root\nauthor: DC\n')],
      'child',
    );
    expect(effectiveHeader(child).author).toBe('DC');
  });

  it('never inherits `continues:` — the edge is not a run parameter', () => {
    // A child inheriting its parent's parentage would claim its grandparent,
    // while the TREE — built from the declared value — disagreed. Two answers
    // to "who is my parent?" is worse than any inheritance policy.
    const tree = assembleTree([
      at('root', ''),
      at('mid', 'continues: root\n'),
      at('leaf', 'continues: mid\n'),
    ]);
    expect(tree.defects).toEqual([]);
    expect(effectiveHeader(tree.byStem.get('leaf')!).continues).toBe('mid');
    expect(tree.byStem.get('leaf')!.parent!.stem).toBe('mid');
  });

  it('a root\'s effective header is its own', () => {
    const root = nodeOf([at('root', 'seed: 42\n')], 'root');
    expect(effectiveConfig(root).seeds).toEqual([42]);
    expect(effectiveHeader(root).title).toBe('root');
  });

  it('two children of one parent resolve independently', () => {
    const transcripts = [
      at('root', 'seed: 42\nevents: true\n'),
      at('alpha', 'continues: root\nseed: 7\n'),
      at('beta', 'continues: root\n'),
    ];
    expect(effectiveConfig(nodeOf(transcripts, 'alpha')).seeds).toEqual([7]);
    expect(effectiveConfig(nodeOf(transcripts, 'beta')).seeds).toEqual([42]);
    // The sibling's override does not leak.
    expect(effectiveConfig(nodeOf(transcripts, 'beta')).events).toBe(true);
  });
});
