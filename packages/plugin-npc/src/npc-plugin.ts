/**
 * NpcPlugin - Wraps NPC service as a TurnPlugin (ADR-070, ADR-120)
 *
 * Priority 100: Runs before scheduler (50) and state machines (75).
 * NPCs act immediately after the player's action.
 */

import { ISemanticEvent, EntityId } from '@sharpee/core';
import { TurnPlugin, TurnPluginContext } from '@sharpee/plugins';
import { INpcService, createNpcService, guardBehavior, passiveBehavior } from '@sharpee/stdlib';

/**
 * The {@link TurnPlugin} that lets NPCs act each turn (ADR-070, ADR-120).
 *
 * Runs at priority 100 — before state machines (75) and the scheduler (50), so
 * NPCs react immediately after the player's action. It wraps the NPC service
 * from `@sharpee/stdlib`, pre-registering the standard `guard` and `passive`
 * behaviours. Register the plugin with the engine, then add story-specific
 * behaviours through {@link getNpcService}.
 */
export class NpcPlugin implements TurnPlugin {
  /** Stable plugin id. */
  id = 'sharpee.plugin.npc';
  /** Run order within a turn (NPCs act first). */
  priority = 100;
  private service: INpcService;

  constructor() {
    this.service = createNpcService();
    // Register standard NPC behaviors (ADR-070)
    this.service.registerBehavior(guardBehavior);
    this.service.registerBehavior(passiveBehavior);
  }

  /**
   * Tick the NPC service for this turn and return the events NPCs produced.
   *
   * After the per-turn tick (which drives each NPC's `onTurn`), this also fires
   * the room-entry/exit hooks when the player's action moved them this turn:
   * an `if.event.actor_moved` in `ctx.actionEvents` is always the player's move
   * (NPC movement is produced here, not in the player's action events), so the
   * NPCs in the room left react via `onPlayerLeaves` and those in the room
   * entered react via `onPlayerEnters` (e.g. a greeting emote). Without this the
   * service's `onPlayerEnters`/`onPlayerLeaves` hooks have no runtime caller.
   */
  onAfterAction(ctx: TurnPluginContext): ISemanticEvent[] {
    const events = this.service.tick({
      world: ctx.world,
      turn: ctx.turn,
      random: ctx.random,
      playerLocation: ctx.playerLocation,
      playerId: ctx.playerId
    });

    const move = ctx.actionEvents?.find((e) => e.type === 'if.event.actor_moved');
    if (move) {
      const { fromRoom, toRoom } = (move.data ?? {}) as { fromRoom?: EntityId; toRoom?: EntityId };
      if (fromRoom) {
        events.push(...this.service.onPlayerLeaves(ctx.world, fromRoom, ctx.random, ctx.turn));
      }
      if (toRoom) {
        events.push(...this.service.onPlayerEnters(ctx.world, toRoom, ctx.random, ctx.turn));
      }
    }

    return events;
  }

  /**
   * Returns an empty object: NPC state lives in world-model entity traits, so it
   * is saved with the world and the plugin holds nothing of its own.
   */
  getState(): unknown {
    return {};
  }

  /** No-op: NPC state is restored with the world model, not by this plugin. */
  setState(_state: unknown): void {
    // No-op: NPC state is stored in world model entities
  }

  /**
   * The underlying NPC service — the author hook for registering custom NPC
   * behaviours. The service type (`INpcService`) and behaviour helpers live in
   * `@sharpee/stdlib`.
   */
  getNpcService(): INpcService {
    return this.service;
  }
}
