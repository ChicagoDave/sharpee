/**
 * NpcPlugin - Wraps NPC service as a TurnPlugin (ADR-070, ADR-120)
 *
 * Priority 100: Runs before scheduler (50) and state machines (75).
 * NPCs act immediately after the player's action.
 */

import { ISemanticEvent } from '@sharpee/core';
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

  /** Tick the NPC service for this turn and return the events NPCs produced. */
  onAfterAction(ctx: TurnPluginContext): ISemanticEvent[] {
    return this.service.tick({
      world: ctx.world,
      turn: ctx.turn,
      random: ctx.random,
      playerLocation: ctx.playerLocation,
      playerId: ctx.playerId
    });
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
