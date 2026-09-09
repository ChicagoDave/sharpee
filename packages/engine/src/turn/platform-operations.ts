/**
 * The platform-operations stage: drain the requests the turn queued
 * (save, restore, quit, restart, undo, again) before the prose renders.
 *
 * Requests reach the pending list from the action's events and from
 * plugin batches; the dispatcher runs them and their completion events
 * join the turn's stored events, so the result's events are refreshed
 * from the store afterward.
 *
 * Public interface: `platformOperationsStage`, `processPlatformOperations`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-334 D3 (the one dispatcher both paths call).
 */

import { dispatchPlatformOperations } from './platform-dispatcher.js';
import type { TurnStage, TurnEngine } from './context.js';

/**
 * Drain the pending platform requests and run them through the one
 * dispatcher, delivering each completion event to the event source, the
 * turn's stored events, and the engine's emitter.
 *
 * The pending list is taken at the start, before any operation runs:
 * AGAIN re-enters `executeTurn`, and that nested turn must not see the
 * same requests or it would repeat itself.
 * @param engine the turn-facing engine surface
 * @param turn the turn whose stored events receive the completions; the current turn when omitted
 */
export async function processPlatformOperations(engine: TurnEngine, turn?: number): Promise<void> {
  const currentTurn = turn ?? engine.context.currentTurn;

  const opsToProcess = engine.drainPendingPlatformOperations();

  await dispatchPlatformOperations(opsToProcess, engine.platformOperationHost(), (event) => {
    engine.eventSource.emit(event);
    engine.storeTurnEvents(currentTurn, [event]);
    // Also emit through engine's event emitter for tests
    engine.emit('event', event);
  });
}

export const platformOperationsStage: TurnStage = {
  name: 'platform-operations',
  requires: ['enrich-events', 'plugin-tick'],
  async run(context) {
    const { engine, turn } = context;
    if (engine.pendingPlatformOps.length > 0) {
      await processPlatformOperations(engine, turn);
      context.result!.events = engine.turnEventsOf(turn);
    }
    return 'continue';
  }
};
