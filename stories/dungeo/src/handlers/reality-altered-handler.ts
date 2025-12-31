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
import { WorldModel, StandardCapabilities } from '@sharpee/world-model';
import { ISchedulerService, Daemon, SchedulerContext } from '@sharpee/engine';

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
    const scoring = w.getCapability(StandardCapabilities.SCORING);
    if (!scoring) return;

    // Check if we need to show the reality altered message
    if (scoring.realityAlteredPending) {
      // Clear the pending flag
      scoring.realityAlteredPending = false;

      // Queue the message to be shown by the daemon
      scoring.realityAlteredQueued = true;
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
      const scoring = context.world.getCapability(StandardCapabilities.SCORING);
      return scoring?.realityAlteredQueued === true;
    },

    run: (context: SchedulerContext): ISemanticEvent[] => {
      const scoring = context.world.getCapability(StandardCapabilities.SCORING);
      if (!scoring) return [];

      // Clear the queued flag
      scoring.realityAlteredQueued = false;

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
