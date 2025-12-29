/**
 * Dam Draining Sequence - ADR-071 Phase 2
 *
 * When the player presses the yellow button on the control panel (after
 * loosening the bolt with the wrench), a multi-stage draining sequence begins:
 *
 * Stage 1 (turn 0): "The sluice gates open and water begins draining from the reservoir."
 * Stage 2 (turn 5): "The water level is dropping rapidly now."
 * Stage 3 (turn 8): "The reservoir is nearly empty."
 * Stage 4 (turn 10): "The last of the water drains away, revealing a trunk in the mud!"
 *
 * After completion:
 * - Reservoir room description changes to show it's drained
 * - Trunk of jewels becomes visible/accessible
 * - Reservoir passable by walking (no boat needed)
 */

import { ISemanticEvent, EntityId } from '@sharpee/core';
import { WorldModel, RoomTrait, IdentityTrait, IWorldModel } from '@sharpee/world-model';
import { ISchedulerService, Fuse, SchedulerContext } from '@sharpee/engine';
import { DungeoSchedulerMessages } from './scheduler-messages';

// Fuse IDs
const DAM_DRAIN_STAGE_1 = 'dungeo.dam.drain.stage1';
const DAM_DRAIN_STAGE_2 = 'dungeo.dam.drain.stage2';
const DAM_DRAIN_STAGE_3 = 'dungeo.dam.drain.stage3';

// Timing constants (in turns after button press)
const STAGE_2_DELAY = 5;
const STAGE_3_DELAY = 3;  // 3 turns after stage 2
const STAGE_4_DELAY = 2;  // 2 turns after stage 3

// Dam state key for world capability
export const DAM_STATE_KEY = 'dungeo.dam.state';

export interface DamState {
  isDraining: boolean;
  isDrained: boolean;
  boltLoose: boolean;
}

/**
 * Start the dam draining sequence
 *
 * Call this when the player presses the yellow button.
 * Returns events to emit immediately (the initial draining message).
 */
export function startDamDraining(
  scheduler: ISchedulerService,
  world: WorldModel,
  reservoirId: EntityId
): ISemanticEvent[] {
  // Get or create dam state
  let damState = world.getCapability(DAM_STATE_KEY) as DamState | null;
  if (!damState) {
    damState = { isDraining: false, isDrained: false, boltLoose: false };
    world.registerCapability(DAM_STATE_KEY, { initialData: damState });
  }

  // Don't start if already draining or drained
  if (damState.isDraining || damState.isDrained) {
    return [];
  }

  // Mark as draining
  damState.isDraining = true;

  // Schedule stage 2 (water dropping)
  scheduler.setFuse({
    id: DAM_DRAIN_STAGE_1,
    name: 'Dam Draining - Stage 2',
    turns: STAGE_2_DELAY,
    priority: 15,
    trigger: (ctx: SchedulerContext): ISemanticEvent[] => {
      // Schedule stage 3
      scheduler.setFuse({
        id: DAM_DRAIN_STAGE_2,
        name: 'Dam Draining - Stage 3',
        turns: STAGE_3_DELAY,
        priority: 15,
        trigger: (ctx2: SchedulerContext): ISemanticEvent[] => {
          // Schedule final stage
          scheduler.setFuse({
            id: DAM_DRAIN_STAGE_3,
            name: 'Dam Draining - Complete',
            turns: STAGE_4_DELAY,
            priority: 15,
            trigger: (ctx3: SchedulerContext): ISemanticEvent[] => {
              return completeDamDraining(ctx3.world, reservoirId);
            }
          });

          return [{
            id: `dam-nearly-empty-${ctx2.turn}`,
            type: 'scheduler.fuse.triggered',
            timestamp: Date.now(),
            entities: {},
            data: {
              messageId: DungeoSchedulerMessages.DAM_NEARLY_EMPTY,
              fuseId: DAM_DRAIN_STAGE_2
            }
          }];
        }
      });

      return [{
        id: `dam-draining-${ctx.turn}`,
        type: 'scheduler.fuse.triggered',
        timestamp: Date.now(),
        entities: {},
        data: {
          messageId: DungeoSchedulerMessages.DAM_DRAINING,
          fuseId: DAM_DRAIN_STAGE_1
        }
      }];
    }
  });

  // Return the initial draining event
  return [{
    id: `dam-gates-open-${Date.now()}`,
    type: 'game.message',
    timestamp: Date.now(),
    entities: {},
    data: {
      messageId: DungeoSchedulerMessages.DAM_DRAINING
    }
  }];
}

