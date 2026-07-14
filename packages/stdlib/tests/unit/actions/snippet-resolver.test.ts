/**
 * ADR-209 Phase 3 / ADR-211 Phase 4 — snippet resolver (scan/gate/resolve
 * pass with the site-determined join rule).
 *
 * Behavior Statement (resolveSnippetDescription):
 *   DOES   build a Sequence of Verbatim prose segments interleaved with each
 *          marker's resolved value (Literal / Choice / Empty), wrapping every
 *          non-empty value in a `Spliced` whose mode is classified from the
 *          AUTHORED marker site (clause / sentence; boundary sites and Empty
 *          values emit the content directly). Emits NO separator characters —
 *          fragments are bare, joining is the Assembler's. Pure — no counter
 *          reads, no counter writes, no world mutation.
 *   WHEN   the engine room handler renders a snippet-bearing room description.
 *   BECAUSE authors write bare fragments; the marker site decides the join
 *          (ADR-211 Decision 2), presence gating (mentions) tracks the world.
 *   REJECTS never — unbound markers and missing messageIds splice nothing
 *          and warn (broken-build log posture); no throw mid-turn.
 *
 * Covers AC-4 (gate), AC-7 (scan opt-in shape), AC-8 (duplicate marker →
 * same resolved phrase, per-site Spliced wrappers), AC-10 (messageId
 * resolution + unknown-id + non-bare-resolved-text behavior), and the site
 * classifier's edge rules (terminators, `;`/`:` amendment, paragraph edge,
 * start of text, adjacent markers).
 */

import { describe, test, expect, vi, afterEach } from 'vitest';
import type { Choice, Literal, Spliced } from '@sharpee/if-domain';
import {
  resolveSnippetDescription,
  SnippetWorldQueries,
} from '../../../src/actions/standard/looking/snippet-resolver';

/** A world stub: entity presence table → gate queries. */
function worldWith(containment: Record<string, string | undefined>): SnippetWorldQueries {
  return {
    getEntity: (id) => (id in containment ? { id } : undefined),
    getContainingRoom: (id) => {
      const room = containment[id];
      return room ? { id: room } : undefined;
    },
  };
}

