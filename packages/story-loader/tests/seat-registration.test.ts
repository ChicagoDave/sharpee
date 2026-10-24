/**
 * seat-registration.test.ts — the loader registers every Chord rule's
 * entity slots with the action's seat table (ADR-383 D3, D4; parser review
 * step 3, Phase 3): a story action's indirect-first line seats by name, and
 * `extend action` seats from the standard action's table in the manifest.
 * Seats are read from the compiled slot records of a real if-domain engine.
 */
import { describe, expect, it } from 'vitest';
import type { GrammarRule } from '@sharpee/if-domain';
import { createStory } from '../src';
import { captureGrammarEngine } from './helpers/grammar-harness';
import { compileSource } from './helpers/boot-turns';

const HEAD = `story
  title: Seats
  authors:
    T
  id: seats
  story-version: 0.0.1

create the Study
  a room

  A quiet study.

create Alex
  a person
  playable
  starts in the Study

  You.

before the game starts
  change the player to Alex
end before

`;

/** Each slot's seat on a registered rule, by name; `-` for a slot with none. */
function seats(rule: GrammarRule): Record<string, string> {
  return Object.fromEntries(rule.compiledPattern!.slots.map((slot) => [slot.name, slot.seat ?? '-']));
}

function rulesOf(source: string): GrammarRule[] {
  return captureGrammarEngine(createStory(compileSource(HEAD + source))).getRules();
}

describe('a story action seats each name once (ADR-383 D3)', () => {
  it('`present the friend with the gift` after `offer the gift to the friend` seats the gift direct on both', () => {
    const rules = rulesOf(`define action offering
  grammar
    offer the gift to the friend
    present the friend with the gift
  phrase offered

  phrases en-US
    offered:
      Offered.
`);
    const byPattern = Object.fromEntries(rules.map((r) => [r.pattern, seats(r)]));
    expect(byPattern['offer :gift to :friend']).toEqual({ gift: 'direct', friend: 'indirect' });
    expect(byPattern['present :friend with :gift']).toEqual({ friend: 'indirect', gift: 'direct' });
  });
});

describe('an extension seats from its target`s table (ADR-383 D4)', () => {
  it('`extend action giving` with `hand the recipient the item` seats the item direct, as the standard line does', () => {
    const [rule] = rulesOf(`extend action giving
  grammar
    hand the recipient the item
`);
    expect(rule.action).toBe('if.action.giving');
    expect(seats(rule)).toEqual({ recipient: 'indirect', item: 'direct' });
  });

  it('`extend action putting` with `hang the item on the peg` seats the peg indirect', () => {
    const [rule] = rulesOf(`extend action putting
  grammar
    hang the item on the peg
`);
    expect(seats(rule)).toEqual({ item: 'direct', peg: 'indirect' });
  });

  it('an extension of a story action seats from that action`s own table', () => {
    const rules = rulesOf(`define action offering
  grammar
    offer the gift to the friend
  phrase offered

  phrases en-US
    offered:
      Offered.

extend action offering
  grammar
    present the friend with the gift
`);
    const extension = rules.find((r) => r.pattern === 'present :friend with :gift')!;
    expect(extension.action).toBe('chord.action.offering');
    expect(seats(extension)).toEqual({ friend: 'indirect', gift: 'direct' });
  });
});
