/**
 * GDT Display Exits Command (DX)
 *
 * Shows detailed exit information for a room.
 * Usage: DX [room-id] (defaults to current room)
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';
import { RoomTrait, DirectionType } from '@sharpee/world-model';

export const dxHandler: GDTCommandHandler = {
  code: 'DX',
  name: 'Display Exits',
  description: 'Show room exits in detail (DX [room-id])',

  execute(context: GDTContext, args: string[]): GDTCommandResult {
    const output: string[] = [];

    // Find the room to display
    let room;
    if (args.length > 0) {
      room = context.findRoom(args[0]);
      if (!room) {
        return {
          success: false,
          output: [`Room not found: ${args[0]}`],
          error: 'NOT_FOUND'
        };
      }
    } else {
      room = context.getPlayerLocation();
      if (!room) {
        return {
          success: false,
          output: ['Player has no location'],
          error: 'NO_LOCATION'
        };
      }
    }

    const identity = room.get('identity') as { name?: string } | undefined;
    const roomTrait = room.get('room') as RoomTrait | undefined;

    // Header
    output.push('=== EXITS ===');
    output.push('');
    output.push(`Room: ${identity?.name ?? room.id} (${room.id})`);
    output.push('');

    // All directions
    const allDirections: DirectionType[] = [
      'NORTH', 'SOUTH', 'EAST', 'WEST',
      'NORTHEAST', 'NORTHWEST', 'SOUTHEAST', 'SOUTHWEST',
      'UP', 'DOWN', 'IN', 'OUT'
    ];

    const exits = roomTrait?.exits ?? {};
    const blockedExits = roomTrait?.blockedExits ?? {};

    for (const dir of allDirections) {
      const exit = exits[dir];
      const blocked = blockedExits[dir];

      if (exit) {
        const destRoom = context.findRoom(exit.destination);
        const destIdentity = destRoom?.get('identity') as { name?: string } | undefined;
        const destName = destIdentity?.name ?? exit.destination;

        let line = `  ${dir.padEnd(10)} -> ${destName} (${exit.destination})`;

        if (exit.via) {
          const viaEntity = context.findEntity(exit.via);
          const viaIdentity = viaEntity?.get('identity') as { name?: string } | undefined;
          const viaName = viaIdentity?.name ?? exit.via;
          line += ` [via: ${viaName}]`;

          // Check door state if applicable
          if (viaEntity) {
            const openable = viaEntity.get('openable') as { isOpen?: boolean } | undefined;
            const lockable = viaEntity.get('lockable') as { isLocked?: boolean } | undefined;
            if (openable) {
              line += openable.isOpen ? ' (open)' : ' (closed)';
            }
            if (lockable?.isLocked) {
              line += ' (LOCKED)';
            }
          }
        }
        output.push(line);
      } else if (blocked) {
        output.push(`  ${dir.padEnd(10)} -> BLOCKED: ${blocked}`);
      }
    }

    // Count exits
    const exitCount = Object.keys(exits).length;
    output.push('');
    output.push(`Total exits: ${exitCount}`);

    return {
      success: true,
      output
    };
  }
};
