/**
 * StateMachinePlugin - Wraps state machine registry as a TurnPlugin (ADR-119, ADR-120)
 *
 * Priority 75: Runs after NPCs (100) but before scheduler (50).
 * Evaluates state machine transitions after each successful player action.
 */

import { ISemanticEvent } from '@sharpee/core';
import { TurnPlugin, TurnPluginContext } from '@sharpee/plugins';
import { StateMachineRegistry } from './state-machine-runtime';
import { EvaluationContext, StateMachineRegistryState } from './types';

export class StateMachinePlugin implements TurnPlugin {
  id = 'sharpee.plugin.state-machine';
  priority = 75;
  private registry: StateMachineRegistry;

  constructor() {
    this.registry = new StateMachineRegistry();
  }

  onAfterAction(ctx: TurnPluginContext): ISemanticEvent[] {
    const evalCtx: EvaluationContext = {
      world: ctx.world,
      playerId: ctx.playerId,
      playerLocation: ctx.playerLocation,
      turn: ctx.turn,
      actionId: ctx.actionResult?.actionId,
      actionTargetId: ctx.actionResult?.targetId,
      actionEvents: ctx.actionEvents?.map(e => ({
        type: e.type,
        data: e.data,
        entities: e.entities as Record<string, string>,
      })),
    };

    return this.registry.evaluate(evalCtx);
  }

  getState(): unknown {
    return this.registry.getState();
  }

  setState(state: unknown): void {
    this.registry.setState(state as StateMachineRegistryState);
  }

  getRegistry(): StateMachineRegistry {
    return this.registry;
  }
}
