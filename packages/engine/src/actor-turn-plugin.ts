/**
 * Actor turn phase (ADR-070, ADR-120; ADR-328 D5).
 *
 * The engine-owned phase in which non-player actors act. It runs first
 * after the player's action (priority 100 — before state machines at 75
 * and the scheduler at 50), drives the NPC decision layer's tick, and
 * fires the room-entry/exit hooks when the player's action moved them.
 * Every act a behavior chooses runs through the engine's execution entry
 * — the same four phases the player's commands take — so this phase
 * executes nothing of its own; it sequences.
 *
 * Registered by `GameEngine` itself in its constructor (like the scene
 * evaluation plugin); stories reach the decision layer through
 * `GameEngine.getNpcService()`.
 *
 * Public interface: ActorTurnPlugin, ACTOR_TURN_PLUGIN_ID,
 * LEGACY_NPC_PLUGIN_ID.
 * Owner context: @sharpee/engine — turn cycle
 */

import { type ISemanticEvent, type EntityId } from '@sharpee/core';
import { type TurnPlugin, type TurnPluginContext } from '@sharpee/plugins';
import {
  type ExecutionEntry,
  type INpcService,
  createNpcService,
  guardBehavior,
  passiveBehavior,
} from '@sharpee/stdlib';

/** The plugin id this phase saves behavior state under. */
export const ACTOR_TURN_PLUGIN_ID = 'sharpee.engine.actors';

/**
 * The id `@sharpee/plugin-npc` saved behavior state under before the actor
 * phase moved into the engine (ADR-328 D5). Read-side alias only: a save
 * carrying it restores into this phase; nothing writes it.
 */
export const LEGACY_NPC_PLUGIN_ID = 'sharpee.plugin.npc';

export class ActorTurnPlugin implements TurnPlugin {
  /** Stable plugin id. */
  id = ACTOR_TURN_PLUGIN_ID;
  /** Run order within a turn (actors act first). */
  priority = 100;
  private readonly service: INpcService;

  /**
   * @param act - The engine's execution entry, curried over its world and
   *   turn context: how a behavior's chosen act becomes a real
   *   `(action, actorId)` invocation.
   */
  constructor(private readonly act: ExecutionEntry) {
    this.service = createNpcService();
    // Register standard NPC behaviors (ADR-070)
    this.service.registerBehavior(guardBehavior);
    this.service.registerBehavior(passiveBehavior);
  }

  /**
   * Tick the decision layer for this turn and return the events actors
   * produced.
   *
   * After the per-turn tick (which drives each NPC's `onTurn`), this also
   * fires the room-entry/exit hooks when the player's own action moved them
   * this turn: an `if.event.actor_moved` in `ctx.actionEvents` whose actor
   * is the player (any other actor's move is an NPC acting through the
   * entry, and is not the player arriving anywhere) makes the NPCs in the
   * room left react via `onPlayerLeaves` and those in the room entered via
   * `onPlayerEnters`.
   */
  onAfterAction(ctx: TurnPluginContext): ISemanticEvent[] {
    const events = this.service.tick({
      world: ctx.world,
      turn: ctx.turn,
      random: ctx.random,
      playerLocation: ctx.playerLocation,
      playerId: ctx.playerId,
      act: this.act,
      // ADR-310 Phase 5: observation input for character-model NPCs.
      ...(ctx.actionEvents ? { actionEvents: ctx.actionEvents } : {}),
      // ADR-320 Phase 8: scene moves emit conversation sounds through the
      // engine's per-turn buffer (eavesdropping via spatial propagation).
      ...(ctx.emitSound ? { emitSound: ctx.emitSound } : {})
    });

    const move = ctx.actionEvents?.find(
      (e) => e.type === 'if.event.actor_moved' && e.entities?.actor === ctx.playerId
    );
    if (move) {
      const { fromRoom, toRoom } = (move.data ?? {}) as { fromRoom?: EntityId; toRoom?: EntityId };
      if (fromRoom) {
        events.push(...this.service.onPlayerLeaves(ctx.world, fromRoom, ctx.random, ctx.turn, this.act));
      }
      if (toRoom) {
        events.push(...this.service.onPlayerEnters(ctx.world, toRoom, ctx.random, ctx.turn, this.act));
      }
    }

    return events;
  }

  /**
   * Per-NPC behavior state (#226) for the save. NPC world state itself
   * rides the world snapshot; this is only what behaviors hold privately.
   */
  getState(): unknown {
    return { behaviors: this.service.getBehaviorStates?.() ?? {} };
  }

  /** Restore per-NPC behavior state from a save. */
  setState(state: unknown): void {
    const behaviors =
      state && typeof state === 'object'
        ? ((state as { behaviors?: Record<string, Record<string, unknown>> }).behaviors ?? {})
        : {};
    this.service.setBehaviorStates?.(behaviors);
  }

  /**
   * The NPC decision layer — the author hook for registering behaviors
   * and tick phases. The service type (`INpcService`) and behavior helpers
   * live in `@sharpee/stdlib`.
   */
  getNpcService(): INpcService {
    return this.service;
  }
}
