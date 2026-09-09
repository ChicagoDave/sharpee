/**
 * The platform-operations stage: drain the requests the turn queued
 * (save, restore, quit, restart, undo, again) before the prose renders.
 *
 * Requests reach the pending list from the action's events and from
 * plugin batches; the dispatcher runs them and their completion events
 * join the turn's stored events, so the result's events are refreshed
 * from the store afterward.
 *
 * Public interface: `platformOperationsStage`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-334 D3 (the one dispatcher both paths call).
 */

import type { TurnStage } from './context.js';

export const platformOperationsStage: TurnStage = {
  name: 'platform-operations',
  requires: ['enrich-events', 'plugin-tick'],
  async run(context) {
    const { engine, turn } = context;
    if (engine.pendingPlatformOps.length > 0) {
      await engine.processPlatformOperations(turn);
      context.result!.events = engine.turnEvents.get(turn) || [];
    }
    return 'continue';
  }
};
