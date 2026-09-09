/**
 * The interceptor lifecycle has one call site: the executor (ADR-337 D1).
 *
 * A wired action is consulted at all four phase boundaries on a real turn
 * through `CommandExecutor.runPhases`, once each, in order; an unwired
 * action is consulted at none; a preValidate veto reaches onBlocked. The
 * actions themselves carry no hook calls, so these sequences can only come
 * from the executor's phase runner.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CommandExecutor } from '../src/command-executor';
import { EngineRandomService } from '../src/engine-random-service';
import { GameContext } from '../src/types';
import {
  WorldModel,
  EntityType,
  ActorTrait,
  ContainerTrait,
  RoomTrait,
  type IFEntity,
  type ActionInterceptor
} from '@sharpee/world-model';
import { EventProcessor } from '@sharpee/event-processor';
import { StandardActionRegistry, standardActions, IFActions, actorConsultationId } from '@sharpee/stdlib';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';

const MARKER = 'test.trait.marker';

function recordingInterceptor(seen: string[]): ActionInterceptor {
  return {
    preValidate() { seen.push('preValidate'); return null; },
    postValidate() { seen.push('postValidate'); return null; },
    postExecute() { seen.push('postExecute'); },
    postReport() { seen.push('postReport'); return null; },
    onBlocked() { seen.push('onBlocked'); return null; }
  };
}

describe('the executor is the lifecycle call site (ADR-337 D1)', () => {
  let world: WorldModel;
  let hall: IFEntity;
  let player: IFEntity;
  let lamp: IFEntity;
  let executor: CommandExecutor;
  let gameContext: GameContext;

  beforeEach(() => {
    world = new WorldModel();
    hall = world.createEntity('Hall', EntityType.ROOM);
    hall.add(new RoomTrait());
    player = world.createEntity('You', EntityType.ACTOR);
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait());
    world.moveEntity(player.id, hall.id);
    world.setPlayer(player.id);
    lamp = world.createEntity('brass lamp', EntityType.OBJECT);
    lamp.add({ type: MARKER });
    world.moveEntity(lamp.id, hall.id);

    const language = new EnglishLanguageProvider();
    const registry = new StandardActionRegistry();
    for (const action of standardActions) registry.register(action);
    registry.setLanguageProvider(language);
    executor = new CommandExecutor(
      world,
      registry,
      new EventProcessor(world),
      new EnglishParser(language, { world }),
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

  it('take lamp: preValidate, postValidate, postExecute, postReport fire once each, in order, and the take lands', () => {
    const seen: string[] = [];
    world.registerActionInterceptor(MARKER, IFActions.TAKING, recordingInterceptor(seen));

    const result = executor.executeAsActor(
      { actionId: IFActions.TAKING, actorId: player.id, directObject: lamp },
      world,
      gameContext
    );

    expect(result.success).toBe(true);
    expect(world.getLocation(lamp.id)).toBe(player.id);
    expect(seen).toEqual(['preValidate', 'postValidate', 'postExecute', 'postReport']);
  });

  it('a preValidate veto takes the blocked path and reaches onBlocked; nothing moves', () => {
    const seen: string[] = [];
    const veto: ActionInterceptor = {
      ...recordingInterceptor(seen),
      preValidate() { seen.push('preValidate'); return { valid: false, error: 'test.nailed_down' }; }
    };
    world.registerActionInterceptor(MARKER, IFActions.TAKING, veto);

    const result = executor.executeAsActor(
      { actionId: IFActions.TAKING, actorId: player.id, directObject: lamp },
      world,
      gameContext
    );

    expect(result.refused).toBe(true);
    expect(world.getLocation(lamp.id)).toBe(hall.id);
    const blocked = result.events.find(e => e.type === 'if.event.take_blocked');
    expect((blocked!.data as { reason: string }).reason).toBe('test.nailed_down');
    expect(seen).toEqual(['preValidate', 'onBlocked']);
  });

  it('score: an unwired action consults no interceptor, even one registered on the actor for it', () => {
    const seen: string[] = [];
    player.add({ type: MARKER });
    world.registerActionInterceptor(MARKER, actorConsultationId(IFActions.SCORING), recordingInterceptor(seen));
    world.registerActionInterceptor(MARKER, IFActions.SCORING, recordingInterceptor(seen));

    const result = executor.executeAsActor(
      { actionId: IFActions.SCORING, actorId: player.id },
      world,
      gameContext
    );

    expect(result.success).toBe(true);
    expect(seen).toEqual([]);
  });
});
