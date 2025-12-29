/**
 * GDT Alter Object Command (AO)
 *
 * Moves any object to any location.
 * Usage: AO <object-id> <location-id>
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';

export const aoHandler: GDTCommandHandler = {
  code: 'AO',
  name: 'Alter Object',
  description: 'Move object to location (AO <object-id> <location-id>)',

  execute(context: GDTContext, args: string[]): GDTCommandResult {
    if (args.length < 2) {
      return {
        success: false,
        output: [
          'Usage: AO <object-id> <location-id>',
          '',
          'Special locations:',
          '  player - Move to player inventory',
          '  here   - Move to current room',
          '  <room-id> - Move to specific room',
          '  <object-id> - Move into container/supporter'
        ],
        error: 'MISSING_ARGS'
      };
    }

    const objectId = args[0];
    let locationId = args[1];

    // Find the object
    const entity = context.findEntity(objectId);
    if (!entity) {
      return {
        success: false,
        output: [`Object not found: ${objectId}`],
        error: 'OBJECT_NOT_FOUND'
      };
    }

    // Handle special location 'here'
    if (locationId === 'here') {
      const currentRoom = context.getPlayerLocation();
      if (!currentRoom) {
        return {
          success: false,
          output: ['Player has no current location'],
          error: 'NO_LOCATION'
        };
      }
      locationId = currentRoom.id;
    }

    // Find the location (unless it's 'player' or 'inventory')
    let targetName = locationId;
    if (locationId !== 'player' && locationId !== 'inventory') {
      const location = context.findEntity(locationId);
      if (!location) {
        return {
          success: false,
          output: [`Location not found: ${locationId}`],
          error: 'LOCATION_NOT_FOUND'
        };
      }
      const locIdentity = location.get('identity') as { name?: string } | undefined;
      targetName = locIdentity?.name ?? location.id;
      locationId = location.id;
    } else {
      targetName = 'player inventory';
    }

    // Move the object
    const success = context.moveObject(entity.id, locationId);

    if (!success) {
      return {
        success: false,
        output: [`Failed to move ${entity.id} to ${locationId}`],
        error: 'MOVE_FAILED'
      };
    }

    const identity = entity.get('identity') as { name?: string } | undefined;
    return {
      success: true,
      output: [`Moved: ${identity?.name ?? entity.id} -> ${targetName}`]
    };
  }
};
