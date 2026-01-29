/**
 * LocationDaemon - runs only when the player is in specific rooms (ADR-123).
 */

import { ISemanticEvent, EntityId } from '@sharpee/core';
import { DaemonRunner } from './daemon-runner';
import { SchedulerContext } from '../types';

export abstract class LocationDaemon extends DaemonRunner {
  /** Room(s) where this daemon is active */
  abstract readonly roomIds: EntityId[];

  /** Perform the daemon's work when player is in a matching room */
  abstract execute(context: SchedulerContext): ISemanticEvent[];

  shouldRun(context: SchedulerContext): boolean {
    return this.roomIds.includes(context.playerLocation);
  }
}
