/**
 * Reality Altered State Machine
 *
 * Handles the "reality altered" message that appears after the thief is killed
 * and the player next checks their score (ADR-078 hidden max points).
 *
 * Flow:
 *   1. Thief dies → scoring.realityAlteredPending = true (set by thief-entity.ts)
 *   2. Player types SCORE → if.event.score_displayed fires
 *   3. This machine transitions: inactive → shown
 *      - Guard checks scoring.realityAlteredPending
 *      - Effect clears the flag and emits the message
 *
 * States:
 *   inactive → waiting for thief to die and player to check score
 *   shown    → message has been displayed (terminal)
 *
 * Replaces: registerRealityAlteredHandler (event handler) and
 *           registerRealityAlteredDaemon (daemon) from reality-altered-handler.ts
 */

import { StateMachineDefinition, CustomEffect } from '@sharpee/plugin-state-machine';

export const RealityAlteredMessages = {
  REALITY_ALTERED: 'dungeo.scoring.reality_altered',
} as const;

function makeClearPendingAndMessageEffect(): CustomEffect {
  return {
    type: 'custom',
    execute: (world, _bindings, _playerId) => {
      world.getDataStore().state['dungeo.reality_altered_pending'] = false;

      return {
        messages: [{
          messageId: RealityAlteredMessages.REALITY_ALTERED,
        }],
      };
    },
  };
}

export function createRealityAlteredMachine(): StateMachineDefinition {
  return {
    id: 'dungeo.reality_altered',
    description: 'Shows "reality altered" message after thief dies and player checks score (ADR-078)',
    initialState: 'inactive',

    states: {
      inactive: {
        description: 'Waiting for thief death + score check',
        transitions: [{
          target: 'shown',
          trigger: {
            type: 'event',
            eventId: 'if.event.score_displayed',
          },
          guard: {
            type: 'custom',
            evaluate: (world, _bindings, _playerId) => {
              return world.getDataStore().state['dungeo.reality_altered_pending'] === true;
            },
          },
          effects: [
            makeClearPendingAndMessageEffect(),
          ],
        }],
      },

      shown: {
        description: 'Reality altered message has been displayed',
        terminal: true,
      },
    },
  };
}
