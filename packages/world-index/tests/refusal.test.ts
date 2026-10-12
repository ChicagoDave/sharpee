/**
 * refusal.test.ts — the explainer behind UPPS finding F-15.
 *
 * Every case compiles a real UPPS seed from `branch-stories/upps/seeded/room-01/`:
 * `T` (the satchel is never placed), `U` (the satchel is not wearable), `W`
 * (the machine lost its aliases) and `Z` (the correct story). The events are
 * shaped as the engine raises them: `command.failed` with a reason naming
 * `ENTITY_NOT_FOUND`, and the wearing action's blocked event with
 * `reason: 'not_wearable'`. Each rule is proved in both directions — it
 * speaks on its seed and stays silent where the cause is something else.
 *
 * Owner context: @sharpee/world-index — tests.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { StoryIR } from '@sharpee/chord';
import { deriveReach, type ReachResult } from '../src/reach.js';
import { explainRefusal, type TurnEvent } from '../src/refusal.js';
import { compileStory } from './corpus.js';

const SEEDS = 'branch-stories/upps/seeded/room-01/';

let unplaced: StoryIR;
let notWearable: StoryIR;
let noAlias: StoryIR;
let correct: StoryIR;
let unplacedReach: ReachResult;
let notWearableReach: ReachResult;
let noAliasReach: ReachResult;
let correctReach: ReachResult;

beforeAll(() => {
  unplaced = compileStory(`${SEEDS}TEST-001-T.story`);
  notWearable = compileStory(`${SEEDS}TEST-001-U.story`);
  noAlias = compileStory(`${SEEDS}TEST-001-W.story`);
  correct = compileStory(`${SEEDS}TEST-001-Z.story`);
  unplacedReach = deriveReach(unplaced);
  notWearableReach = deriveReach(notWearable);
  noAliasReach = deriveReach(noAlias);
  correctReach = deriveReach(correct);
});

const notFound = (input: string): TurnEvent[] => [
  { type: 'command.failed', data: { reason: 'Validation failed: ENTITY_NOT_FOUND', input } },
];

const wearRefused = (itemName: string): TurnEvent[] => [
  {
    type: 'if.event.wear_blocked',
    data: { messageId: 'if.action.wearing.not_wearable', params: {}, itemId: 'i_01', itemName, reason: 'not_wearable' },
  },
];

describe('rule 1 — the parser found no such thing, and the command names a thing placed nowhere', () => {
  it('names the satchel on seed T, by its alias, with the Reach reason and the room the player stood in', () => {
    expect(unplacedReach.stranded.map((thing) => thing.id)).toEqual(['mail-satchel']);
    const cause = explainRefusal(unplaced, unplacedReach, {
      input: 'wear satchel',
      events: notFound('wear satchel'),
      room: 'sorting-room',
    });
    expect(cause).toEqual({
      kind: 'placed-nowhere',
      entity: 'mail-satchel',
      name: 'mail satchel',
      word: 'satchel',
      says: '"satchel" is the mail satchel, which is placed nowhere and never moved into play.',
      fix: 'Give it a place (in the Sorting Room) or move it into play.',
    });
  });

  it('matches the full name and a single word of it, and drops articles', () => {
    const full = explainRefusal(unplaced, unplacedReach, { input: 'take the mail satchel', events: notFound('take the mail satchel') });
    expect(full?.word).toBe('mail satchel');
    const word = explainRefusal(unplaced, unplacedReach, { input: 'examine mail', events: notFound('examine mail') });
    expect(word?.word).toBe('mail');
    expect(word?.fix).toBe('Give it a place (in a room) or move it into play.');
  });

  it('stays silent on seed W: "sorter" names nothing the story declares, and the machine is placed', () => {
    expect(noAliasReach.stranded).toEqual([]);
    expect(explainRefusal(noAlias, noAliasReach, { input: 'examine sorter', events: notFound('examine sorter') })).toBeUndefined();
  });

  it('stays silent when the command names a placed thing on the correct story', () => {
    expect(correctReach.stranded).toEqual([]);
    expect(explainRefusal(correct, correctReach, { input: 'wear satchel', events: notFound('wear satchel') })).toBeUndefined();
  });

  it('stays silent when the turn raised no not-found event', () => {
    expect(explainRefusal(unplaced, unplacedReach, { input: 'wear satchel', events: [] })).toBeUndefined();
  });
});

describe('rule 2 — the wearing action refused a thing the story declares without wearable', () => {
  it('names the satchel on seed U and says to add the trait', () => {
    const cause = explainRefusal(notWearable, notWearableReach, {
      input: 'wear satchel',
      events: wearRefused('mail satchel'),
    });
    expect(cause).toEqual({
      kind: 'not-wearable',
      entity: 'mail-satchel',
      name: 'mail satchel',
      word: 'satchel',
      says: '"satchel" is the mail satchel, which is not declared wearable.',
      fix: 'Add wearable to the mail satchel.',
    });
  });

  it('stays silent when the refused thing is declared wearable — the cause lies elsewhere', () => {
    expect(explainRefusal(correct, correctReach, { input: 'wear satchel', events: wearRefused('mail satchel') })).toBeUndefined();
  });

  it('stays silent for a wearing refusal with a different reason', () => {
    const events: TurnEvent[] = [
      { type: 'if.event.wear_blocked', data: { messageId: 'if.action.wearing.already_wearing', itemName: 'mail satchel', reason: 'already_wearing' } },
    ];
    expect(explainRefusal(notWearable, notWearableReach, { input: 'wear satchel', events })).toBeUndefined();
  });
});
