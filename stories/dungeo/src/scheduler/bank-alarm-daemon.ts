/**
 * Bank Alarm Daemon - ADR-071
 *
 * Implements the Safety Depository alarm system:
 * - Blocks exits (E, W, S) when player is carrying bank treasures
 * - Unblocks exits when player is NOT carrying bank treasures
 *
 * The alarm message: "An alarm rings briefly, and an invisible force prevents you from leaving."
 */

import { ISchedulerService, SchedulerContext, Daemon } from '@sharpee/engine';
import { WorldModel, RoomBehavior, Direction, ContainerTrait } from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';
import { BankRoomIds } from '../regions/bank-of-zork';

// Treasure IDs we check for
const BANK_TREASURE_IDS = ['portrait', 'zorkmid-bills'];

// Alarm message
const ALARM_MESSAGE = 'An alarm rings briefly, and an invisible force prevents you from leaving.';

// State key for tracking alarm state
const ALARM_STATE_KEY = 'dungeo.bank.alarm.active';

/**
 * Check if player is carrying any bank treasures
 */
function isCarryingBankTreasures(world: WorldModel, playerId: string): boolean {
  const player = world.getEntity(playerId);
  if (!player) return false;

  // Get player's inventory
  const contents = world.getContents(playerId);

  for (const item of contents) {
    const treasureId = (item as any).treasureId;
    if (treasureId && BANK_TREASURE_IDS.includes(treasureId)) {
      return true;
    }
  }

  return false;
}

/**
 * Register the bank alarm daemon
 */
export function registerBankAlarmDaemon(
  scheduler: ISchedulerService,
  world: WorldModel,
  bankRoomIds: BankRoomIds
): void {
  const safetyDepositId = bankRoomIds.safetyDeposit;

  const daemon: Daemon = {
    id: 'bank-alarm',
    name: 'Bank of Zork Alarm System',
    priority: 100, // High priority - run before other daemons

    // Only run when player is in Safety Depository
    condition: (context: SchedulerContext): boolean => {
      return context.playerLocation === safetyDepositId;
    },

    run: (context: SchedulerContext): ISemanticEvent[] => {
      const { world, playerId, playerLocation } = context;

      // Get current alarm state
      const alarmActive = world.getStateValue(ALARM_STATE_KEY) || false;

      // Check if player is carrying bank treasures
      const carryingTreasures = isCarryingBankTreasures(world, playerId);

      const safetyDeposit = world.getEntity(safetyDepositId);
      if (!safetyDeposit) return [];

      if (carryingTreasures && !alarmActive) {
        // Block exits
        RoomBehavior.blockExit(safetyDeposit, Direction.EAST, ALARM_MESSAGE);
        RoomBehavior.blockExit(safetyDeposit, Direction.WEST, ALARM_MESSAGE);
        RoomBehavior.blockExit(safetyDeposit, Direction.SOUTH, ALARM_MESSAGE);
        world.setStateValue(ALARM_STATE_KEY, true);
      } else if (!carryingTreasures && alarmActive) {
        // Unblock exits
        RoomBehavior.unblockExit(safetyDeposit, Direction.EAST);
        RoomBehavior.unblockExit(safetyDeposit, Direction.WEST);
        RoomBehavior.unblockExit(safetyDeposit, Direction.SOUTH);
        world.setStateValue(ALARM_STATE_KEY, false);
      }

      // No events to emit - blocking is silent until player tries to leave
      return [];
    }
  };

  scheduler.registerDaemon(daemon);
}

/**
 * Check if the bank alarm is currently active
 */
export function isBankAlarmActive(world: WorldModel): boolean {
  return world.getStateValue(ALARM_STATE_KEY) || false;
}
