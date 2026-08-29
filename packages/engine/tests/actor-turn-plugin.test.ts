/**
 * actor-turn-plugin.test.ts — the engine-owned actor turn phase (ADR-328 D5).
 *
 * REAL-PATH: a real `GameEngine`, its own registered actor phase, a story
 * behavior registered through `engine.getNpcService()`, and a real player
 * turn. The behavior's chosen act runs the real standard action through
 * the engine's execution entry: the world changes, the act's events join
 * the turn, presence is tagged from where the act happened, and a refusal
 * comes back to the behavior as `success: false`. Save state rides the
 * engine's plugin states under the phase's id, and a save written under
 * `plugin-npc`'s old id restores into it.
 */
import { describe, expect, it } from 'vitest';
import type { ISemanticEvent } from '@sharpee/core';
import {
  ActorTrait,
  ContainerTrait,
  Direction,
  EntityType,
  NpcTrait,
  RoomTrait,
  SceneryTrait,
  type IFEntity,
} from '@sharpee/world-model';
import { IFActions, type NpcBehavior } from '@sharpee/stdlib';
import { ACTOR_TURN_PLUGIN_ID, LEGACY_NPC_PLUGIN_ID } from '../src/actor-turn-plugin';
import { SaveRestoreService } from '../src/save-restore-service';
import { setupTestEngine } from './test-helpers/setup-test-engine';

/** A world with the player's room, a second room to the east, an NPC, and a lamp. */
function stage(behavior: NpcBehavior, npcRoom: 'here' | 'east' = 'here') {
  // The real PerceptionService: presence is tagged from where each act happened.
  const { engine, world, player } = setupTestEngine({ withPerception: true });
  const here = world.getEntity(world.getLocation(player.id)!)!;
  const east = world.createEntity('East Room', EntityType.ROOM);
  here.add(new RoomTrait({ exits: { [Direction.EAST]: { destination: east.id } } }));
  east.add(new RoomTrait({ exits: { [Direction.WEST]: { destination: here.id } } }));

  const npc = world.createEntity('thief', EntityType.ACTOR);
  npc.add(new ActorTrait());
  npc.add(new ContainerTrait());
  npc.add(new NpcTrait({ behaviorId: behavior.id, canMove: true }));
  world.moveEntity(npc.id, npcRoom === 'here' ? here.id : east.id);

  const lamp = world.createEntity('brass lamp', EntityType.OBJECT);
  world.moveEntity(lamp.id, world.getLocation(npc.id)!);

  engine.getNpcService().registerBehavior(behavior);

  const events: ISemanticEvent[] = [];
  engine.on('event', (e: ISemanticEvent) => { events.push(e); });
  engine.start();
  return { engine, world, player, npc, lamp, here, east, events };
}

