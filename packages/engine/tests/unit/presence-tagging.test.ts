/**
 * presence-tagging.test.ts — the ADR-328 D3 presence tag at the engine's
 * enrichment funnel.
 *
 * Unit level: `processEvent` stamps `presence` from a producer-set
 * `entities.location` and from nothing else — never from the player-location
 * default, never over an existing value, never without a resolver.
 *
 * REAL-PATH level (rule 13a): a real `GameEngine` with the real
 * `PerceptionService` and the real `SchedulerPlugin`; a daemon emits an
 * NPC-located event and the payload the engine emits carries `presence`
 * `'absent'` when the NPC is elsewhere and `'present'` when it shares the
 * player's room. Player action events are located by the action context and
 * tag present — the player is present at their own acts by identity.
 */

import { describe, it, expect } from 'vitest';
import { processEvent } from '../../src/turn-event-processor';
import { GameEngine } from '../../src/game-engine';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';
import { PerceptionService, registerStandardCapabilities } from '@sharpee/stdlib';
import { SchedulerPlugin } from '@sharpee/plugin-scheduler';
import { WorldModel, EntityType, RoomTrait, type IFEntity } from '@sharpee/world-model';
import type { ISemanticEvent, Presence } from '@sharpee/core';

function makeEvent(entities: ISemanticEvent['entities'], presence?: Presence): ISemanticEvent {
  return {
    id: `test-${Math.random().toString(36).slice(2)}`,
    type: 'game.message',
    entities,
    data: { messageId: 'test.line' },
    timestamp: Date.now(),
    ...(presence !== undefined ? { presence } : {}),
  };
}

describe('processEvent presence tagging (unit)', () => {
  const seen: string[] = [];
  const presenceOf = (locationId: string): Presence => {
    seen.push(locationId);
    return locationId === 'here' ? 'present' : 'absent';
  };
  const context = { turn: 1, playerId: 'player', locationId: 'here', presenceOf };

  it('tags from a producer-set location', () => {
    expect(processEvent(makeEvent({ actor: 'npc', location: 'there' }), context).presence).toBe('absent');
    expect(processEvent(makeEvent({ actor: 'npc', location: 'here' }), context).presence).toBe('present');
  });

  it('does not tag from the player-location default', () => {
    seen.length = 0;
    const processed = processEvent(makeEvent({}), context);
    expect(processed.entities.location).toBe('here'); // the default still lands
    expect(processed.presence).toBeUndefined(); // but it was never presence-checked
    expect(seen).toEqual([]);
  });

  it('the player is present at their own events by identity, wherever they are located', () => {
    seen.length = 0;
    const processed = processEvent(makeEvent({ actor: 'player', location: 'there' }), context);
    expect(processed.presence).toBe('present');
    expect(seen).toEqual([]);
  });

  it('never overwrites a presence the producer already set', () => {
    const processed = processEvent(makeEvent({ location: 'there' }, 'concealed'), context);
    expect(processed.presence).toBe('concealed');
  });

  it('leaves events untagged when the context has no resolver', () => {
    const processed = processEvent(makeEvent({ location: 'there' }), { turn: 1, playerId: 'player', locationId: 'here' });
    expect(processed.presence).toBeUndefined();
    expect(processed.entities.location).toBe('there');
  });
});

