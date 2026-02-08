/**
 * Wound Healing Daemon (CURE-CLOCK, melee.137:295-300)
 *
 * Heals 1 wound point every CURE_WAIT (30) turns.
 *
 * Canonical behavior:
 * - Active when player has wounds (meleeWoundAdjust < 0)
 * - Increments a tick counter each turn
 * - When counter reaches CURE_WAIT, heals 1 point and resets counter
 * - Stops when meleeWoundAdjust reaches 0 (fully healed)
 * - Silent — player uses DIAGNOSE to check healing progress
 *
 * State storage:
 * - Tick counter: world.getStateValue('dungeo.cure.ticks') (survives save/restore)
 * - Wound level: player.attributes.meleeWoundAdjust (survives save/restore)
 */

import { ISemanticEvent } from '@sharpee/core';
import { ISchedulerService, Daemon, SchedulerContext } from '@sharpee/plugin-scheduler';
import { MELEE_STATE, CURE_STATE } from '../combat/melee-state';
import { healOneWound, CURE_WAIT } from '../combat/melee';

export const CURE_DAEMON_ID = 'dungeo.cure.daemon';

function createCureDaemon(): Daemon {
  return {
    id: CURE_DAEMON_ID,
    name: 'Wound Healing',
    priority: 5, // Low priority — runs after combat daemons

    condition: (ctx: SchedulerContext): boolean => {
      const player = ctx.world.getPlayer();
      if (!player) return false;
      const woundAdjust = (player.attributes[MELEE_STATE.WOUND_ADJUST] as number) ?? 0;
      return woundAdjust < 0;
    },

    run: (ctx: SchedulerContext): ISemanticEvent[] => {
      const player = ctx.world.getPlayer();
      if (!player) return [];

      // Increment tick counter
      const ticks = (ctx.world.getStateValue(CURE_STATE.TICKS) as number) || 0;
      const newTicks = ticks + 1;

      if (newTicks >= CURE_WAIT) {
        // Heal one wound point
        const currentWoundAdjust = (player.attributes[MELEE_STATE.WOUND_ADJUST] as number) ?? 0;
        const result = healOneWound(currentWoundAdjust);
        player.attributes[MELEE_STATE.WOUND_ADJUST] = result.newWoundAdjust;

        // Reset counter for next heal cycle
        ctx.world.setStateValue(CURE_STATE.TICKS, 0);
      } else {
        // Keep counting
        ctx.world.setStateValue(CURE_STATE.TICKS, newTicks);
      }

      // Silent — no message emitted. Player uses DIAGNOSE to check.
      return [];
    }
  };
}

/**
 * Register the wound healing daemon with the scheduler.
 */
export function registerCureDaemon(scheduler: ISchedulerService): void {
  scheduler.registerDaemon(createCureDaemon());
}
