/**
 * StateMachinePlugin - Wraps state machine registry as a TurnPlugin (ADR-119, ADR-120)
 *
 * Public interface: `StateMachinePlugin`, `StateMachinePluginOptions`.
 * Owner context: plugin-state-machine, the one turn host for every machine
 * a story runs: its own `define machine` blocks and each vehicle's built-in
 * machine (ADR-377 D3). Evaluates state machine transitions after each
 * successful player action, then steps every vehicle.
 */

import { type ISemanticEvent } from '@sharpee/core';
import { TURN_BANDS, type TurnPlugin, type TurnPluginContext } from '@sharpee/plugins';
import { StateMachineRegistry } from './state-machine-runtime.js';
import { EvaluationContext, StateMachineRegistryState } from './types.js';
import { tickVehicles, type VehiclePositionResolver } from './vehicle-machine.js';

/** What the host lends the plugin's vehicle phase. */
export interface StateMachinePluginOptions {
  /**
   * The host's reading of a `drive: state` line's `position` block (ADR-366
   * D5a). Omit when the host lowers no state-driven lines; every other
   * model steps without it.
   */
  vehiclePosition?: VehiclePositionResolver;
}

/**
 * The {@link TurnPlugin} that drives declarative state machines (ADR-119).
 *
 * Platform-phases band (ADR-332): after the scheduler's story reactions and
 * the actor phase, before scene evaluation — a machine reacts to what the
 * turn did.
 * Each turn it evaluates every machine in its {@link StateMachineRegistry},
 * then steps every vehicle's built-in machine (ADR-366 D5e, ADR-377 D3),
 * and returns the events both produced. Register the plugin with the
 * engine, then add machines via {@link getRegistry}.
 */
export class StateMachinePlugin implements TurnPlugin {
  /** Stable plugin id. */
  id = 'sharpee.plugin.state-machine';
  /** Run order within a turn: after the actor phase, before scene evaluation (ADR-332). */
  priority = TURN_BANDS.platformPhases.floor + 40;
  private registry: StateMachineRegistry;
  private readonly vehiclePosition?: VehiclePositionResolver;

  constructor(options: StateMachinePluginOptions = {}) {
    this.registry = new StateMachineRegistry();
    if (options.vehiclePosition) this.vehiclePosition = options.vehiclePosition;
  }

  /**
   * Evaluate all registered machines for this turn, then step every
   * vehicle's machine, and return the events of both in that order.
   */
  onAfterAction(ctx: TurnPluginContext): ISemanticEvent[] {
    const evalCtx: EvaluationContext = {
      world: ctx.world,
      playerId: ctx.playerId,
      playerLocation: ctx.playerLocation,
      turn: ctx.turn,
      actionId: ctx.actionResult?.actionId,
      // Genuine success only (Phase 7): action triggers require this, so a
      // refused/blocked action never advances a machine.
      actionSucceeded: ctx.actionResult?.success,
      actionTargetId: ctx.actionResult?.targetId,
      actionEvents: ctx.actionEvents?.map(e => ({
        type: e.type,
        data: e.data,
        entities: e.entities as Record<string, string>,
      })),
    };

    return [
      ...this.registry.evaluate(evalCtx),
      ...tickVehicles(ctx.world, ctx.playerId, ctx.random, { positionOf: this.vehiclePosition }),
    ];
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
