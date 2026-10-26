/**
 * ADR-371 D1a — the executor never pre-empts an implementation-dispatching
 * action with universal capability dispatch.
 *
 * Behavior Statement (CommandExecutor.runPhases, self-dispatching branch):
 *   DOES    for an action with `dispatchesImplementations`, run the action's
 *           own phases even when the target has a capability behavior, so
 *           the behavior's mutation lands AND the target's interceptor is
 *           consulted (its postExecute mutation lands, once).
 *   WHEN    the action id names a self-dispatching action (lowering here).
 *   BECAUSE a Chord thing can carry both a capability behavior (`settable`)
 *           and clauses on the same verb; universal dispatch ran the behavior
 *           alone and the clauses never fired.
 *   REJECTS nothing new: an ordinary action with a capability behavior is
 *           still pre-empted by universal dispatch (taking, below).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CommandExecutor } from '../src/command/command-executor';
import { EngineRandomService } from '../src/session/engine-random-service';
import { GameContext } from '../src/types';
import {
  WorldModel,
  EntityType,
  ActorTrait,
  ContainerTrait,
  RoomTrait,
  type IFEntity,
  type ITrait
} from '@sharpee/world-model';
import { EventProcessor } from '@sharpee/event-processor';
import { StandardActionRegistry, standardActions, IFActions } from '@sharpee/stdlib';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';

/** A trait claiming lowering and taking as capabilities, carrying the state both surfaces write. */
class WinchTrait implements ITrait {
  static readonly type = 'test.trait.winch';
  static readonly capabilities = [IFActions.LOWERING, IFActions.TAKING];
  readonly type = WinchTrait.type;
  position = 'up';
}

describe('self-dispatching actions are not pre-empted (ADR-371 D1a)', () => {
  let world: WorldModel;
  let player: IFEntity;
  let winch: IFEntity;
  let executor: CommandExecutor;
  let gameContext: GameContext;
  let interceptorRuns: number;

  beforeEach(() => {
    world = new WorldModel();
    const hall = world.createEntity('Hall', EntityType.ROOM);
    hall.add(new RoomTrait());
    player = world.createEntity('You', EntityType.ACTOR);
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait());
    world.moveEntity(player.id, hall.id);
    world.setPlayer(player.id);

    winch = world.createEntity('winch', EntityType.OBJECT);
    winch.add(new WinchTrait());
    world.moveEntity(winch.id, hall.id);

    // Surface 1: the capability behavior moves the winch down.
    world.registerCapabilityBehavior(WinchTrait.type, IFActions.LOWERING, {
      validate: () => ({ valid: true }),
      execute: (entity) => { (entity.get(WinchTrait.type) as WinchTrait).position = 'down'; },
      report: () => [{ type: 'test.winch.lowered', payload: { messageId: 'test.winch.lowered' } }],
      blocked: () => []
    } as any);
    // Surface 2: an interceptor on the same trait and verb records that it ran.
    interceptorRuns = 0;
    world.registerActionInterceptor(WinchTrait.type, IFActions.LOWERING, {
      postExecute(_entity, w) {
        interceptorRuns++;
        w.setStateValue('winch.clause-fired', true);
      }
    });

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

  it('lowering runs the behavior and the interceptor, once each', () => {
    expect((winch.get(WinchTrait.type) as WinchTrait).position).toBe('up');
    expect(world.getStateValue('winch.clause-fired')).toBeUndefined();

    const result = executor.executeAsActor(
      { actionId: IFActions.LOWERING, actorId: player.id, directObject: winch },
      world,
      gameContext
    );

    expect(result.success).toBe(true);
    expect((winch.get(WinchTrait.type) as WinchTrait).position).toBe('down');
    expect(world.getStateValue('winch.clause-fired')).toBe(true);
    expect(interceptorRuns).toBe(1);
    expect(result.events.some((e) => e.type === 'test.winch.lowered')).toBe(true);
  });

  it('an ordinary action is still pre-empted by universal dispatch', () => {
    let takeBehaviorRan = false;
    world.registerCapabilityBehavior(WinchTrait.type, IFActions.TAKING, {
      validate: () => ({ valid: true }),
      execute: () => { takeBehaviorRan = true; },
      report: () => [],
      blocked: () => []
    } as any);

    executor.executeAsActor(
      { actionId: IFActions.TAKING, actorId: player.id, directObject: winch },
      world,
      gameContext
    );

    // The behavior replaced taking: it ran, and the winch never moved into the player.
    expect(takeBehaviorRan).toBe(true);
    expect(world.getLocation(winch.id)).not.toBe(player.id);
  });
});
