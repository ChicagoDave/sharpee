/**
 * AmbienceDaemon - emits atmospheric messages with cooldown (ADR-123).
 *
 * Always ticks to manage the cooldown counter. Emits ambience
 * when cooldown has elapsed and shouldEmit() returns true.
 */

import { ISemanticEvent } from '@sharpee/core';
import { DaemonRunner } from './daemon-runner';
import { SchedulerContext } from '../types';

export abstract class AmbienceDaemon extends DaemonRunner {
  protected turnsSinceLastEmission = 0;

  /** Minimum turns between ambient emissions */
  abstract readonly cooldownTurns: number;

  /** Whether conditions are right for ambient emission this turn */
  abstract shouldEmit(context: SchedulerContext): boolean;

  /** Generate the ambient message(s) */
  abstract emitAmbience(context: SchedulerContext): ISemanticEvent[];

  getRunnerState(): Record<string, unknown> {
    return { turnsSinceLastEmission: this.turnsSinceLastEmission };
  }

  restoreRunnerState(state: Record<string, unknown>): void {
    if (typeof state.turnsSinceLastEmission === 'number') this.turnsSinceLastEmission = state.turnsSinceLastEmission;
  }

  shouldRun(_context: SchedulerContext): boolean {
    return true; // Always tick to manage cooldown
  }

  execute(context: SchedulerContext): ISemanticEvent[] {
    this.turnsSinceLastEmission++;

    if (this.turnsSinceLastEmission < this.cooldownTurns) return [];
    if (!this.shouldEmit(context)) return [];

    this.turnsSinceLastEmission = 0;
    return this.emitAmbience(context);
  }
}
