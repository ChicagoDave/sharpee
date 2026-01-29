/**
 * CountdownDaemon - fires after a fixed number of turns (ADR-123).
 *
 * Like a Fuse but with full daemon lifecycle, encapsulated state,
 * and an optional tick condition.
 */

import { ISemanticEvent } from '@sharpee/core';
import { DaemonRunner } from './daemon-runner';
import { SchedulerContext } from '../types';

export abstract class CountdownDaemon extends DaemonRunner {
  protected turnsRemaining: number;

  constructor(turns: number) {
    super();
    this.turnsRemaining = turns;
  }

  /** Called when countdown reaches zero */
  abstract onCountdownComplete(context: SchedulerContext): ISemanticEvent[];

  /** Optional: condition that must hold for the countdown to tick */
  tickCondition?(context: SchedulerContext): boolean;

  getRunnerState(): Record<string, unknown> {
    return { turnsRemaining: this.turnsRemaining };
  }

  restoreRunnerState(state: Record<string, unknown>): void {
    if (typeof state.turnsRemaining === 'number') this.turnsRemaining = state.turnsRemaining;
  }

  shouldRun(_context: SchedulerContext): boolean {
    return this.turnsRemaining > 0;
  }

  execute(context: SchedulerContext): ISemanticEvent[] {
    if (this.tickCondition && !this.tickCondition(context)) return [];

    this.turnsRemaining--;
    if (this.turnsRemaining <= 0) {
      return this.onCountdownComplete(context);
    }
    return [];
  }
}
