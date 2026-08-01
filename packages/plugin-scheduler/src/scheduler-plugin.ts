/**
 * SchedulerPlugin - Wraps SchedulerService as a TurnPlugin (ADR-120)
 *
 * Priority 50: Runs after NPCs (100) and state machines (75).
 * Daemons and fuses are background temporal events.
 */

import { ISemanticEvent } from '@sharpee/core';
import { TurnPlugin, TurnPluginContext } from '@sharpee/plugins';
import { ISchedulerService, createSchedulerService } from './scheduler-service.js';
import { SchedulerState } from './types.js';

export class SchedulerPlugin implements TurnPlugin {
  id = 'sharpee.plugin.scheduler';
  priority = 50;
  private service: ISchedulerService;

  constructor(seed?: number) {
    this.service = createSchedulerService(seed);
  }

  onAfterAction(ctx: TurnPluginContext): ISemanticEvent[] {
    return this.service.tick(ctx.world, ctx.turn, ctx.playerId).events;
  }

  getState(): unknown {
    return this.service.getState();
  }

  setState(state: unknown): void {
    this.service.setState(state as SchedulerState);
  }

  /**
   * Reseed the scheduler's internal stream from the session seed
   * (ADR-293). Called by the engine before the first turn, which makes
   * daemon draws seed-reproducible; a later `setState` (save restore)
   * still wins, since it runs after and carries the saved stream state.
   */
  onSessionSeed(seed: number): void {
    this.service.getRandom().setSeed(seed);
  }

  /** Public access for stories that need daemon/fuse registration */
  getScheduler(): ISchedulerService {
    return this.service;
  }
}
