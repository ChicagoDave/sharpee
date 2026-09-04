/**
 * CommandExecutor.executeAsActor — the programmatic execution entry (ADR-328 D1/D2).
 *
 * REAL-PATH (rule 13a): every test drives the real `CommandExecutor` with the
 * real `StandardActionRegistry`, `EventProcessor`, `EngineRandomService`, and
 * the stdlib `taking` action — no doubles. The pilot action is `taking`;
 * assertions are on world state (where the item ended up) and on the actor
 * the emitted events carry, not on return values alone.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CommandExecutor, type BeforeActionHookData } from '../src/command-executor';
import { EngineRandomService } from '../src/engine-random-service';
import { GameContext } from '../src/types';
import {
  WorldModel,
  EntityType,
  ActorTrait,
  ContainerTrait,
  RoomTrait,
  WearableTrait,
  TraitType,
  type IFEntity,
  type ActionInterceptor
} from '@sharpee/world-model';
import type { ISound } from '@sharpee/if-domain';
import { EventProcessor } from '@sharpee/event-processor';
import { StandardActionRegistry, standardActions, IFActions, actorConsultationId, type Action } from '@sharpee/stdlib';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';

/** Two rooms, a player and an NPC in the first, a lamp beside them, a boulder too. */
function buildWorld() {
  const world = new WorldModel();

  const hall = world.createEntity('Hall', EntityType.ROOM);
  hall.add(new RoomTrait());
  const cellar = world.createEntity('Cellar', EntityType.ROOM);
  cellar.add(new RoomTrait());

  const player = world.createEntity('You', EntityType.ACTOR);
  player.add(new ActorTrait({ isPlayer: true }));
  player.add(new ContainerTrait());
  world.moveEntity(player.id, hall.id);
  world.setPlayer(player.id);

  const npc = world.createEntity('mercenary', EntityType.ACTOR);
  npc.add(new ActorTrait());
  npc.add(new ContainerTrait());
  world.moveEntity(npc.id, hall.id);

  const lamp = world.createEntity('brass lamp', EntityType.OBJECT);
  world.moveEntity(lamp.id, hall.id);

  const boulder = world.createEntity('boulder', EntityType.SCENERY);
  world.moveEntity(boulder.id, hall.id);

  return { world, hall, cellar, player, npc, lamp, boulder };
}

