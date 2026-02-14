/**
 * Glacier Throwing Interceptor (ADR-118)
 *
 * Handles the glacier melting mechanic from MDL GLACIER function (act1.mud:369-407).
 *
 * THROW TORCH AT GLACIER (lit torch): Melts glacier, reveals west passage to Ruby Room,
 *   torch extinguished and carried downstream to Stream View.
 * THROW anything else: "The glacier is unmoved by your ridiculous attempt."
 * THROW unlit torch: "Perhaps if it were lit..."
 *
 * Uses preValidate to block non-torch/cold-torch throws so only
 * the glacier-specific message shows (not the standard throw message).
 */

import {
  ActionInterceptor,
  InterceptorSharedData,
  InterceptorResult,
  CapabilityEffect,
  createEffect,
  IFEntity,
  WorldModel,
  IdentityTrait,
  LightSourceTrait,
  RoomTrait,
  Direction
} from '@sharpee/world-model';
import { GlacierTrait } from '../traits/glacier-trait';

// Message IDs for glacier puzzle
export const GlacierMessages = {
  GLACIER_MELTS: 'dungeo.glacier.melts',
  THROW_COLD: 'dungeo.glacier.throw_cold',
  THROW_WRONG_ITEM: 'dungeo.glacier.throw_wrong_item',
  MELT_DEATH: 'dungeo.glacier.melt_death',
  MELT_NO_FLAME: 'dungeo.glacier.melt_no_flame',
  MELT_NOTHING: 'dungeo.glacier.melt_nothing',
  MELT_NO_INSTRUMENT: 'dungeo.glacier.melt_no_instrument'
};

/**
 * Check if the item is a torch
 */
function isTorch(entity: IFEntity): boolean {
  const identity = entity.get(IdentityTrait);
  if (!identity) return false;
  const name = identity.name?.toLowerCase() || '';
  return name.includes('torch');
}

/**
 * Check if a light source is lit
 */
function isLit(entity: IFEntity): boolean {
  const lightSource = entity.get(LightSourceTrait);
  return lightSource?.isLit ?? false;
}

/**
 * Glacier Throwing Interceptor
 *
 * Intercepts THROWING actions targeting the glacier.
 * Blocks non-torch and cold-torch throws via preValidate.
 * Melts the glacier when a lit torch is thrown via postExecute.
 */
export const GlacierThrowingInterceptor: ActionInterceptor = {
  /**
   * Pre-validate: Block throws that won't melt the glacier.
   * Non-torch items and unlit torch get custom messages via onBlocked.
   * Lit torch is allowed through to standard execute + postExecute.
   */
  preValidate(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): InterceptorResult | null {
    const glacierTrait = entity.get(GlacierTrait);
    if (!glacierTrait || glacierTrait.melted) return null;

    // itemId/itemName set by throwing action's validate before calling preValidate
    const itemId = sharedData.itemId as string | undefined;
    if (!itemId) return null;

    const item = world.getEntity(itemId);
    if (!item) return null;

    if (!isTorch(item)) {
      return { valid: false, error: 'glacier_wrong_item' };
    }

    if (!isLit(item)) {
      return { valid: false, error: 'glacier_cold_torch' };
    }

    // Lit torch - allow standard throw to proceed
    return null;
  },

  /**
   * On-blocked: Custom messages for glacier-specific blocks.
   */
  onBlocked(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    error: string,
    sharedData: InterceptorSharedData
  ): CapabilityEffect[] | null {
    if (error === 'glacier_wrong_item') {
      return [createEffect('game.message', {
        messageId: GlacierMessages.THROW_WRONG_ITEM,
        params: {}
      })];
    }
    if (error === 'glacier_cold_torch') {
      return [createEffect('game.message', {
        messageId: GlacierMessages.THROW_COLD,
        params: {}
      })];
    }
    return null;
  },

  /**
   * Post-execute: Melt the glacier when a lit torch is thrown.
   * At this point, preValidate already verified the item is a lit torch.
   */
  postExecute(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): void {
    const glacierTrait = entity.get(GlacierTrait);
    if (!glacierTrait || glacierTrait.melted) return;

    const itemId = sharedData.itemId as string | undefined;
    if (!itemId) return;

    const item = world.getEntity(itemId);
    if (!item) return;

    // Mark success for postReport
    sharedData.glacierMelted = true;

    // Mark glacier as melted
    glacierTrait.melted = true;

    // Update glacier entity description (entity remains as scenery reference)
    const identity = entity.get(IdentityTrait);
    if (identity) {
      identity.description = 'A pool of water remains where the massive glacier once stood. A passageway leads west.';
    }

    // Add exit: Glacier Room W -> Ruby Room (MDL: CEXIT GLACIER-FLAG)
    const glacierRoom = world.getEntity(glacierTrait.glacierRoomId);
    if (glacierRoom) {
      const roomTrait = glacierRoom.get(RoomTrait);
      if (roomTrait) {
        roomTrait.exits[Direction.WEST] = { destination: glacierTrait.westDestination };
      }
    }

    // Extinguish the torch (MDL: TORCH-OFF)
    const lightSource = item.get(LightSourceTrait);
    if (lightSource) {
      lightSource.isLit = false;
    }

    // Update torch to "dead" state (MDL: ODESC1 -> "dead torch")
    const torchIdentity = item.get(IdentityTrait);
    if (torchIdentity) {
      torchIdentity.name = 'dead torch';
      torchIdentity.description = 'A burned out ivory torch.';
      torchIdentity.aliases = ['torch', 'ivory torch', 'dead torch', 'ivory'];
    }

    // Move torch to Stream View (MDL: INSERT-OBJECT TORCH STREA)
    world.moveEntity(itemId, glacierTrait.torchDestination);
  },

  /**
   * Post-report: Add glacier melting message to output.
   */
  postReport(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): CapabilityEffect[] {
    if (sharedData.glacierMelted) {
      return [createEffect('game.message', {
        messageId: GlacierMessages.GLACIER_MELTS,
        params: {}
      })];
    }
    return [];
  }
};
