/**
 * zoo-surfaces-phase1.test.ts — the story-loader half of chord-zoo-surfaces
 * Phase 1 (2026-07-14):
 *
 * - Z5: the STRATEGY_SELECTOR table maps all five adverbs to their
 *   phrase-algebra selectors 1:1 (ADR-211 Decision 4), proven through the
 *   `chord.phrase` event's Choice atom rather than the private table.
 * - Z4: the `is here` deictic at a RULE site — an every-turn clause gated
 *   `while <entity> is here` fires only while the subject shares the
 *   player's room (playerPresentAt semantics: no-location subject is
 *   never here).
 * - Z1: `first time` prose binds RoomTrait.initialDescription (the stdlib
 *   looking path reads that field for the first-look/later-look split —
 *   platform behavior, ADR-196 Phase 4; here we assert the trait state).
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import type { Choice } from '@sharpee/if-domain';
import { IdentityTrait, RoomTrait, TraitType, WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory } from '../src';

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

interface Booted {
  story: ChordStory;
  world: WorldModel;
  playerId: string;
}

function boot(source: string): Booted {
  const story = createStory(compileSource(source), { seed: 5 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world, playerId: player.id };
}

describe('Z5: STRATEGY_SELECTOR maps all five adverbs 1:1 (ADR-211 Decision 4)', () => {
  it.each([
    ['randomly', 'random'],
    ['cycling', 'cycling'],
    ['stopping', 'stopping'],
    ['sticky', 'sticky'],
    ['first-time', 'firstTime'],
  ] as const)('`define phrase mood, %s` emits a Choice with selector `%s`', (adverb, selector) => {
    const { story, world, playerId } = boot(`story "P1" by "N"
  id: p1
  version: 0.0.1

create the Hall
  a room

  A hall.

  after entering it
    phrase mood
  end after

create the player
  starts in the Hall

  You.

define phrase mood, ${adverb}
  One.
or
  Two.
end phrase
`);
    const hall = story.entityId('hall')!;
    const events = story.runtime.fireEventClauses(world, {
      id: 'm0',
      type: 'if.event.actor_moved',
      timestamp: 0,
      entities: { actor: playerId },
      data: { toRoom: hall },
    });
    const phraseEvent = events.find((e) => e.type === 'chord.phrase')!;
    const variants = (phraseEvent.data as { params: { variants: Choice } }).params.variants;
    expect(variants).toMatchObject({ kind: 'choice', selector, messageKey: 'mood' });
    expect(variants.alternatives).toHaveLength(2);
  });
});

describe('Z5: `select sticky` persists its pick (stored = index + 1) and replays it', () => {
  it('the first firing draws and persists; later firings replay the same alternative', () => {
    const { story, world, playerId } = boot(`story "P1" by "N"
  id: p1
  version: 0.0.1

create the Hall
  a room

  A hall.

  after entering it
    select sticky
      phrase pick-one
        First.
    or
      phrase pick-two
        Second.
    end select
  end after

create the player
  starts in the Hall

  You.
`);
    const hall = story.entityId('hall')!;
    const fire = () =>
      story.runtime
        .fireEventClauses(world, {
          id: `m${Math.random()}`,
          type: 'if.event.actor_moved',
          timestamp: 0,
          entities: { actor: playerId },
          data: { toRoom: hall },
        })
        .map((e) => String((e.data as { messageId?: string }).messageId));

    const first = fire();
    expect(first).toHaveLength(1);
    expect(['hall.pick-one', 'hall.pick-two']).toContain(first[0]);
    // The stored index (setStateValue, stored = index + 1) is READ BACK,
    // not just written: every later firing replays the first pick. Eight
    // replays make a coincidental re-draw match (~0.4%) implausible.
    for (let i = 0; i < 8; i++) expect(fire()).toEqual(first);
  });
});

describe('Z4: `while <entity> is here` gates a rule site (every-turn daemon)', () => {
  const SOURCE = `story "P1" by "N"
  id: p1
  version: 0.0.1

create the Lab
  a room

  A lab.

create the Annex
  a room

  An annex.

create the player
  starts in the Lab

  You.

create the widget
  in the Lab

  A widget.

create the bell
  in the Lab

  A bell.

  on every turn while the widget is here
    phrase ding
      Ding.
  end on
`;

  function messageIdsOf(events: ISemanticEvent[]): unknown[] {
    return events.map((e) => (e.data as { messageId?: string } | undefined)?.messageId).filter(Boolean);
  }

  it('fires while the subject shares the player\'s room, stops when it leaves, resumes on return — and a no-location subject is never here', () => {
    const { story, world } = boot(SOURCE);
    const daemons = story.runtime.buildSchedulerDaemons();
    const tick = (turn: number): ISemanticEvent[] => {
      const out: ISemanticEvent[] = [];
      for (const daemon of daemons) {
        const ctx = { world, turn };
        if (daemon.condition && !daemon.condition(ctx)) continue;
        out.push(...daemon.run(ctx));
      }
      return out;
    };
    const widget = story.entityId('widget')!;
    const annex = story.entityId('annex')!;
    const lab = story.entityId('lab')!;

    // Widget and player share the Lab: the gate holds.
    expect(messageIdsOf(tick(1))).toContain('bell.ding');

    // Widget moved elsewhere: not here, no firing.
    world.moveEntity(widget, annex);
    expect(messageIdsOf(tick(2))).not.toContain('bell.ding');

    // Orphaned (no location at all): never here — false, not an error.
    world.moveEntity(widget, null);
    expect(messageIdsOf(tick(3))).not.toContain('bell.ding');

    // Back in the player's room: fires again.
    world.moveEntity(widget, lab);
    expect(messageIdsOf(tick(4))).toContain('bell.ding');
  });
});

describe('Z1: `first time` prose binds RoomTrait.initialDescription', () => {
  it('the room carries both descriptions in their platform fields', () => {
    const { story, world } = boot(`story "P1" by "N"
  id: p1
  version: 0.0.1

create the Zoo Entrance
  a room
  first time
    Your family piles out of the car.

  You stand before the wrought-iron gates.

create the player
  in the Zoo Entrance

  You.
`);
    const room = world.getEntity(story.entityId('zoo-entrance')!)!;
    const roomTrait = room.get(TraitType.ROOM) as RoomTrait;
    const identity = room.get(TraitType.IDENTITY) as IdentityTrait;

    // The first-visit text lands in the platform field stdlib's looking
    // path reads (looking-data), and the standard description is untouched
    // by it — the first-look/later-look split is platform behavior.
    expect(roomTrait.initialDescription).toBe('Your family piles out of the car.');
    expect(identity.description).toBe('You stand before the wrought-iron gates.');
  });

  it('a room without `first time` has no initialDescription (field absent, not empty)', () => {
    const { story, world } = boot(`story "P1" by "N"
  id: p1
  version: 0.0.1

create the Hall
  a room

  A hall.

create the player
  in the Hall

  You.
`);
    const room = world.getEntity(story.entityId('hall')!)!;
    expect((room.get(TraitType.ROOM) as RoomTrait).initialDescription).toBeUndefined();
  });
});