describe('CommandExecutor.executeAsActor (ADR-328 D2)', () => {
  let world: WorldModel;
  let hall: IFEntity;
  let cellar: IFEntity;
  let player: IFEntity;
  let npc: IFEntity;
  let lamp: IFEntity;
  let boulder: IFEntity;
  let executor: CommandExecutor;
  let registry: StandardActionRegistry;
  let gameContext: GameContext;

  beforeEach(() => {
    ({ world, hall, cellar, player, npc, lamp, boulder } = buildWorld());

    const language = new EnglishLanguageProvider();
    const parser = new EnglishParser(language, { world });
    registry = new StandardActionRegistry();
    for (const action of standardActions) registry.register(action);
    registry.setLanguageProvider(language);

    executor = new CommandExecutor(
      world,
      registry,
      new EventProcessor(world),
      parser,
      undefined,
      new EngineRandomService(12345)
    );

    gameContext = {
      currentTurn: 1,
      player,
      history: [],
      metadata: { started: new Date(), lastPlayed: new Date() }
    };
  });

  describe('a reaction that throws surfaces on the turn (ADR-329 Phase 9b)', () => {
    it('the take still happens; the failed handler is reported as `command.failed` with its reason', () => {
      const eventProcessor = new EventProcessor(world);
      eventProcessor.registerHandler('if.event.taken', () => {
        throw new Error('runtime.example: the story refused the reaction');
      });
      const language = new EnglishLanguageProvider();
      const throwingExecutor = new CommandExecutor(
        world,
        registry,
        eventProcessor,
        new EnglishParser(language, { world }),
        undefined,
        new EngineRandomService(12345)
      );

      const result = throwingExecutor.executeAsActor(
        { actionId: IFActions.TAKING, actorId: npc.id, directObject: lamp },
        world,
        gameContext
      );

      // The fact stands — the world applied the take before the handler ran.
      expect(world.getLocation(lamp.id)).toBe(npc.id);
      expect(result.success).toBe(true);
      // The failure reaches the turn, beside the take, with the handler's reason.
      const failed = result.events.filter(e => e.type === 'command.failed');
      expect(failed).toHaveLength(1);
      expect(failed[0].data).toMatchObject({ reason: 'runtime.example: the story refused the reaction', eventType: 'if.event.taken' });
      expect(result.events.indexOf(failed[0])).toBeGreaterThan(result.events.findIndex(e => e.type === 'if.event.taken'));
    });
  });

  describe('a non-player actor takes', () => {
    it('moves the item into the actor and stamps the actor on the taken event', () => {
      expect(world.getLocation(lamp.id)).toBe(hall.id);

      const result = executor.executeAsActor(
        { actionId: IFActions.TAKING, actorId: npc.id, directObject: lamp },
        world,
        gameContext
      );

      expect(result.success).toBe(true);
      expect(result.actorId).toBe(npc.id);
      expect(result.actionId).toBe(IFActions.TAKING);

      // The mutation: the NPC now holds the lamp; the player never touched it.
      expect(world.getLocation(lamp.id)).toBe(npc.id);
      expect(world.getContents(player.id)).toHaveLength(0);

      const taken = result.events.find(e => e.type === 'if.event.taken');
      expect(taken).toBeDefined();
      expect(taken!.entities.actor).toBe(npc.id);
      expect(taken!.entities.location).toBe(hall.id);
      expect((taken!.data as { actorId: string }).actorId).toBe(npc.id);
      expect((taken!.data as { actor: string }).actor).toBe('mercenary');
    });

    it('is rejected by the real scope check when the actor cannot reach the item', () => {
      world.moveEntity(npc.id, cellar.id);

      const result = executor.executeAsActor(
        { actionId: IFActions.TAKING, actorId: npc.id, directObject: lamp },
        world,
        gameContext
      );

      // Scope is evaluated against the NPC (in the cellar), not the player
      // (in the hall beside the lamp).
      const blocked = result.events.find(e => e.type === 'if.event.take_blocked');
      expect(blocked).toBeDefined();
      expect((blocked!.data as { reason: string }).reason).toMatch(/^scope\./);
      expect(blocked!.entities.actor).toBe(npc.id);
      expect(world.getLocation(lamp.id)).toBe(hall.id);
      expect(result.events.some(e => e.type === 'if.event.taken')).toBe(false);
    });

    it('is rejected by the real scenery trait check inside validate()', () => {
      const result = executor.executeAsActor(
        { actionId: IFActions.TAKING, actorId: npc.id, directObject: boulder },
        world,
        gameContext
      );

      const blocked = result.events.find(e => e.type === 'if.event.take_blocked');
      expect(blocked).toBeDefined();
      expect((blocked!.data as { reason: string }).reason).toBe('fixed_in_place');
      expect(world.getLocation(boulder.id)).toBe(hall.id);
    });

    it('fires the pre-action hook with the actor, not the player', () => {
      const seen: BeforeActionHookData[] = [];
      executor.onBeforeAction(data => { seen.push(data); });

      executor.executeAsActor(
        { actionId: IFActions.TAKING, actorId: npc.id, directObject: lamp },
        world,
        gameContext
      );

      expect(seen).toHaveLength(1);
      expect(seen[0]).toEqual({
        actionId: IFActions.TAKING,
        actorId: npc.id,
        directObjectId: lamp.id
      });
    });

    it('carries a readable synthetic input on the turn result', () => {
      const result = executor.executeAsActor(
        { actionId: IFActions.TAKING, actorId: npc.id, directObject: lamp },
        world,
        gameContext
      );
      expect(result.input).toBe(`${IFActions.TAKING} brass lamp`);
      expect(result.validatedCommand?.directObject?.entity.id).toBe(lamp.id);
    });
  });

  describe('interceptors (ADR-228 lifecycle engine) are told the actor', () => {
    const GUARD_TRAIT = 'test.trait.guard';

    it('an item interceptor vetoes the NPC by actorId and is told the NPC, not the player', () => {
      const told: string[] = [];
      const guard: ActionInterceptor = {
        preValidate(_entity, _world, actorId) {
          told.push(actorId);
          return actorId === npc.id
            ? { valid: false, error: 'test.guard.not_for_mercenaries' }
            : null;
        }
      };
      lamp.add({ type: GUARD_TRAIT });
      world.registerActionInterceptor(GUARD_TRAIT, IFActions.TAKING, guard);

      const asNpc = executor.executeAsActor(
        { actionId: IFActions.TAKING, actorId: npc.id, directObject: lamp },
        world,
        gameContext
      );

      expect(told).toEqual([npc.id]);
      const blocked = asNpc.events.find(e => e.type === 'if.event.take_blocked');
      expect((blocked!.data as { reason: string }).reason).toBe('test.guard.not_for_mercenaries');
      expect(world.getLocation(lamp.id)).toBe(hall.id);

      // The same guard lets the player through, and is told the player.
      const asPlayer = executor.executeAsActor(
        { actionId: IFActions.TAKING, actorId: player.id, directObject: lamp },
        world,
        gameContext
      );
      expect(told).toEqual([npc.id, player.id]);
      expect(asPlayer.success).toBe(true);
      expect(world.getLocation(lamp.id)).toBe(player.id);
    });

    it('the actor-consultation slot (ADR-327 D1) consults the acting NPC, not the player', () => {
      const consulted: string[] = [];
      const onActor: ActionInterceptor = {
        preValidate(entity, _world, actorId) {
          consulted.push(`${entity.id}:${actorId}`);
          return { valid: false, error: 'test.actor.refuses' };
        }
      };
      npc.add({ type: GUARD_TRAIT });
      world.registerActionInterceptor(GUARD_TRAIT, actorConsultationId(IFActions.TAKING), onActor);

      const asNpc = executor.executeAsActor(
        { actionId: IFActions.TAKING, actorId: npc.id, directObject: lamp },
        world,
        gameContext
      );
      expect(consulted).toEqual([`${npc.id}:${npc.id}`]);
      expect(asNpc.events.some(e => e.type === 'if.event.taken')).toBe(false);
      expect(world.getLocation(lamp.id)).toBe(hall.id);

      // The player carries no such trait, so the player's take is not consulted.
      const asPlayer = executor.executeAsActor(
        { actionId: IFActions.TAKING, actorId: player.id, directObject: lamp },
        world,
        gameContext
      );
      expect(consulted).toHaveLength(1);
      expect(asPlayer.success).toBe(true);
      expect(world.getLocation(lamp.id)).toBe(player.id);
    });
  });

  describe('failure results instead of throws', () => {
    it('returns command.failed for an unknown actor and mutates nothing', () => {
      const result = executor.executeAsActor(
        { actionId: IFActions.TAKING, actorId: 'a_nobody', directObject: lamp },
        world,
        gameContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Actor not found: a_nobody');
      expect(result.events.map(e => e.type)).toEqual(['command.failed']);
      expect(world.getLocation(lamp.id)).toBe(hall.id);
    });

    it('returns command.failed for an unknown action', () => {
      const result = executor.executeAsActor(
        { actionId: 'if.action.nonexistent', actorId: npc.id, directObject: lamp },
        world,
        gameContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Action not found: if.action.nonexistent');
      expect(world.getLocation(lamp.id)).toBe(hall.id);
    });
  });

  describe('the parser path is unchanged — the player still acts as the player', () => {
    it('take lamp as typed input resolves the player as the actor', async () => {
      const result = await executor.execute('take lamp', world, gameContext);

      expect(result.success).toBe(true);
      expect(result.actorId).toBe(player.id);
      expect(world.getLocation(lamp.id)).toBe(player.id);
      expect(world.getContents(npc.id)).toHaveLength(0);

      const taken = result.events.find(e => e.type === 'if.event.taken');
      expect(taken!.entities.actor).toBe(player.id);
      expect((taken!.data as { actorId: string }).actorId).toBe(player.id);
    });

    it('the same item can then be taken from the player by the NPC only once reachable', () => {
      // Player carries it; the NPC cannot reach into the player's inventory.
      world.moveEntity(lamp.id, player.id);

      const result = executor.executeAsActor(
        { actionId: IFActions.TAKING, actorId: npc.id, directObject: lamp },
        world,
        gameContext
      );

      expect(result.events.some(e => e.type === 'if.event.taken')).toBe(false);
      expect(world.getLocation(lamp.id)).toBe(player.id);
    });
  });

  describe('the context factory under a non-player actor (Phase 4 carried gaps)', () => {
    it('an implicit take inside wearing runs as the NPC — the cloak ends up worn by the NPC', () => {
      const cloak = world.createEntity('wool cloak', EntityType.OBJECT);
      cloak.add(new WearableTrait());
      world.moveEntity(cloak.id, hall.id);

      const result = executor.executeAsActor(
        { actionId: IFActions.WEARING, actorId: npc.id, directObject: cloak },
        world,
        gameContext
      );

      expect(result.success).toBe(true);
      // The mutation: the implicit take moved the cloak into the NPC, and wearing wore it there.
      expect(world.getLocation(cloak.id)).toBe(npc.id);
      const wearable = cloak.get(TraitType.WEARABLE) as WearableTrait;
      expect(wearable.isWorn).toBe(true);
      expect(wearable.wornBy).toBe(npc.id);
      expect(world.getContents(player.id)).toHaveLength(0);

      // The sub-context the factory built for the implicit take was the NPC's, not the player's.
      const implicit = result.events.find(e => e.type === 'if.event.implicit_take');
      expect(implicit).toBeDefined();
      expect(implicit!.entities.actor).toBe(npc.id);
      const taken = result.events.find(e => e.type === 'if.event.taken');
      expect(taken).toBeDefined();
      expect(taken!.entities.actor).toBe(npc.id);
      const worn = result.events.find(e => e.type === 'if.event.worn');
      expect(worn).toBeDefined();
      expect((worn!.data as { actorId: string }).actorId).toBe(npc.id);
    });

    it("emitSound stamps the NPC and the NPC's room as the source, not the player's", () => {
      const shout: Action = {
        id: 'test.action.shout',
        validate: () => ({ valid: true }),
        execute: () => {},
        report: (context) => {
          context.emitSound({ kind: 'shout', volumeTier: 'shouting' });
          return [];
        }
      };
      registry.register(shout);
      world.moveEntity(npc.id, cellar.id);
      const sounds: ISound[] = [];

      executor.executeAsActor({ actionId: shout.id, actorId: npc.id }, world, gameContext, undefined, sounds);
      expect(sounds).toHaveLength(1);
      expect(sounds[0].sourceEntity).toBe(npc.id);
      expect(sounds[0].sourceLocation).toBe(cellar.id);

      // The same action as the player sources from the player and the hall.
      executor.executeAsActor({ actionId: shout.id, actorId: player.id }, world, gameContext, undefined, sounds);
      expect(sounds).toHaveLength(2);
      expect(sounds[1].sourceEntity).toBe(player.id);
      expect(sounds[1].sourceLocation).toBe(hall.id);
    });
  });
});
