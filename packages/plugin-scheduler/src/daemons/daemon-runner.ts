/**
 * Abstract base class for typed daemons (ADR-123).
 *
 * Gives daemons proper identity, encapsulated state, and lifecycle hooks
 * while adapting to the existing plain Daemon interface via toDaemon().
 */

import { ISemanticEvent } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
import { Daemon, SchedulerContext } from '../types';

export abstract class DaemonRunner {
  abstract readonly id: string;
  abstract readonly name: string;
  readonly priority: number = 0;

  /** Override to control when this daemon is active */
  abstract shouldRun(context: SchedulerContext): boolean;

  /** Override to perform the daemon's work */
  abstract execute(context: SchedulerContext): ISemanticEvent[];

  /** Lifecycle: called when daemon is registered with the scheduler */
  onRegistered?(context: { world: WorldModel }): void;

  /** Lifecycle: called when daemon is removed from the scheduler */
  onRemoved?(): void;

  /** Return runner-specific state for save/restore serialization */
  getRunnerState(): Record<string, unknown> {
    return {};
  }

  /** Restore runner-specific state after deserialization */
  restoreRunnerState(state: Record<string, unknown>): void {
    // Subclasses override to restore their fields
    void state;
  }

  /** Adapt to the plain Daemon interface for scheduler registration */
  toDaemon(): Daemon {
    return {
      id: this.id,
      name: this.name,
      priority: this.priority,
      condition: (ctx) => this.shouldRun(ctx),
      run: (ctx) => this.execute(ctx),
      getRunnerState: () => this.getRunnerState(),
      restoreRunnerState: (s) => this.restoreRunnerState(s),
    };
  }
}
