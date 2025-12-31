/**
 * Walk Through Action
 *
 * Handles the Bank of Zork puzzle where players can walk through
 * the shimmering curtain and various walls.
 *
 * Mechanic:
 * - Walk through curtain (from Safety Depository) → Small Room OR Viewing Room
 * - Walk through south wall (from Small Room) → Safety Depository (sets curtain to Viewing Room)
 * - Walk through north wall (from Safety Depository) → Vault
 * - Walk through north wall (from Vault) → Safety Depository
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait } from '@sharpee/world-model';
import {
  WALK_THROUGH_ACTION_ID,
  BANK_PUZZLE_STATE_KEY,
  BankPuzzleState,
  DEFAULT_BANK_PUZZLE_STATE,
  BankPuzzleMessages
} from './types';

// Bank room IDs state key
const BANK_ROOM_IDS_KEY = 'dungeo.bank.roomIds';

/**
 * Get the bank puzzle state from world
 */
function getBankPuzzleState(world: any): BankPuzzleState {
  return world.getStateValue(BANK_PUZZLE_STATE_KEY) || { ...DEFAULT_BANK_PUZZLE_STATE };
}

/**
 * Set the bank puzzle state on world
 */
function setBankPuzzleState(world: any, state: BankPuzzleState): void {
  world.setStateValue(BANK_PUZZLE_STATE_KEY, state);
}

/**
 * Get bank room IDs from world state
 */
function getBankRoomIds(world: any): Record<string, string> | undefined {
  return world.getStateValue(BANK_ROOM_IDS_KEY);
}

/**
 * Determine what the player is trying to walk through
 */
function getWalkThroughTarget(context: ActionContext): string | undefined {
  const command = context.command;

  // First, check the raw input from the parsed command
  const rawInput = command.parsed?.rawInput?.toLowerCase() || '';

  // Check for wall patterns in raw input
  if (rawInput.includes('north wall') || rawInput.includes('n wall')) {
    return 'north_wall';
  }
  if (rawInput.includes('south wall') || rawInput.includes('s wall')) {
    return 'south_wall';
  }

  // Check for curtain in raw input
  if (rawInput.includes('curtain')) {
    return 'curtain';
  }

  // Check for direct target (resolved entity)
  if (command.directObject?.entity) {
    const identity = command.directObject.entity.get(IdentityTrait);
    if (identity) {
      const name = identity.name.toLowerCase();
      if (name.includes('curtain') || name.includes('light')) {
        return 'curtain';
      }
      if (name.includes('north wall')) {
        return 'north_wall';
      }
      if (name.includes('south wall')) {
        return 'south_wall';
      }
    }
  }

  // Check extras.arg if present (from grammar like "walk through :arg")
  const extras = command.parsed?.extras || {};
  const arg = (extras.arg as string)?.toLowerCase() || '';
  if (arg.includes('north wall') || arg.includes('north')) {
    return 'north_wall';
  }
  if (arg.includes('south wall') || arg.includes('south')) {
    return 'south_wall';
  }
  if (arg.includes('curtain') || arg.includes('light')) {
    return 'curtain';
  }

  return undefined;
}

/**
 * Determine destination based on current room and target
 */
function getDestination(
  context: ActionContext,
  target: string,
  bankRoomIds: Record<string, string>,
  puzzleState: BankPuzzleState
): { destination: string; updateState?: Partial<BankPuzzleState> } | { error: string } {
  const currentRoomId = context.currentLocation.id;

  // Safety Depository
  if (currentRoomId === bankRoomIds.safetyDeposit) {
    if (target === 'curtain') {
      // Curtain leads to Small Room OR Viewing Room depending on state
      if (puzzleState.curtainLeadsToViewingRoom) {
        return {
          destination: bankRoomIds.viewingRoom,
          updateState: { curtainLeadsToViewingRoom: false }  // Reset after use
        };
      } else {
        return { destination: bankRoomIds.smallRoom };
      }
    }
    if (target === 'north_wall') {
      // North wall leads to Vault
      return { destination: bankRoomIds.vault };
    }
    return { error: BankPuzzleMessages.NO_WALL };
  }

  // Small Room
  if (currentRoomId === bankRoomIds.smallRoom) {
    if (target === 'south_wall') {
      // South wall leads back to Safety Depository AND sets curtain to lead to Viewing Room
      return {
        destination: bankRoomIds.safetyDeposit,
        updateState: { curtainLeadsToViewingRoom: true }
      };
    }
    return { error: BankPuzzleMessages.NO_WALL };
  }

  // Vault
  if (currentRoomId === bankRoomIds.vault) {
    if (target === 'north_wall') {
      // North wall leads back to Safety Depository
      return { destination: bankRoomIds.safetyDeposit };
    }
    return { error: BankPuzzleMessages.NO_WALL };
  }

  // Not in a bank puzzle room
  return { error: BankPuzzleMessages.CANT_WALK_THROUGH };
}

export const walkThroughAction: Action = {
  id: WALK_THROUGH_ACTION_ID,
  group: 'movement',

  validate(context: ActionContext): ValidationResult {
    const bankRoomIds = getBankRoomIds(context.world);
    if (!bankRoomIds) {
      return { valid: false, error: BankPuzzleMessages.CANT_WALK_THROUGH };
    }

    const target = getWalkThroughTarget(context);
    if (!target) {
      return { valid: false, error: BankPuzzleMessages.CANT_WALK_THROUGH };
    }

    const puzzleState = getBankPuzzleState(context.world);
    const result = getDestination(context, target, bankRoomIds, puzzleState);

    if ('error' in result) {
      return { valid: false, error: result.error, params: { direction: target.replace('_', ' ') } };
    }

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const bankRoomIds = getBankRoomIds(context.world)!;
    const target = getWalkThroughTarget(context)!;
    const puzzleState = getBankPuzzleState(context.world);
    const result = getDestination(context, target, bankRoomIds, puzzleState);

    if ('error' in result) {
      return; // Should not happen if validate passed
    }

    // Store previous location for report
    context.sharedData.previousLocation = context.currentLocation.id;
    context.sharedData.destination = result.destination;

    // Update puzzle state if needed
    if (result.updateState) {
      const newState = { ...puzzleState, ...result.updateState };
      setBankPuzzleState(context.world, newState);
    }

    // Move player to destination
    context.world.moveEntity(context.player.id, result.destination);
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const direction = result.params?.direction || 'that';
    return [context.event('action.blocked', {
      actionId: WALK_THROUGH_ACTION_ID,
      messageId: result.error,
      reason: result.error,
      params: { direction }
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const destination = context.world.getEntity(context.sharedData.destination);
    const destIdentity = destination?.get(IdentityTrait);
    const destName = destIdentity?.name || 'somewhere';
    const destDescription = destIdentity?.description || '';

    // Return the disoriented message and room description
    return [
      context.event('action.success', {
        actionId: WALK_THROUGH_ACTION_ID,
        messageId: BankPuzzleMessages.WALK_THROUGH,
        message: 'You feel somewhat disoriented as you pass through...'
      }),
      context.event('player.moved', {
        destination: context.sharedData.destination,
        destinationName: destName
      }),
      // Emit room description event so the room is displayed
      context.event('if.event.room.description', {
        roomId: context.sharedData.destination,
        roomName: destName,
        roomDescription: destDescription,
        includeContents: true,
        verbose: true
      })
    ];
  }
};
