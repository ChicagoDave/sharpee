/**
 * WatchdogDaemon - monitors a sustained condition over multiple turns (ADR-123).
 *
 * Counts consecutive turns while conditionHolds() is true.
 * Resets counter when condition breaks. Fires onThresholdReached()
 * when turnsRequired consecutive turns have passed.
 */

import { ISemanticEvent } from '@sharpee/core';
import { DaemonRunner } from './daemon-runner';
import { SchedulerContext } from '../types';

export abstract class WatchdogDaemon extends DaemonRunner {
  protected turnCount = 0;
  protected triggered = false;

  /** How many consecutive turns the condition must hold */
  abstract readonly turnsRequired: number;

  /** The condition that must hold each turn */
  abstract conditionHolds(context: SchedulerContext): boolean;

  /** Called when turnsRequired consecutive turns have passed */
  abstract onThresholdReached(context: SchedulerContext): ISemanticEvent[];

  /** Optional: called at specific turn counts during accumulation */
  onMilestone?(turn: number, context: SchedulerContext): ISemanticEvent[];

  /** Optional: called when the counter resets (condition broke) */
  onReset?(context: SchedulerContext): void;

  getRunnerState(): Record<string, unknown> {
    return { turnCount: this.turnCount, triggered: this.triggered };
  }

  restoreRunnerState(state: Record<string, unknown>): void {
    if (typeof state.turnCount === 'number') this.turnCount = state.turnCount;
    if (typeof state.triggered === 'boolean') this.triggered = state.triggered;
  }

  shouldRun(_context: SchedulerContext): boolean {
    return !this.triggered;
  }

  execute(context: SchedulerContext): ISemanticEvent[] {
    if (!this.conditionHolds(context)) {
      if (this.turnCount > 0) {
        this.turnCount = 0;
        this.onReset?.(context);
      }
      return [];
    }

    this.turnCount++;
    const events: ISemanticEvent[] = [];

    const milestoneEvents = this.onMilestone?.(this.turnCount, context);
    if (milestoneEvents) events.push(...milestoneEvents);

    if (this.turnCount >= this.turnsRequired) {
      this.triggered = true;
      events.push(...this.onThresholdReached(context));
    }

    return events;
  }
}
