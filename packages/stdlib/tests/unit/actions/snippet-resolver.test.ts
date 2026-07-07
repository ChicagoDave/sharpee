/**
 * ADR-209 Phase 3 — snippet resolver (scan/gate/resolve pass).
 *
 * Behavior Statement (resolveSnippetDescription):
 *   DOES   build a Sequence of Verbatim prose segments interleaved with each
 *          marker's resolved value: Literal (fixed text), Choice (variant
 *          list, keyed (roomId, markerName), picks left to the Assembler),
 *          or Empty (gated-out / empty / unbound). Pure — no counter reads,
 *          no counter writes, no world mutation.
 *   WHEN   the engine room handler renders a snippet-bearing room description.
 *   BECAUSE authors' quiet scenery mentions splice mechanically and
 *          deterministically; presence gating (mentions) tracks the world.
 *   REJECTS never — unbound markers and missing messageIds splice nothing
 *          and warn (broken-build log posture); no throw mid-turn.
 *
 * Covers AC-4 (gate), AC-7 (scan opt-in shape), AC-8 (duplicate marker →
 * same phrase, one Choice node reused), AC-10 (messageId resolution +
 * unknown-id behavior).
 */

import { describe, test, expect, vi, afterEach } from 'vitest';
import type { Choice, Literal, Sequence, Verbatim } from '@sharpee/if-domain';
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

describe('resolveSnippetDescription (ADR-209)', () => {
  test('splices a string entry as Literal between Verbatim prose segments', () => {
    const seq = resolveSnippetDescription(
      'A doorway to the north{snippet:cabinet} and a fireplace.',
      'r01',
      { cabinet: ', next to a cabinet' },
      emptyWorld,
    );
    expect(seq.kind).toBe('seq');
    expect(seq.parts).toEqual([
      { kind: 'verbatim', text: 'A doorway to the north' },
      { kind: 'literal', text: ', next to a cabinet' },
      { kind: 'verbatim', text: ' and a fireplace.' },
    ]);
  });

  test('a list entry becomes a cycling Choice keyed (roomId, markerName), picks left to the Assembler', () => {
    const seq = resolveSnippetDescription(
      'A fireplace{snippet:mantel}.',
      'r01',
      { mantel: [', the mantel holding keepsakes', ', its mantel bare today'] },
      emptyWorld,
    );
    const choice = seq.parts[1] as Choice;
    expect(choice.kind).toBe('choice');
    expect(choice.selector).toBe('cycling'); // short-form default (Q3)
    expect(choice.entityId).toBe('r01');
    expect(choice.messageKey).toBe('mantel');
    expect((choice.alternatives[0] as Literal).text).toBe(', the mantel holding keepsakes');
  });

  test('long form carries its explicit selector and empty-string variants become Empty', () => {
    const seq = resolveSnippetDescription(
      'Dust motes drift{snippet:motes}.',
      'r01',
      { motes: { selector: 'random', texts: [', catching the light', ''] } },
      emptyWorld,
    );
    const choice = seq.parts[1] as Choice;
    expect(choice.selector).toBe('random');
    expect(choice.alternatives[1]).toEqual({ kind: 'empty' });
  });

  test('AC-4: a mentions entry renders only while the entity is in this room, and resumes on return', () => {
    const map = { trunk: { text: ', a battered trunk in the corner', mentions: 'i01' } };
    const text = 'The parlor is quiet{snippet:trunk}.';

    // Present (nested containment counts — the query answers the room).
    const present = resolveSnippetDescription(text, 'r01', map, worldWith({ i01: 'r01' }));
    expect((present.parts[1] as Literal).text).toBe(', a battered trunk in the corner');

    // Taken/moved elsewhere → gated out.
    const moved = resolveSnippetDescription(text, 'r01', map, worldWith({ i01: 'r02' }));
    expect(moved.parts[1]).toEqual({ kind: 'empty' });

    // Destroyed (no entity) → gated out, no error.
    const destroyed = resolveSnippetDescription(text, 'r01', map, emptyWorld);
    expect(destroyed.parts[1]).toEqual({ kind: 'empty' });

    // Returned → renders again.
    const returned = resolveSnippetDescription(text, 'r01', map, worldWith({ i01: 'r01' }));
    expect((returned.parts[1] as Literal).text).toBe(', a battered trunk in the corner');
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

  test('AC-8: a duplicate marker reuses ONE resolved phrase (same Choice node at both sites)', () => {
    const seq = resolveSnippetDescription(
      'Dust{snippet:dust} on the shelves, dust{snippet:dust} in the air.',
      'r01',
      { dust: [', thick', ', thin'] },
      emptyWorld,
    );
    const first = seq.parts[1];
    const second = seq.parts[3];
    expect(first.kind).toBe('choice');
    expect(second).toBe(first); // identical node → Assembler memo agrees + advances once
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
    const messages: Record<string, string> = { 'story.snippets.cabinet': ', next to a cabinet' };
    const resolve = (id: string) => messages[id];

    const known = resolveSnippetDescription(
      'A doorway{snippet:cabinet}.',
      'r01',
      { cabinet: { messageId: 'story.snippets.cabinet' } },
      emptyWorld,
      resolve,
    );
    expect((known.parts[1] as Literal).text).toBe(', next to a cabinet');

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

  test('text without markers yields a single Verbatim part (map present, nothing to splice)', () => {
    const seq = resolveSnippetDescription('A plain room.', 'r01', { unused: 'x' }, emptyWorld);
    expect(seq.parts).toEqual([{ kind: 'verbatim', text: 'A plain room.' }]);
  });

  test('markers at the very start and end produce no empty prose segments', () => {
    const seq = resolveSnippetDescription(
      '{snippet:a}middle{snippet:b}',
      'r01',
      { a: 'A', b: 'B' },
      emptyWorld,
    );
    expect(seq.parts).toEqual([
      { kind: 'literal', text: 'A' },
      { kind: 'verbatim', text: 'middle' },
      { kind: 'literal', text: 'B' },
    ]);
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