/**
 * Complete the dam draining - update world state
 */
function completeDamDraining(
  world: WorldModel,
  reservoirId: EntityId
): ISemanticEvent[] {
  // Update dam state
  const damState = world.getCapability(DAM_STATE_KEY) as DamState | null;
  if (damState) {
    damState.isDraining = false;
    damState.isDrained = true;
  }

  // Update reservoir room description
  const reservoir = world.getEntity(reservoirId);
  if (reservoir) {
    const identity = reservoir.get(IdentityTrait);
    if (identity) {
      identity.description = 'This is the bed of a large reservoir, now drained. The muddy bottom stretches in all directions. You can walk freely here now that the water is gone.';
    }

    // Mark reservoir as passable without boat
    const roomTrait = reservoir.get(RoomTrait);
    if (roomTrait) {
      (roomTrait as any).requiresBoat = false;
    }
  }

  // Make trunk visible (it was created but hidden)
  // Find the trunk and ensure it's accessible
  const trunk = world.getAllEntities().find(e => {
    const id = e.get('identity') as { name?: string } | undefined;
    return id?.name === 'trunk';
  });

  if (trunk) {
    // Update trunk description
    const trunkIdentity = trunk.get(IdentityTrait);
    if (trunkIdentity) {
      trunkIdentity.description = 'This is an old trunk, covered in mud and sediment from the drained reservoir. It appears to contain a fortune in jewels!';
    }
    // Ensure trunk is in the reservoir room
    world.moveEntity(trunk.id, reservoirId);
    // Mark trunk as visible/accessible
    (trunk as any).revealed = true;
  }

  return [{
    id: `dam-empty-trunk-${Date.now()}`,
    type: 'scheduler.fuse.triggered',
    timestamp: Date.now(),
    entities: { target: trunk?.id },
    data: {
      messageId: DungeoSchedulerMessages.DAM_TRUNK_REVEALED,
      fuseId: DAM_DRAIN_STAGE_3,
      trunkRevealed: true,
      trunkId: trunk?.id
    }
  }];
}

/**
 * Check if the dam is drained
 */
export function isDamDrained(world: WorldModel): boolean {
  const damState = world.getCapability(DAM_STATE_KEY) as DamState | null;
  return damState?.isDrained ?? false;
}

/**
 * Check if the dam is currently draining
 */
export function isDamDraining(world: WorldModel): boolean {
  const damState = world.getCapability(DAM_STATE_KEY) as DamState | null;
  return damState?.isDraining ?? false;
}

/**
 * Register dam event handlers
 *
 * This sets up handlers for the "use wrench on bolt" and "push button" actions.
 * Call this from story.onEngineReady().
 */
export function registerDamHandlers(
  scheduler: ISchedulerService,
  world: WorldModel,
  reservoirId: EntityId
): void {
  // Initialize dam state capability
  world.registerCapability(DAM_STATE_KEY, {
    initialData: {
      isDraining: false,
      isDrained: false,
      boltLoose: false
    } as DamState
  });

  // Handler for loosening the bolt
  // This would be triggered by a custom "turn bolt with wrench" action
  world.registerEventHandler('dungeo.bolt.loosened', (event, w: IWorldModel) => {
    const damState = w.getCapability(DAM_STATE_KEY) as DamState | null;
    if (damState) {
      damState.boltLoose = true;
    }
  });

  // Handler for pressing the yellow button
  // This would be triggered by a custom "push button" action
  world.registerEventHandler('dungeo.button.pressed', (event, w: IWorldModel) => {
    const damState = w.getCapability(DAM_STATE_KEY) as DamState | null;

    // Button only works if bolt is loose
    if (!damState?.boltLoose) {
      // Button does nothing if bolt is still tight
      return;
    }

    // Start the draining sequence
    startDamDraining(scheduler, w as WorldModel, reservoirId);
  });
}
