/**
 * Rainbow State Machine
 *
 * Tracks whether the rainbow at Aragain Falls is solid (walkable) or not.
 * Waving the sharp stick at the falls emits solidified/dismissed events;
 * this machine reacts by toggling room exits accordingly.
 *
 * States:
 *   inactive → rainbow is insubstantial (default)
 *   active   → rainbow is solid, player can walk east
 *
 * Replaces: exit manipulation logic formerly in wave-action.ts execute phase
 */

import { StateMachineDefinition, CustomEffect } from '@sharpee/plugin-state-machine';
import { RoomTrait, Direction } from '@sharpee/world-model';

export const RAINBOW_SOLIDIFIED_EVENT = 'dungeo.event.rainbow.solidified';
export const RAINBOW_DISMISSED_EVENT = 'dungeo.event.rainbow.dismissed';

const BLOCKED_MESSAGE = 'The rainbow is beautiful, but it looks far too insubstantial to walk on.';

function makeSolidifyEffect(): CustomEffect {
  return {
    type: 'custom',
    execute: (world, bindings, _playerId) => {
      const aragainFalls = world.getEntity(bindings['$aragainFalls']);
      const onTheRainbowId = bindings['$onTheRainbow'];

      if (aragainFalls && onTheRainbowId) {
        const roomTrait = aragainFalls.get(RoomTrait);
        if (roomTrait) {
          roomTrait.exits[Direction.EAST] = { destination: onTheRainbowId };
          if (roomTrait.blockedExits) {
            delete roomTrait.blockedExits[Direction.EAST];
          }
        }
      }

      return {};
    },
  };
}

function makeDismissEffect(): CustomEffect {
  return {
    type: 'custom',
    execute: (world, bindings, _playerId) => {
      const aragainFalls = world.getEntity(bindings['$aragainFalls']);

      if (aragainFalls) {
        const roomTrait = aragainFalls.get(RoomTrait);
        if (roomTrait) {
          delete roomTrait.exits[Direction.EAST];
          if (!roomTrait.blockedExits) roomTrait.blockedExits = {};
          roomTrait.blockedExits[Direction.EAST] = BLOCKED_MESSAGE;
        }
      }

      return {};
    },
  };
}

export function createRainbowMachine(): StateMachineDefinition {
  return {
    id: 'dungeo.rainbow',
    description: 'Tracks rainbow solid/insubstantial state at Aragain Falls',
    initialState: 'inactive',

    states: {
      inactive: {
        description: 'Rainbow is insubstantial — cannot walk on it',
        transitions: [{
          target: 'active',
          trigger: {
            type: 'event',
            eventId: RAINBOW_SOLIDIFIED_EVENT,
          },
          effects: [
            { type: 'set_state', key: 'dungeo.rainbow.active', value: true },
            makeSolidifyEffect(),
          ],
        }],
      },

      active: {
        description: 'Rainbow is solid — player can walk east',
        transitions: [{
          target: 'inactive',
          trigger: {
            type: 'event',
            eventId: RAINBOW_DISMISSED_EVENT,
          },
          effects: [
            { type: 'set_state', key: 'dungeo.rainbow.active', value: false },
            makeDismissEffect(),
          ],
        }],
      },
    },
  };
}
