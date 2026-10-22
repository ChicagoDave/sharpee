/**
 * plugin-facts-applied.test.ts — every fact is applied to the world once,
 * whichever stage delivers it.
 *
 * REAL-PATH: a real `GameEngine`, its event processor with world chains
 * wired, a real turn plugin, and the engine's own actor phase running a
 * real standard action as an NPC. A plugin's new fact reaches the chain
 * bound to it and the chain's reaction joins the turn; an NPC's act, which
 * the execution entry already applied, is not applied again when the actor
 * phase's batch is delivered; an event a plugin returns already stamped is
 * delivered and never applied twice. `withWorldReactions` stamps what it
 * applies and refuses a stamped event.
 */
import { describe, expect, it } from 'vitest';
import type { ISemanticEvent } from '@sharpee/core';
import { ActorTrait, ContainerTrait, EntityType, NpcTrait, RoomTrait } from '@sharpee/world-model';
import { IFActions, type NpcBehavior } from '@sharpee/stdlib';
import { TURN_BANDS } from '@sharpee/plugins';
import { unappliedOf, withWorldReactions } from '../../src/events/world-reactions';
import { setupTestEngineWithStory } from '../test-helpers/setup-test-engine';

function fact(type: string, id = `${type}-1`): ISemanticEvent {
  return { id, type, timestamp: 0, entities: {}, data: {} };
}

/** An engine with one plugin returning what `emit` gives it each turn, and every delivered event recorded. */
function stage(emit: () => ISemanticEvent[]) {
  const { engine, world, player } = setupTestEngineWithStory();
  engine.getPluginRegistry().register({
    id: 'test.fact-plugin',
    priority: TURN_BANDS.platformPhases.floor + 1,
    onAfterAction: emit,
  });
  const delivered: ISemanticEvent[] = [];
  engine.on('event', (e: ISemanticEvent) => { delivered.push(e); });
  return { engine, world, player, delivered };
}

describe('a plugin\'s new facts reach the world (plugin stage)', () => {
  it('a fact a plugin records fires the chain bound to it once, and the chain\'s reaction joins the turn after it', async () => {
    const { engine, world, delivered } = stage(() => [fact('test.event.bell_rang')]);
    let heard = 0;
    world.chainEvent('test.event.bell_rang', () => {
      heard += 1;
      return fact('test.event.dog_barked');
    }, { key: 'test.bell' });
    engine.start();

    await engine.executeTurn('wait');

    expect(heard).toBe(1);
    const types = delivered.map((e) => e.type);
    expect(types.indexOf('test.event.dog_barked')).toBeGreaterThan(types.indexOf('test.event.bell_rang'));
    expect(delivered.find((e) => e.type === 'test.event.bell_rang')!.applied).toBe(true);
    expect(delivered.find((e) => e.type === 'test.event.dog_barked')!.applied).toBe(true);
  });

  it('a fact the plugin returns already applied is delivered but never applied again', async () => {
    const stamped = { ...fact('test.event.bell_rang'), applied: true as const };
    const { engine, world, delivered } = stage(() => [stamped]);
    let heard = 0;
    world.chainEvent('test.event.bell_rang', () => { heard += 1; return null; }, { key: 'test.bell' });
    engine.start();

    await engine.executeTurn('wait');

    expect(heard).toBe(0);
    expect(delivered.some((e) => e.type === 'test.event.bell_rang')).toBe(true);
  });

  it('an NPC\'s act, applied by the execution entry, is not applied again when the actor phase delivers it', async () => {
    // The real PerceptionService, as the actor phase's own tests run it: an NPC knows what it sees.
    const { engine, world, player } = setupTestEngineWithStory({ withPerception: true });
    world.getEntity(world.getLocation(player.id)!)!.add(new RoomTrait());
    const npc = world.createEntity('thief', EntityType.ACTOR);
    npc.add(new ActorTrait());
    npc.add(new ContainerTrait());
    const behavior: NpcBehavior = {
      id: 'lamp-taker',
      onTurn: (context) => { context.act(IFActions.TAKING, { directObject: context.world.getEntity(lamp.id)! }); },
    };
    npc.add(new NpcTrait({ behaviorId: behavior.id, canMove: true, announcesMovement: true }));
    world.moveEntity(npc.id, world.getLocation(player.id)!);
    const lamp = world.createEntity('brass lamp', EntityType.OBJECT);
    world.moveEntity(lamp.id, world.getLocation(player.id)!);
    engine.getNpcService().registerBehavior(behavior);
    let taken = 0;
    world.chainEvent('if.event.taken', (event) => {
      if (event.entities.actor === npc.id) taken += 1;
      return null;
    }, { key: 'test.taken' });
    engine.start();

    await engine.executeTurn('wait');

    expect(world.getLocation(lamp.id)).toBe(npc.id);
    expect(taken).toBe(1);
  });
});

describe('withWorldReactions (the one door)', () => {
  it('stamps each event it applies and each reaction it produces', () => {
    const { engine, world } = setupTestEngineWithStory();
    const processor = engine.getEventProcessor();
    world.chainEvent('test.event.bell_rang', () => fact('test.event.dog_barked'), { key: 'test.bell' });
    const bell = fact('test.event.bell_rang');

    const all = withWorldReactions(processor, [bell], 1);

    expect(bell.applied).toBe(true);
    expect(all.map((e) => e.type)).toEqual(['test.event.bell_rang', 'test.event.dog_barked']);
    expect(all[1].applied).toBe(true);
    expect(unappliedOf(all)).toEqual([]);
  });

  it('refuses an event already applied, naming it', () => {
    const { engine } = setupTestEngineWithStory();
    const processor = engine.getEventProcessor();
    const bell = { ...fact('test.event.bell_rang', 'bell-7'), applied: true as const };

    expect(() => withWorldReactions(processor, [bell], 1)).toThrow(/test\.event\.bell_rang \(bell-7\) has already been applied/);
  });

  it('unappliedOf keeps a batch\'s new facts in order and leaves the stamped ones out', () => {
    const a = fact('a');
    const b = { ...fact('b'), applied: true as const };
    const c = fact('c');

    expect(unappliedOf([a, b, c])).toEqual([a, c]);
  });
});
