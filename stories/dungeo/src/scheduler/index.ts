/**
 * Dungeo Scheduler Module - ADR-071 Phase 2
 *
 * This module registers all daemons and fuses for the Dungeo story.
 * Call registerScheduledEvents() from story.onEngineReady() to wire everything up.
 */

export { DungeoSchedulerMessages, type DungeoSchedulerMessageId } from './scheduler-messages';
export { registerLanternFuse, getLanternBatteryRemaining } from './lantern-fuse';
export { registerCandleFuse, getCandleBurnRemaining } from './candle-fuse';
export {
  initializeDamState,
  isDamDrained,
  setDamDrained,
  isYellowButtonPressed,
  setYellowButtonPressed,
  registerYellowButtonHandler,
  DAM_STATE_KEY,
  type DamState
} from './dam-state';
export {
  startFlooding,
  isFloodingStarted,
  isMaintenanceFlooded,
  FloodingMessages,
  FLOODING_STATE_KEY,
  type FloodingState
} from './maintenance-room-fuse';
export { registerForestAmbienceDaemon, isForestAmbienceActive } from './forest-daemon';
export { registerBankAlarmDaemon, isBankAlarmActive } from './bank-alarm-daemon';
export { registerIncenseFuse, getIncenseBurnRemaining } from './incense-fuse';
export { registerBalloonDaemon, isBalloonDaemonActive, getBalloonPosition, resetBalloonDaemonTimer } from './balloon-daemon';

export { registerBurnDaemon, isBalloonInflated, getBurningObjectId, BalloonHandlerMessages } from '../handlers/balloon-handler';
export { registerTrollRecoveryDaemon, isTrollRecoveryActive, getTrollState } from './troll-daemon';
export { registerSwordGlowDaemon, getSwordGlowState, resetSwordGlowState, SwordGlowMessages } from './sword-glow-daemon';

import { WorldModel } from '@sharpee/world-model';
import { ISchedulerService } from '@sharpee/engine';
import { registerLanternFuse } from './lantern-fuse';
import { registerCandleFuse } from './candle-fuse';
import { initializeDamState, registerYellowButtonHandler } from './dam-state';
import { registerForestAmbienceDaemon } from './forest-daemon';
import { registerBankAlarmDaemon } from './bank-alarm-daemon';
import { registerIncenseFuse } from './incense-fuse';
import { registerBalloonDaemon } from './balloon-daemon';
import { registerBurnDaemon } from '../handlers/balloon-handler';
import { registerSwordGlowDaemon } from './sword-glow-daemon';
import { ForestRoomIds } from '../regions/forest';
import { DamRoomIds } from '../regions/dam';
import { BankRoomIds } from '../regions/bank-of-zork';
import { VolcanoRoomIds } from '../regions/volcano';

/**
 * Balloon entity IDs for daemon registration
 */
export interface BalloonIds {
  balloonId: string;
  receptacleId: string;
}

/**
 * Register all scheduled events for Dungeo
 *
 * @param scheduler - The game's scheduler service
 * @param world - The world model
 * @param forestRoomIds - IDs of forest rooms for ambience daemon
 * @param damRoomIds - IDs of dam rooms for draining sequence
 * @param bankRoomIds - IDs of bank rooms for alarm daemon
 * @param balloonIds - Optional balloon entity IDs for movement daemon
 */
export function registerScheduledEvents(
  scheduler: ISchedulerService,
  world: WorldModel,
  forestRoomIds: ForestRoomIds,
  damRoomIds: DamRoomIds,
  bankRoomIds: BankRoomIds,
  balloonIds?: BalloonIds
): void {
  // Register light source fuses
  registerLanternFuse(scheduler, world);
  registerCandleFuse(scheduler, world);

  // Initialize dam state and yellow button handler
  initializeDamState(world);
  registerYellowButtonHandler(world);

  // Register ambience daemons
  const forestRooms = Object.values(forestRoomIds);
  registerForestAmbienceDaemon(scheduler, forestRooms);

  // Register bank alarm daemon
  registerBankAlarmDaemon(scheduler, world, bankRoomIds);

  // Register incense fuse (ADR-078 Ghost Ritual puzzle)
  registerIncenseFuse(scheduler, world);

  // Register balloon movement daemon (if balloon exists)
  if (balloonIds) {
    registerBalloonDaemon(scheduler, world, balloonIds.balloonId, balloonIds.receptacleId);
  }

  // Register burn daemon (handles burn timer for all flammable objects)
  registerBurnDaemon(scheduler);

  // Register sword glow daemon (elvish sword glows near villains)
  registerSwordGlowDaemon(scheduler);

  // Note: Crypt trigger daemon is registered via registerEndgameTriggerHandler
  // in src/handlers/endgame-trigger-handler.ts
}
