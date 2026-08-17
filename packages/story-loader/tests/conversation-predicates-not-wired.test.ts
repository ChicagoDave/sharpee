/**
 * conversation-predicates-not-wired.test.ts — the four conversation
 * predicate kinds (`recency`, `discussed`, `asked`, `subject-changes`)
 * compile since Chord 3.1.0 but have no evaluator runtime until the scene
 * runtime lands. Until then the evaluator must refuse them loudly — a
 * story reaching one gets a LoadError naming the kind, never a silent
 * `false`.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import type { IRCondition } from '@sharpee/chord';
import { WorldModel } from '@sharpee/world-model';
import { createStory, Evaluator, LoadError } from '../src';

const SOURCE = `story
  title: T
  authors:
    N
  id: t
  story-version: 0.0.1

create the Hall
  a room

  A hall.

create the player
  in the Hall

  You.
`;

const CASES: Array<[string, IRCondition]> = [
  ['recency', { kind: 'recency', topic: 'program', word: 'fresh' }],
  ['discussed', { kind: 'discussed', topic: 'program' }],
  ['asked', { kind: 'asked', word: 'once' }],
  ['subject-changes', { kind: 'subject-changes' }],
];

describe('conversation predicates are loudly not-yet-wired', () => {
  const result = compile(SOURCE);
  const story = createStory(result.ir, { seed: 42 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  const ev = new Evaluator(result.ir, story, 42);

  it.each(CASES)('`%s` throws a LoadError naming the kind', (kind, cond) => {
    expect(() => ev.evalCondition(cond, { world })).toThrowError(LoadError);
    expect(() => ev.evalCondition(cond, { world })).toThrowError(
      new RegExp(`\`${kind}\` is not wired`),
    );
  });
});
