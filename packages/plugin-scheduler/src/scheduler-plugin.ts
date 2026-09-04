/**
 * SchedulerPlugin - Wraps SchedulerService as a TurnPlugin (ADR-120)
 *
 * Story-reactions band (ADR-332): runs FIRST after the player's action —
 * every Chord timer, every-turn and sequence clause rides here, so what the
 * author wrote happens before the platform's phases read the world.
 */

import { type ISemanticEvent } from '@sharpee/core';
import { TURN_BANDS, type TurnPlugin, type TurnPluginContext } from '@sharpee/plugins';
import { ISchedulerService, createSchedulerService } from './scheduler-service.js';
import { SchedulerState } from './types.js';

export class SchedulerPlugin implements TurnPlugin {
  id = 'sharpee.plugin.scheduler';
  priority = TURN_BANDS.storyReactions.floor + 50;
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
