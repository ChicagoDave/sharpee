/**
 * NpcPlugin - Wraps NPC service as a TurnPlugin (ADR-070, ADR-120)
 *
 * Priority 100: Runs before scheduler (50) and state machines (75).
 * NPCs act immediately after the player's action.
 */

import { ISemanticEvent } from '@sharpee/core';
import { TurnPlugin, TurnPluginContext } from '@sharpee/plugins';
import { INpcService, createNpcService, guardBehavior, passiveBehavior } from '@sharpee/stdlib';

export class NpcPlugin implements TurnPlugin {
  id = 'sharpee.plugin.npc';
  priority = 100;
  private service: INpcService;

  constructor() {
    this.service = createNpcService();
    // Register standard NPC behaviors (ADR-070)
    this.service.registerBehavior(guardBehavior);
    this.service.registerBehavior(passiveBehavior);
  }

  onAfterAction(ctx: TurnPluginContext): ISemanticEvent[] {
    return this.service.tick({
      world: ctx.world,
      turn: ctx.turn,
      random: ctx.random,
      playerLocation: ctx.playerLocation,
      playerId: ctx.playerId
    });
  }

  /** NPC state lives in entity traits/metadata - no plugin-level state needed */
  getState(): unknown {
    return {};
  }

  setState(_state: unknown): void {
    // No-op: NPC state is stored in world model entities
  }

  /** Public access for stories that need to register NPC behaviors */
  getNpcService(): INpcService {
    return this.service;
  }
}
