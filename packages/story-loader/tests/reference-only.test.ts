/**
 * reference-only.test.ts — ADR-265 D2: a `reference-only: true` artifact is a
 * generated Chord-form rendering of the standard library, NOT a runnable story.
 * It compiles, but the loader refuses to build/play it (a hard error naming the
 * marker), so it can never be mistaken for the library.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import { createStory } from '../src';

const body = `
create the Void
  a room

  This is a reference document, not a game.

create the player
  starts in the Void

  You.
`;

const REFERENCE = `story "Standard action: taking" by "Sharpee (generated)"
  id: stdlib-chord-taking
  version: 1.0.0
  reference-only: true
${body}`;

const NORMAL = `story "A Real Game" by "T"
  id: real
  version: 1.0.0
${body}`;

describe('reference-only artifacts (ADR-265 D2)', () => {
  it('compiles cleanly — the marker is a header field, not a grammar change', () => {
    const r = compile(REFERENCE);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(r.ir.meta.fields['reference-only']).toBe('true');
  });

  it('the loader REFUSES to build it — a hard error naming the marker', () => {
    const r = compile(REFERENCE);
    expect(() => createStory(r.ir)).toThrow(/reference-only/i);
  });

  it('a normal story (no marker) loads unaffected', () => {
    const r = compile(NORMAL);
    expect(r.ir.meta.fields['reference-only']).toBeUndefined();
    expect(() => createStory(r.ir)).not.toThrow();
  });
});
