/**
 * SchedulerPlugin - Wraps SchedulerService as a TurnPlugin (ADR-120)
 *
 * Priority 50: Runs after NPCs (100) and state machines (75).
 * Daemons and fuses are background temporal events.
 */

import { ISemanticEvent } from '@sharpee/core';
import { TurnPlugin, TurnPluginContext } from '@sharpee/plugins';
import { ISchedulerService, createSchedulerService } from './scheduler-service';
import { SchedulerState } from './types';

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

  /** Public access for stories that need daemon/fuse registration */
  getScheduler(): ISchedulerService {
    return this.service;
  }
}
