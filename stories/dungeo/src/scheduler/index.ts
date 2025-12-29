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
  registerDamHandlers,
  startDamDraining,
  isDamDrained,
  isDamDraining,
  DAM_STATE_KEY,
  type DamState
} from './dam-fuse';
export { registerForestAmbienceDaemon, isForestAmbienceActive } from './forest-daemon';
export { registerBankAlarmDaemon, isBankAlarmActive } from './bank-alarm-daemon';

import { WorldModel } from '@sharpee/world-model';
import { ISchedulerService } from '@sharpee/engine';
import { registerLanternFuse } from './lantern-fuse';
import { registerCandleFuse } from './candle-fuse';
import { registerDamHandlers } from './dam-fuse';
import { registerForestAmbienceDaemon } from './forest-daemon';
import { registerBankAlarmDaemon } from './bank-alarm-daemon';
import { ForestRoomIds } from '../regions/forest';
import { DamRoomIds } from '../regions/dam';
import { BankRoomIds } from '../regions/bank-of-zork';

/**
 * Register all scheduled events for Dungeo
 *
 * @param scheduler - The game's scheduler service
 * @param world - The world model
 * @param forestRoomIds - IDs of forest rooms for ambience daemon
 * @param damRoomIds - IDs of dam rooms for draining sequence
 * @param bankRoomIds - IDs of bank rooms for alarm daemon
 */
export function registerScheduledEvents(
  scheduler: ISchedulerService,
  world: WorldModel,
  forestRoomIds: ForestRoomIds,
  damRoomIds: DamRoomIds,
  bankRoomIds: BankRoomIds
): void {
  // Register light source fuses
  registerLanternFuse(scheduler, world);
  registerCandleFuse(scheduler, world);

  // Register dam draining sequence
  registerDamHandlers(scheduler, world, damRoomIds.reservoir);

  // Register ambience daemons
  const forestRooms = Object.values(forestRoomIds);
  registerForestAmbienceDaemon(scheduler, forestRooms);

  // Register bank alarm daemon
  registerBankAlarmDaemon(scheduler, world, bankRoomIds);

  console.log('Dungeo scheduler: Registered all daemons and fuses');
}
