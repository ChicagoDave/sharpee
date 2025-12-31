/**
 * GDT Display Room Command (DR)
 *
 * Shows room properties, exits, and contents.
 * Usage: DR [room-id] (defaults to current room)
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';
import { RoomTrait, DirectionType } from '@sharpee/world-model';

export const drHandler: GDTCommandHandler = {
  code: 'DR',
  name: 'Display Room',
  description: 'Show room properties (DR [room-id])',

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

    const identity = room.get('identity') as { name?: string; description?: string } | undefined;
    const roomTrait = room.get('room') as RoomTrait | undefined;

    // Header
    output.push('=== ROOM ===');
    output.push('');
    output.push(`ID: ${room.id}`);
    output.push(`Name: ${identity?.name ?? '<unnamed>'}`);

    // Room properties
    if (roomTrait) {
      output.push('');
      output.push('Properties:');
      output.push(`  Visited: ${roomTrait.visited ? 'yes' : 'no'}`);
      output.push(`  Dark: ${roomTrait.isDark ? 'YES' : 'no'}`);
      output.push(`  Outdoors: ${roomTrait.isOutdoors ? 'yes' : 'no'}`);
      output.push(`  Underground: ${roomTrait.isUnderground ? 'yes' : 'no'}`);
      if (roomTrait.region) {
        output.push(`  Region: ${roomTrait.region}`);
      }
      if (roomTrait.tags && roomTrait.tags.length > 0) {
        output.push(`  Tags: ${roomTrait.tags.join(', ')}`);
      }
    }

    // Exits
    output.push('');
    output.push('Exits:');
    if (roomTrait?.exits) {
      const exitEntries = Object.entries(roomTrait.exits) as [DirectionType, { destination: string; via?: string }][];
      if (exitEntries.length === 0) {
        output.push('  <none>');
      } else {
        for (const [dir, exit] of exitEntries) {
          const destRoom = context.findRoom(exit.destination);
          const destName = destRoom
            ? (destRoom.get('identity') as { name?: string } | undefined)?.name ?? exit.destination
            : exit.destination;
          let exitLine = `  ${dir.toUpperCase()}: ${destName}`;
          if (exit.via) {
            exitLine += ` (via ${exit.via})`;
          }
          output.push(exitLine);
        }
      }
    } else {
      output.push('  <none>');
    }

    // Contents
    const contents = context.world.getContents(room.id);
    output.push('');
    output.push('Contents:');
    if (contents.length === 0) {
      output.push('  <empty>');
    } else {
      for (const item of contents) {
        const itemIdentity = item.get('identity') as { name?: string } | undefined;
        const traits = Array.from(item.traits.keys()).filter(t => t !== 'identity');
        const traitStr = traits.length > 0 ? ` [${traits.join(', ')}]` : '';
        output.push(`  - ${itemIdentity?.name ?? item.id} (${item.id})${traitStr}`);
      }
    }

    return {
      success: true,
      output
    };
  }
};
