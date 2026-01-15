/**
 * Dam State - Simple toggle for reservoir drainage
 *
 * Per FORTRAN objects.f lines 1055-1062, dam draining is INSTANT:
 * - Turn bolt → toggle LWTIDF (low tide flag)
 * - Reservoir immediately walkable/flooded
 * - Trunk immediately visible/hidden
 *
 * No fuses, no waiting - just a state toggle.
 */

import { WorldModel, IWorldModel } from '@sharpee/world-model';

// Dam state key for world capability
export const DAM_STATE_KEY = 'dungeo.dam.state';

export interface DamState {
  isDrained: boolean;       // Low tide - reservoir walkable
  buttonPressed: boolean;   // Yellow button pressed - enables bolt
}

/**
 * Initialize dam state capability
 */
export function initializeDamState(world: WorldModel): void {
  world.registerCapability(DAM_STATE_KEY, {
    initialData: {
      isDrained: false,
      buttonPressed: false
    } as DamState
  });
}

/**
 * Check if the dam is drained (low tide)
 */
export function isDamDrained(world: WorldModel): boolean {
  const state = world.getCapability(DAM_STATE_KEY) as DamState | null;
  return state?.isDrained ?? false;
}

/**
 * Set dam drained state
 */
export function setDamDrained(world: WorldModel, drained: boolean): void {
  const state = world.getCapability(DAM_STATE_KEY) as DamState | null;
  if (state) {
    state.isDrained = drained;
  }
}

/**
 * Check if the yellow button has been pressed (bolt is enabled)
 */
export function isYellowButtonPressed(world: WorldModel): boolean {
  const state = world.getCapability(DAM_STATE_KEY) as DamState | null;
  return state?.buttonPressed ?? false;
}

/**
 * Set yellow button pressed state
 */
export function setYellowButtonPressed(world: WorldModel, pressed: boolean): void {
  const state = world.getCapability(DAM_STATE_KEY) as DamState | null;
  if (state) {
    state.buttonPressed = pressed;
  }
}

/**
 * Register yellow button handler
 *
 * Listens for 'dungeo.button.yellow.pressed' event and enables the bolt.
 */
export function registerYellowButtonHandler(world: WorldModel): void {
  world.registerEventHandler('dungeo.button.yellow.pressed', (event, w: IWorldModel) => {
    setYellowButtonPressed(w as WorldModel, true);
  });
}
