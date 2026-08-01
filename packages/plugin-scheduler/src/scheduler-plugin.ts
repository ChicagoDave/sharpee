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

  constructor() {
    this.service = createSchedulerService();
  }

  onAfterAction(ctx: TurnPluginContext): ISemanticEvent[] {
    // ADR-293: the scheduler owns no stream — daemons draw through declared
    // points on the session RandomService threaded from the turn context.
    return this.service.tick(ctx.world, ctx.turn, ctx.playerId, ctx.random).events;
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
