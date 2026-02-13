/**
 * Reality Altered Handler
 *
 * Handles the "reality altered" message that appears after the thief is killed.
 * This is part of ADR-078's hidden max points system.
 *
 * When the thief dies:
 * 1. Max score changes from 616 to 650
 * 2. A flag is set to show the "reality altered" message
 * 3. On the NEXT score check, this daemon emits the message
 * 4. The flag is cleared so the message only shows once
 *
 * Implementation:
 * - Event handler on score_displayed sets a queued flag
 * - Daemon checks for queued flag and emits the message
 * - Flag is cleared after message is shown
 */

import { ISemanticEvent } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
import { ISchedulerService, Daemon, SchedulerContext } from '@sharpee/plugin-scheduler';

export const RealityAlteredMessages = {
  REALITY_ALTERED: 'dungeo.scoring.reality_altered',
} as const;

/**
 * Register the reality altered event handler
 *
 * Listens for score_displayed events and queues the reality message.
 */
export function registerRealityAlteredHandler(world: WorldModel): void {
  world.registerEventHandler('if.event.score_displayed', (_event, w) => {
    const state = w.getDataStore().state;

    // Check if we need to show the reality altered message
    if (state['dungeo.reality_altered_pending']) {
      // Clear the pending flag
      state['dungeo.reality_altered_pending'] = false;

      // Queue the message to be shown by the daemon
      state['dungeo.reality_altered_queued'] = true;
    }
  });
}

/**
 * Create and register the reality altered daemon
 *
 * This daemon checks for the queued flag and emits the message.
 * Call this from onEngineReady after getting the scheduler.
 */
export function registerRealityAlteredDaemon(scheduler: ISchedulerService): void {
  const daemon: Daemon = {
    id: 'dungeo-reality-altered',
    name: 'Reality Altered Message',
    priority: 100,  // High priority - run early in daemon phase

    condition: (context: SchedulerContext): boolean => {
      return context.world.getDataStore().state['dungeo.reality_altered_queued'] === true;
    },

    run: (context: SchedulerContext): ISemanticEvent[] => {
      // Clear the queued flag
      context.world.getDataStore().state['dungeo.reality_altered_queued'] = false;

      // Emit the reality altered message
      return [{
        id: `reality-altered-${Date.now()}`,
        type: 'game.message',
        timestamp: Date.now(),
        entities: {},
        data: {
          messageId: RealityAlteredMessages.REALITY_ALTERED
        },
        narrate: true
      }];
    }
  };

  scheduler.registerDaemon(daemon);
}