const emptyWorld = worldWith({});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('resolveSnippetDescription (ADR-209 machinery, ADR-211 join rule)', () => {
  test('a string entry at a clause site becomes Spliced(clause, Literal) — bare fragment, no separator emitted', () => {
    const seq = resolveSnippetDescription(
      'A doorway to the north{snippet:cabinet} and a fireplace.',
      'r01',
      { cabinet: 'next to a cabinet' },
      emptyWorld,
    );
    expect(seq.kind).toBe('seq');
    expect(seq.parts).toEqual([
      { kind: 'verbatim', text: 'A doorway to the north' },
      { kind: 'spliced', mode: 'clause', content: { kind: 'literal', text: 'next to a cabinet' } },
      { kind: 'verbatim', text: ' and a fireplace.' },
    ]);
  });

  test('a marker after a sentence terminator classifies as a sentence site', () => {
    const seq = resolveSnippetDescription(
      'The door is boarded.{snippet:mailbox}',
      'r01',
      { mailbox: 'There is a small mailbox here.' },
      emptyWorld,
    );
    expect(seq.parts[1]).toEqual({
      kind: 'spliced',
      mode: 'sentence',
      content: { kind: 'literal', text: 'There is a small mailbox here.' },
    });
  });

  test("`;` and `:` classify as sentence sites (2026-07-14 amendment — they already carry the join)", () => {
    const seq = resolveSnippetDescription(
      'Dust{snippet:dust} coats the shelves;{snippet:dust} hangs in the air. Note this:{snippet:dust}',
      'r01',
      { dust: 'thick dust' },
      emptyWorld,
    );
    expect((seq.parts[1] as Spliced).mode).toBe('clause'); // after 'Dust'
    expect((seq.parts[3] as Spliced).mode).toBe('sentence'); // after ';'
    expect((seq.parts[5] as Spliced).mode).toBe('sentence'); // after ':'
  });

  test('start-of-text and paragraph-edge sites are boundaries — content emitted directly, no wrapper', () => {
    const atStart = resolveSnippetDescription(
      '{snippet:a}middle{snippet:b}',
      'r01',
      { a: 'A', b: 'B' },
      emptyWorld,
    );
    expect(atStart.parts).toEqual([
      { kind: 'literal', text: 'A' }, // boundary: start of text
      { kind: 'verbatim', text: 'middle' },
      { kind: 'spliced', mode: 'clause', content: { kind: 'literal', text: 'B' } },
    ]);

    const atParagraph = resolveSnippetDescription(
      'First paragraph.\n\n{snippet:a}',
      'r01',
      { a: 'A new paragraph opener.' },
      emptyWorld,
    );
    expect(atParagraph.parts[1]).toEqual({ kind: 'literal', text: 'A new paragraph opener.' });
  });

  test('adjacent markers are transparent to classification — both take the mode of the nearest prose character', () => {
    const seq = resolveSnippetDescription(
      'nailed shut.{snippet:trophycase}{snippet:rug}',
      'r01',
      { trophycase: 'A trophy case sits here.', rug: 'A rug lies here.' },
      emptyWorld,
    );
    expect((seq.parts[1] as Spliced).mode).toBe('sentence');
    expect((seq.parts[2] as Spliced).mode).toBe('sentence'); // {trophycase} contributes no characters
  });

  test('a list entry becomes a cycling Choice keyed (roomId, markerName) inside its Spliced, picks left to the Assembler', () => {
    const seq = resolveSnippetDescription(
      'A fireplace{snippet:mantel}.',
      'r01',
      { mantel: ['the mantel holding keepsakes', 'its mantel bare today'] },
      emptyWorld,
    );
    const wrapper = seq.parts[1] as Spliced;
    expect(wrapper.kind).toBe('spliced');
    expect(wrapper.mode).toBe('clause');
    const choice = wrapper.content as Choice;
    expect(choice.kind).toBe('choice');
    expect(choice.selector).toBe('cycling'); // short-form default (Q3)
    expect(choice.entityId).toBe('r01');
    expect(choice.messageKey).toBe('mantel');
    expect((choice.alternatives[0] as Literal).text).toBe('the mantel holding keepsakes');
  });

  test('long form carries its explicit selector and empty-string variants become Empty', () => {
    const seq = resolveSnippetDescription(
      'Dust motes drift{snippet:motes}.',
      'r01',
      { motes: { selector: 'random', texts: ['catching the light', ''] } },
      emptyWorld,
    );
    const choice = (seq.parts[1] as Spliced).content as Choice;
    expect(choice.selector).toBe('random');
    expect(choice.alternatives[1]).toEqual({ kind: 'empty' });
  });

  test('AC-4: a mentions entry renders only while the entity is in this room, and resumes on return', () => {
    const map = { trunk: { text: 'a battered trunk in the corner', mentions: 'i01' } };
    const text = 'The parlor is quiet{snippet:trunk}.';

    // Present (nested containment counts — the query answers the room).
    const present = resolveSnippetDescription(text, 'r01', map, worldWith({ i01: 'r01' }));
    expect(((present.parts[1] as Spliced).content as Literal).text).toBe(
      'a battered trunk in the corner',
    );

    // Taken/moved elsewhere → gated out (Empty, unwrapped — nothing to join).
    const moved = resolveSnippetDescription(text, 'r01', map, worldWith({ i01: 'r02' }));
    expect(moved.parts[1]).toEqual({ kind: 'empty' });

    // Destroyed (no entity) → gated out, no error.
    const destroyed = resolveSnippetDescription(text, 'r01', map, emptyWorld);
    expect(destroyed.parts[1]).toEqual({ kind: 'empty' });

    // Returned → renders again.
    const returned = resolveSnippetDescription(text, 'r01', map, worldWith({ i01: 'r01' }));
    expect(((returned.parts[1] as Spliced).content as Literal).text).toBe(
      'a battered trunk in the corner',
    );
  });

  test('an entry mutated to the empty string splices nothing without error (Q7)', () => {
    const seq = resolveSnippetDescription(
      'The parlor is quiet{snippet:trunk}.',
      'r01',
      { trunk: '' },
      emptyWorld,
    );
    expect(seq.parts).toEqual([
      { kind: 'verbatim', text: 'The parlor is quiet' },
      { kind: 'empty' },
      { kind: 'verbatim', text: '.' },
    ]);
  });

  test('AC-8: a duplicate marker reuses ONE resolved phrase; each site gets its own mode wrapper', () => {
    const seq = resolveSnippetDescription(
      'Dust{snippet:dust} on the shelves. More dust{snippet:dust} in the air.',
      'r01',
      { dust: ['thick', 'thin'] },
      emptyWorld,
    );
    const first = seq.parts[1] as Spliced;
    const second = seq.parts[3] as Spliced;
    expect(first.kind).toBe('spliced');
    expect(second.kind).toBe('spliced');
    expect(first).not.toBe(second); // per-site wrappers…
    expect(second.content).toBe(first.content); // …around the identical node
    expect(first.content.kind).toBe('choice'); // → Assembler memo agrees + advances once
  });

  test('render-time unbound marker splices nothing and logs, never throws', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const seq = resolveSnippetDescription(
      'A doorway{snippet:cabinet}.',
      'study',
      {}, // handler mutated the map away — load-time validation long passed
      emptyWorld,
    );
    expect(seq.parts[1]).toEqual({ kind: 'empty' });
    expect(warn).toHaveBeenCalledWith(`[snippet] room "study": marker 'cabinet' has no entry`);
  });

  test('AC-10: a { messageId } text resolves through the provider seam; unknown ids splice nothing and warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const messages: Record<string, string> = { 'story.snippets.cabinet': 'next to a cabinet' };
    const resolve = (id: string) => messages[id];

    const known = resolveSnippetDescription(
      'A doorway{snippet:cabinet}.',
      'r01',
      { cabinet: { messageId: 'story.snippets.cabinet' } },
      emptyWorld,
      resolve,
    );
    expect(((known.parts[1] as Spliced).content as Literal).text).toBe('next to a cabinet');

    const unknown = resolveSnippetDescription(
      'A doorway{snippet:cabinet}.',
      'r01',
      { cabinet: { messageId: 'story.snippets.missing' } },
      emptyWorld,
      resolve,
    );
    expect(unknown.parts[1]).toEqual({ kind: 'empty' });
    expect(warn).toHaveBeenCalledWith(
      `[snippet] room "r01": message 'story.snippets.missing' for marker 'cabinet' not found`,
    );
  });

  test('AC-10: a punctuation-led RESOLVED text warns and joins as-is (render-graceful; load gate covers literals only)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const resolve = () => ', next to a cabinet'; // stale non-bare message text
    const seq = resolveSnippetDescription(
      'A doorway{snippet:cabinet}.',
      'r01',
      { cabinet: { messageId: 'story.snippets.cabinet' } },
      emptyWorld,
      resolve,
    );
    // Joined as-is: the stray author separator stays visible, the log names it.
    expect(((seq.parts[1] as Spliced).content as Literal).text).toBe(', next to a cabinet');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('is not a bare fragment'));
  });

  test('text without markers yields a single Verbatim part (map present, nothing to splice)', () => {
    const seq = resolveSnippetDescription('A plain room.', 'r01', { unused: 'x' }, emptyWorld);
    expect(seq.parts).toEqual([{ kind: 'verbatim', text: 'A plain room.' }]);
  });

  test('is pure with respect to inputs — same inputs, equal output, no world calls without mentions', () => {
    const world = worldWith({});
    const getEntity = vi.spyOn(world, 'getEntity');
    const a = resolveSnippetDescription('X{snippet:m}.', 'r01', { m: 'y' }, world);
    const b = resolveSnippetDescription('X{snippet:m}.', 'r01', { m: 'y' }, world);
    expect(a).toEqual(b);
    expect(getEntity).not.toHaveBeenCalled(); // gate queries only for mentions entries
  });
});