describe('the actor turn phase (ADR-328 D5)', () => {
  it('is registered by the engine itself, first in turn order', () => {
    const { engine } = setupTestEngine();
    const order = engine.getPluginRegistry().getAll().map((p) => p.id);
    expect(order[0]).toBe(ACTOR_TURN_PLUGIN_ID);
    expect(engine.getNpcService()).toBeDefined();
  });

  it("a behavior's take runs the real taking action as the NPC: the lamp moves, the fact joins the turn", async () => {
    let outcome: { success: boolean } | undefined;
    const { engine, world, npc, lamp, events } = stage({
      id: 'lamp-taker',
      onTurn: (context) => {
        outcome = context.act(IFActions.TAKING, { directObject: context.world.getEntity(lamp.id)! });
      },
    });

    const result = await engine.executeTurn('wait');

    expect(result.success).toBe(true);
    expect(outcome?.success).toBe(true);
    expect(world.getLocation(lamp.id)).toBe(npc.id);
    const taken = events.find((e) => e.type === 'if.event.taken')!;
    expect(taken.entities.actor).toBe(npc.id);
    // Tagged from where the act happened — the player's own room.
    expect(taken.presence).toBe('present');
  });

  it("the world's refusal reaches the behavior as success: false, and nothing moved", async () => {
    let outcome: { success: boolean } | undefined;
    const { engine, world, here, lamp } = stage({
      id: 'scenery-taker',
      onTurn: (context) => {
        outcome = context.act(IFActions.TAKING, { directObject: context.world.getEntity(lamp.id)! });
      },
    });
    lamp.add(new SceneryTrait());

    await engine.executeTurn('wait');

    expect(outcome?.success).toBe(false);
    expect(world.getLocation(lamp.id)).toBe(here.id);
  });

  it('an NPC going into the player’s room is witnessed: its arrival is present, its departure absent', async () => {
    const { engine, world, npc, here, events } = stage({
      id: 'walker',
      onTurn: (context) => { context.act(IFActions.GOING, { direction: Direction.WEST }); },
    }, 'east');

    await engine.executeTurn('wait');

    expect(world.getLocation(npc.id)).toBe(here.id);
    const exited = events.find((e) => e.type === 'if.event.actor_exited')!;
    const entered = events.find((e) => e.type === 'if.event.actor_entered')!;
    expect(exited.presence).toBe('absent');
    expect(entered.presence).toBe('present');
    expect((entered.data as { messageId?: string }).messageId).toBe('if.action.going.arrives');
    // The mover's own arrival perception is not the player's.
    expect(events.filter((e) => e.type === 'if.event.room.description' && e.entities.actor === npc.id)).toHaveLength(0);
  });

  it('narrate emits a game.message sourced by the NPC that the turn renders', async () => {
    const { engine, npc, events } = stage({
      id: 'growler',
      onTurn: (context) => { context.narrate({ text: 'The thief growls.' }); },
    });

    await engine.executeTurn('wait');

    const message = events.find((e) => e.type === 'game.message' && e.entities.actor === npc.id)!;
    expect(message.data).toMatchObject({ text: 'The thief growls.' });
    expect(message.presence).toBe('present');
  });

  it("the player's own move fires onPlayerLeaves / onPlayerEnters; an NPC's move does not", async () => {
    const seen: string[] = [];
    const { engine, world, player, east } = stage({
      id: 'greeter',
      onTurn: () => undefined,
      onPlayerEnters: () => { seen.push('enters'); },
      onPlayerLeaves: () => { seen.push('leaves'); },
    }, 'east');
    // A second NPC in the player's room, so both hooks have a listener.
    const second = world.createEntity('porter', EntityType.ACTOR);
    second.add(new ActorTrait());
    second.add(new NpcTrait({ behaviorId: 'greeter' }));
    world.moveEntity(second.id, world.getLocation(player.id)!);

    await engine.executeTurn('east');

    expect(world.getLocation(player.id)).toBe(east.id);
    expect(seen).toEqual(['leaves', 'enters']);
  });

  it('behavior state rides the save under the phase id, and a plugin-npc save restores into it', () => {
    const state: Record<string, unknown> = { cursor: 2 };
    const { engine, npc } = stage({
      id: 'stateful',
      onTurn: () => undefined,
      getState: () => state,
      setState: (_npc: IFEntity, restored: Record<string, unknown>) => { state.cursor = restored.cursor; },
    });
    // `tick` is what lets the service enumerate NPCs for serialization.
    const service = new SaveRestoreService();
    engine.getNpcService().tick({
      world: engine.getWorld(), turn: 1, random: engine.getRandomService(),
      playerLocation: engine.getWorld().getLocation(engine.getWorld().getPlayer()!.id)!,
      playerId: engine.getWorld().getPlayer()!.id,
      act: () => ({ success: true, events: [] }),
    });

    const saved = service.createSaveData(engine);
    expect(saved.engineState.pluginStates).toEqual({
      [ACTOR_TURN_PLUGIN_ID]: { behaviors: { [npc.id]: { cursor: 2 } } },
    });

    // A save written before the phase moved into the engine.
    const legacy = {
      ...saved,
      engineState: {
        ...saved.engineState,
        pluginStates: { [LEGACY_NPC_PLUGIN_ID]: { behaviors: { [npc.id]: { cursor: 7 } } } },
      },
    };
    state.cursor = 0;
    service.loadSaveData(legacy, engine);
    expect(state.cursor).toBe(7);
  });
});
