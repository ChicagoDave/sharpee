/**
 * GDT Take Command (TK)
 *
 * Acquires any object directly into inventory, bypassing all checks.
 * Usage: TK <object-id>
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';

export const tkHandler: GDTCommandHandler = {
  code: 'TK',
  name: 'Take',
  description: 'Acquire any object (TK <object-id>)',

  execute(context: GDTContext, args: string[]): GDTCommandResult {
    if (args.length === 0) {
      return {
        success: false,
        output: ['Usage: TK <object-id or name>'],
        error: 'MISSING_ARG'
      };
    }

    // Join all args to support multi-word names like "brass lantern"
    const targetId = args.join(' ');
    const entity = context.findEntity(targetId);

    if (!entity) {
      return {
        success: false,
        output: [`Object not found: ${targetId}`],
        error: 'NOT_FOUND'
      };
    }

    // Check if it's a room - can't take rooms
    if (entity.has('room')) {
      return {
        success: false,
        output: [`Cannot take a room: ${targetId}`],
        error: 'INVALID_TARGET'
      };
    }

    // Move to player inventory
    const success = context.moveObject(entity.id, 'player');

    if (!success) {
      return {
        success: false,
        output: [`Failed to take: ${entity.id}`],
        error: 'MOVE_FAILED'
      };
    }

    const identity = entity.get('identity') as { name?: string } | undefined;
    return {
      success: true,
      output: [`Taken: ${identity?.name ?? entity.id} (${entity.id})`]
    };
  }
};
