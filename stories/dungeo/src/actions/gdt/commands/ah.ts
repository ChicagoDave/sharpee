/**
 * GDT Alter Here Command (AH)
 *
 * Teleports the player to any room.
 * Usage: AH <room-id>
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';

export const ahHandler: GDTCommandHandler = {
  code: 'AH',
  name: 'Alter Here',
  description: 'Teleport player to room (AH <room-id>)',

  execute(context: GDTContext, args: string[]): GDTCommandResult {
    if (args.length === 0) {
      // Show list of available rooms
      const rooms = context.listRooms();
      const output = ['Usage: AH <room-id>', '', 'Available rooms:'];

      // Group by region if available
      const byRegion = new Map<string, { id: string; name: string }[]>();

      for (const room of rooms) {
        const identity = room.get('identity') as { name?: string } | undefined;
        const roomTrait = room.get('room') as { region?: string } | undefined;
        const region = roomTrait?.region ?? 'Other';

        if (!byRegion.has(region)) {
          byRegion.set(region, []);
        }
        byRegion.get(region)!.push({
          id: room.id,
          name: identity?.name ?? room.id
        });
      }

      // Sort regions alphabetically
      const sortedRegions = Array.from(byRegion.keys()).sort();

      for (const region of sortedRegions) {
        output.push(`  [${region}]`);
        const roomsInRegion = byRegion.get(region)!;
        for (const r of roomsInRegion.slice(0, 10)) {
          output.push(`    ${r.id}: ${r.name}`);
        }
        if (roomsInRegion.length > 10) {
          output.push(`    ... and ${roomsInRegion.length - 10} more`);
        }
      }

      return {
        success: true,
        output
      };
    }

    const targetId = args[0];
    const room = context.findRoom(targetId);

    if (!room) {
      return {
        success: false,
        output: [`Room not found: ${targetId}`],
        error: 'NOT_FOUND'
      };
    }

    const success = context.teleportPlayer(room.id);

    if (!success) {
      return {
        success: false,
        output: [`Failed to teleport to: ${room.id}`],
        error: 'TELEPORT_FAILED'
      };
    }

    const identity = room.get('identity') as { name?: string } | undefined;
    return {
      success: true,
      output: [`Teleported to: ${identity?.name ?? room.id} (${room.id})`]
    };
  }
};
