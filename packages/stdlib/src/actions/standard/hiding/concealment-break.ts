/**
 * Concealment-break hook listener (ADR-148)
 *
 * Registered on the engine's if.hook.before_action hook point.
 * When a noisy action is about to execute and the player is concealed,
 * this listener removes ConcealedStateTrait before validation runs.
 *
 * Uses an allowlist of silent actions (conservative: new actions default to revealing).
 *
 * Public interface: createConcealmentBreakListener.
 * Owner context: @sharpee/stdlib / actions / hiding
 */

import { ConcealedStateTrait, isConcealed } from '@sharpee/world-model';
import type { WorldModel } from '@sharpee/world-model';
import { IFActions } from '../../constants';

/**
 * Hook data shape — matches BeforeActionHookData from engine.
 * Redefined here to avoid a direct engine import in stdlib.
 */
interface HookData {
  actionId: string;
  actorId?: string;
  directObjectId?: string;
}

/**
 * Actions that do NOT break concealment.
 *
 * This is an allowlist — everything not listed here will reveal the player.
 * Conservative by design: new actions default to revealing.
 */
const SILENT_ACTIONS = new Set<string>([
  IFActions.LOOKING,
  IFActions.EXAMINING,
  IFActions.WAITING,
  IFActions.LISTENING,
  IFActions.SMELLING,
  IFActions.HIDING,         // already hidden — validate will reject
  IFActions.REVEALING,      // handled by its own execute phase
  IFActions.INVENTORY,
  IFActions.HELP,
  IFActions.ABOUT,
  IFActions.VERSION,
  IFActions.SAVING,
  IFActions.RESTORING,
  IFActions.RESTARTING,
  IFActions.QUITTING,
  IFActions.SCORING,
  IFActions.UNDOING,
  IFActions.AGAIN,
]);

/**
 * Create the concealment-break listener for the engine's before-action hook.
 *
 * @returns A listener function compatible with engine.onBeforeAction()
 */
export function createConcealmentBreakListener(): (data: HookData, world: WorldModel) => void {
  return (data: HookData, world: WorldModel) => {
    const player = world.getPlayer();
    if (!player || !isConcealed(player)) return;

    if (!SILENT_ACTIONS.has(data.actionId)) {
      // Noisy action — break concealment by removing the trait.
      // The state change is immediate; the action that follows will
      // execute with the player visible. No event is emitted here —
      // the trait removal itself is the signal (NPCs can now see the player).
      player.remove(ConcealedStateTrait.type);
    }
  };
}
