/**
 * Trapdoor Auto-Close State Machine
 *
 * When the player descends through the trap door from Living Room to Cellar,
 * the door crashes shut and is barred from above.
 *
 * Replaces: handlers/trapdoor-handler.ts (both close daemon and tracking daemon)
 *
 * Uses EventTrigger on if.event.actor_moved which includes fromRoom/toRoom,
 * eliminating the need for a prevLocation tracking daemon.
 */

import { StateMachineDefinition } from '@sharpee/plugin-state-machine';

export const TrapdoorMessages = {
  SLAMS_SHUT: 'dungeo.trapdoor.slams_shut',
} as const;

export function createTrapdoorMachine(
  livingRoomId: string,
  cellarId: string
): StateMachineDefinition {
  return {
    id: 'dungeo.puzzle.trapdoor',
    description: 'Trap door slams shut when player descends to cellar',
    initialState: 'open',

    states: {
      open: {
        description: 'Trap door is open, player can go up/down',
        transitions: [{
          target: 'barred',
          trigger: {
            type: 'event',
            eventId: 'if.event.actor_moved',
            filter: { fromRoom: livingRoomId, toRoom: cellarId },
          },
          effects: [
            // Close the trap door
            { type: 'set_trait', entityRef: '$trapdoor', trait: 'openable', property: 'isOpen', value: false },
            { type: 'set_trait', entityRef: '$trapdoor', trait: 'identity', property: 'description', value: 'The dusty cover of a closed trap door.' },
            // The UP exit from Cellar is gated by the trapdoor's via field.
            // Closing the trapdoor (above) is sufficient — the going action checks
            // the via entity's open state and blocks passage when closed.
            // Mark as barred in world state
            { type: 'set_state', key: 'dungeo.trapdoor.barred', value: true },
            // Emit slam message
            { type: 'message', messageId: TrapdoorMessages.SLAMS_SHUT },
          ],
        }],
      },

      barred: {
        description: 'Trap door barred from above',
        terminal: true,
      },
    },
  };
}
