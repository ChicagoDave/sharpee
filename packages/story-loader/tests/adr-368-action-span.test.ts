/**
 * adr-368-action-span.test.ts — ADR-368 AC-8 (loader half): a head that
 * lists gerunds expands to one clause per gerund, and a load error about one
 * of them points at that word. REAL-PATH: real @sharpee/chord compile, real
 * loader world; `leaving` is legal only on a region (ADR-236 D6), so
 * `after the player entering, leaving` on a thing throws at `leaving`'s
 * column, not at the head's.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import { WorldModel } from '@sharpee/world-model';
import { createStory, LoadError } from '../src';

const STORY = `story
  title: Action Spans
  authors:
    Test
  id: action-spans
  story-version: 0.0.1

create the Yard
  a room

  A yard.

create the gate
  a thing, scenery
  in the Yard

  A gate.

  after the player entering, leaving
    phrase creak
  end after

create Alex
  a person
  playable
  starts in the Yard

  You.

before the game starts
  change the player to Alex
end before

define phrase creak
  The gate creaks.
end phrase
`;

describe('ADR-368 AC-8 — a load error about one listed gerund lands on that word', () => {
  it('`leaving` on a thing throws the region-only error at the `leaving` column', () => {
    const result = compile(STORY);
    expect(result.ok, result.diagnostics.map((d) => `${d.code} ${d.message}`).join('; ')).toBe(true);
    const gate = result.ir.entities.find((e) => e.name === 'gate')!;
    expect(gate.onClauses.map((c) => c.action)).toEqual(['entering', 'leaving']);

    // A fresh story per build: the host's id map is per world, so a story
    // that already began one world cannot bind another.
    const build = () => createStory(result.ir, { seed: 1 }).initializeWorld(new WorldModel());
    expect(build).toThrow(LoadError);
    let error: LoadError | null = null;
    try {
      build();
    } catch (e) {
      error = e as LoadError;
    }
    expect(error!.message).toMatch(/region crossing reaction/);
    const headLine = STORY.split('\n').findIndex((l) => l.includes('after the player entering, leaving')) + 1;
    expect(error!.span?.line).toBe(headLine);
    expect(error!.span?.column).toBe('  after the player entering, '.length + 1);
  });
});
