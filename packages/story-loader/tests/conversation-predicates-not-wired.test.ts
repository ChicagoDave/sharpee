/**
 * conversation-predicates-not-wired.test.ts — the four conversation
 * predicate kinds (`recency`, `discussed`, `asked`, `subject-changes`)
 * are wired since ADR-320 Phase 7, but they hold only inside dialogue
 * dispatch: they need an owner (`it`) and — pair-dependent kinds — the
 * conversation frame the dispatch paths supply. Outside that frame the
 * evaluator must refuse loudly (rogue IR — the analyzer parse-gates the
 * predicates to conversation contexts), never return a silent `false`.
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

create Alex
  a person
  playable
  in the Hall

  You.

before the game starts
  change the player to Alex
end before

`;

const OWNERLESS: Array<[string, IRCondition]> = [
  ['recency', { kind: 'recency', topic: 'program', word: 'fresh' }],
  ['discussed', { kind: 'discussed', topic: 'program' }],
  ['asked', { kind: 'asked', word: 'once' }],
  ['subject-changes', { kind: 'subject-changes' }],
];

const PARTNERLESS: Array<[string, IRCondition]> = [
  ['discussed', { kind: 'discussed', topic: 'program' }],
  ['asked', { kind: 'asked', word: 'once' }],
  ['subject-changes', { kind: 'subject-changes' }],
];

describe('conversation predicates refuse loudly outside dialogue dispatch', () => {
  const result = compile(SOURCE);
  const story = createStory(result.ir, { seed: 42 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  const ev = new Evaluator(result.ir, story, 42);

  it.each(OWNERLESS)('`%s` with no owner (`it`) in scope throws a LoadError', (_kind, cond) => {
    expect(() => ev.evalCondition(cond, { world })).toThrowError(LoadError);
    expect(() => ev.evalCondition(cond, { world })).toThrowError(/needs an owner/);
  });

  it.each(PARTNERLESS)('`%s` with an owner but no conversation partner throws a LoadError', (_kind, cond) => {
    expect(() => ev.evalCondition(cond, { world, it: 'hall' })).toThrowError(/conversation partner/);
  });

  it('`asked` with a partner but no current topic throws a LoadError', () => {
    expect(() =>
      ev.evalCondition({ kind: 'asked', word: 'once' }, { world, it: 'hall', conversationPartnerId: player.id }),
    ).toThrowError(/current topic/);
  });
});
