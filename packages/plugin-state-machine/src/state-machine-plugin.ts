/**
 * StateMachinePlugin - Wraps state machine registry as a TurnPlugin (ADR-119, ADR-120)
 *
 * Priority 75: Runs after NPCs (100) but before scheduler (50).
 * Evaluates state machine transitions after each successful player action.
 */

import { ISemanticEvent } from '@sharpee/core';
import { TurnPlugin, TurnPluginContext } from '@sharpee/plugins';
import { StateMachineRegistry } from './state-machine-runtime.js';
import { EvaluationContext, StateMachineRegistryState } from './types.js';

/**
 * The {@link TurnPlugin} that drives declarative state machines (ADR-119).
 *
 * Runs at priority 75 — after NPC behaviour (100), before the scheduler (50).
 * Each turn it evaluates every machine in its {@link StateMachineRegistry} and
 * returns the events produced by any transitions that fired. Register the
 * plugin with the engine, then add machines via {@link getRegistry}.
 */
export class StateMachinePlugin implements TurnPlugin {
  /** Stable plugin id. */
  id = 'sharpee.plugin.state-machine';
  /** Run order within a turn (after NPCs, before the scheduler). */
  priority = 75;
  private registry: StateMachineRegistry;

  constructor() {
    this.registry = new StateMachineRegistry();
  }

  /** Evaluate all registered machines for this turn and return their events. */
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

  /** Serialize all machine instances for saving. */
  getState(): unknown {
    return this.registry.getState();
  }

  /** Restore machine instances from a prior {@link getState} result on load. */
  setState(state: unknown): void {
    this.registry.setState(state as StateMachineRegistryState);
  }

  /** The registry where stories add and inspect their state machines. */
  getRegistry(): StateMachineRegistry {
    return this.registry;
  }
}