describe('presence tagging through the live engine (REAL PATH)', () => {
  function buildEngine(): { engine: GameEngine; world: WorldModel; player: IFEntity; hall: IFEntity; cellar: IFEntity; thief: IFEntity } {
    const world = new WorldModel();
    registerStandardCapabilities(world);
    const player = world.createEntity('You', EntityType.ACTOR);
    world.setPlayer(player.id);
    const hall = world.createEntity('Hall', EntityType.ROOM);
    const cellar = world.createEntity('Cellar', EntityType.ROOM);
    hall.add(new RoomTrait({ requiresLight: false, exits: { EAST: { destination: cellar.id } } }));
    cellar.add(new RoomTrait({ requiresLight: false, exits: { WEST: { destination: hall.id } } }));
    world.moveEntity(player.id, hall.id);
    const thief = world.createEntity('thief', EntityType.ACTOR);

    const language = new EnglishLanguageProvider();
    const parser = new EnglishParser(language, { world });
    const engine = new GameEngine({
      world,
      player,
      parser,
      language,
      perceptionService: new PerceptionService(),
    });
    return { engine, world, player, hall, cellar, thief };
  }

  async function runOneTurn(npcRoom: (rooms: { hall: IFEntity; cellar: IFEntity }) => IFEntity) {
    const built = buildEngine();
    const { engine, world, thief, hall, cellar } = built;
    world.moveEntity(thief.id, npcRoom({ hall, cellar }).id);

    const scheduler = new SchedulerPlugin();
    scheduler.getScheduler().registerDaemon({
      id: 'thief-mutters',
      name: 'The thief mutters',
      run: (ctx) => [
        {
          id: 'thief-mutters-1',
          type: 'game.message',
          timestamp: Date.now(),
          // The producer half: who, and the room it happened in.
          entities: { actor: thief.id, location: ctx.world.getLocation(thief.id)! },
          data: { messageId: 'test.thief.mutters' },
        },
      ],
    });
    engine.getPluginRegistry().register(scheduler);

    const emitted: ISemanticEvent[] = [];
    engine.getEventSource().subscribe((e) => emitted.push(e));
    engine.start();
    try {
      const result = await engine.executeTurn('look');
      expect(result.success).toBe(true);
    } finally {
      engine.stop();
    }
    return { ...built, emitted };
  }

  it('an NPC-located event fired while the NPC is elsewhere is tagged absent, at the NPC\'s room', async () => {
    const { emitted, cellar, thief } = await runOneTurn(({ cellar }) => cellar);
    const line = emitted.find((e) => (e.data as { messageId?: string })?.messageId === 'test.thief.mutters');
    expect(line).toBeDefined();
    expect(line!.presence).toBe('absent');
    expect(line!.entities.location).toBe(cellar.id);
    expect(line!.entities.actor).toBe(thief.id);
  });

  it('the same event fired while the NPC shares the player\'s room is tagged present', async () => {
    const { emitted, hall } = await runOneTurn(({ hall }) => hall);
    const line = emitted.find((e) => (e.data as { messageId?: string })?.messageId === 'test.thief.mutters');
    expect(line).toBeDefined();
    expect(line!.presence).toBe('present');
    expect(line!.entities.location).toBe(hall.id);
  });

  it('player action events are located by the action context at the player\'s room, so they tag present', async () => {
    const { emitted, hall } = await runOneTurn(({ hall }) => hall);
    const actionEvents = emitted.filter((e) => e.type === 'if.event.looked' || e.type === 'if.event.room.description');
    expect(actionEvents.length).toBeGreaterThan(0);
    for (const e of actionEvents) {
      expect(e.entities.location).toBe(hall.id);
      expect(e.presence).toBe('present');
    }
  });

  it('the player\'s own move is present although the action context located it at the origin room', async () => {
    const built = buildEngine();
    const { engine, world, player, hall, cellar } = built;
    const emitted: ISemanticEvent[] = [];
    engine.getEventSource().subscribe((e) => emitted.push(e));
    engine.start();
    try {
      const result = await engine.executeTurn('east');
      expect(result.success).toBe(true);
    } finally {
      engine.stop();
    }
    expect(world.getLocation(player.id)).toBe(cellar.id);
    const moved = emitted.find((e) => e.type === 'if.event.actor_moved');
    expect(moved).toBeDefined();
    expect(moved!.entities.location).toBe(hall.id); // located at the origin by the action context
    expect(moved!.presence).toBe('present'); // and still witnessed — it is the player's own act
  });

  it('an event with no producer location is never tagged, even through the live funnel', async () => {
    const built = buildEngine();
    const { engine } = built;
    engine.getPluginRegistry().register({
      id: 'test.unlocated',
      priority: 10,
      onAfterAction: () => [
        { id: 'unlocated-1', type: 'game.message', timestamp: Date.now(), entities: {}, data: { messageId: 'test.unlocated' } },
      ],
    });
    const emitted: ISemanticEvent[] = [];
    engine.getEventSource().subscribe((e) => emitted.push(e));
    engine.start();
    try {
      await engine.executeTurn('look');
    } finally {
      engine.stop();
    }
    const line = emitted.find((e) => (e.data as { messageId?: string })?.messageId === 'test.unlocated');
    expect(line).toBeDefined();
    expect(line!.entities.location).toBe(built.hall.id); // the player-location default still lands
    expect(line!.presence).toBeUndefined(); // but is never mistaken for a witnessed location
  });
});
