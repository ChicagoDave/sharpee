/**
 * Incense Burning Fuse - ADR-078 Ghost Ritual
 *
 * The incense burns for exactly 3 turns when lit.
 * While burning, it disarms the basin trap in the Basin Room.
 * When it burns out, the trap re-arms and the incense is consumed.
 *
 * This is a one-shot fuse - incense cannot be relit.
 */

import { ISemanticEvent, EntityId } from '@sharpee/core';
import { WorldModel, IdentityTrait } from '@sharpee/world-model';
import { ISchedulerService, Fuse, SchedulerContext } from '@sharpee/engine';
import { DungeoSchedulerMessages } from './scheduler-messages';
import { BurnableTrait } from '../traits';

// Fuse ID
const INCENSE_BURN_FUSE = 'dungeo.incense.burn';

// Timing constants (in turns)
const INCENSE_BURN_TURNS = 3;

/**
 * Create the incense burning fuse
 */
function createIncenseBurnFuse(incenseId: EntityId, basinRoomId: EntityId): Fuse {
  return {
    id: INCENSE_BURN_FUSE,
    name: 'Incense Burning',
    turns: INCENSE_BURN_TURNS,
    entityId: incenseId,
    priority: 10,

    // Always tick when incense is burning (no pause mechanism)
    tickCondition: (ctx: SchedulerContext): boolean => {
      const incense = ctx.world.getEntity(incenseId);
      if (!incense) return false;
      const burnable = incense.get(BurnableTrait);
      return burnable?.isBurning === true;
    },

    // When incense burns out
    trigger: (ctx: SchedulerContext): ISemanticEvent[] => {
      const incense = ctx.world.getEntity(incenseId);
      if (!incense) return [];

      // Mark incense as burned out via BurnableTrait
      const burnable = incense.get(BurnableTrait);
      if (burnable) {
        burnable.isBurning = false;
        burnable.burnedOut = true;
      }

      // Update description
      const identity = incense.get(IdentityTrait);
      if (identity) {
        identity.description = 'A pile of ash that was once fragrant incense.';
        identity.name = 'ash';
      }

      // Reset basin room state if applicable
      const basinRoom = ctx.world.getEntity(basinRoomId);
      if (basinRoom && (basinRoom as any).basinState === 'disarmed') {
        // Basin trap re-arms when incense burns out
        (basinRoom as any).basinState = 'normal';
      }

      // Clear the burning state
      ctx.world.setStateValue('dungeo.incense.burning_id', null);

      return [{
        id: `incense-out-${ctx.turn}`,
        type: 'scheduler.fuse.triggered',
        timestamp: Date.now(),
        entities: { target: incenseId },
        data: {
          messageId: DungeoSchedulerMessages.INCENSE_BURNS_OUT,
          fuseId: INCENSE_BURN_FUSE
        }
      }];
    }
  };
}

/**
 * Register incense burning fuse
 *
 * Call this from story.onEngineReady() to wire up the incense.
 * The fuse only ticks when the incense is actually burning.
 */
export function registerIncenseFuse(
  scheduler: ISchedulerService,
  world: WorldModel
): void {
  // Find the incense entity by BurnableTrait with type 'incense'
  const incense = world.getAllEntities().find(e => {
    const burnable = e.get(BurnableTrait);
    return burnable?.burnableType === 'incense';
  });
  if (!incense) {
    console.warn('Incense not found - incense fuse not registered');
    return;
  }

  // Find the Basin Room
  const basinRoom = world.getAllEntities().find(e => {
    const identity = e.get(IdentityTrait);
    return identity?.name === 'Basin Room';
  });
  if (!basinRoom) {
    console.warn('Basin Room not found - incense fuse not registered');
    return;
  }

  // Register the burn fuse
  scheduler.setFuse(createIncenseBurnFuse(incense.id, basinRoom.id));
}

/**
 * Get the remaining incense burn turns for debugging
 */
export function getIncenseBurnRemaining(scheduler: ISchedulerService): number | undefined {
  return scheduler.getFuseRemaining(INCENSE_BURN_FUSE);
}
