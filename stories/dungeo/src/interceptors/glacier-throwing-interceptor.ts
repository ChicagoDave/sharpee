/**
 * Glacier Throwing Interceptor (ADR-118)
 *
 * Handles the glacier melting mechanic: when throwing a lit torch
 * at the glacier, it melts and reveals the north passage.
 *
 * This replaces the event handler pattern in glacier-handler.ts.
 * The interceptor hooks into the THROWING action phases to:
 * - postValidate: Check if a lit torch is being thrown, store data
 * - postExecute: Melt the glacier if lit torch was thrown
 * - postReport: Add melting message to output
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
  TORCH_CONSUMED: 'dungeo.glacier.torch_consumed',
  PASSAGE_REVEALED: 'dungeo.glacier.passage_revealed',
  THROW_COLD: 'dungeo.glacier.throw_cold',
  THROW_WRONG_ITEM: 'dungeo.glacier.throw_wrong_item'
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
 * Melts the glacier when a lit torch is thrown at it.
 */
export const GlacierThrowingInterceptor: ActionInterceptor = {
  /**
   * Post-validate: Check if a lit torch is being thrown.
   * Store data for postExecute - don't block the action.
   */
  postValidate(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): InterceptorResult | null {
    const glacierTrait = entity.get(GlacierTrait);
    if (!glacierTrait) return null;

    // Already melted - nothing to do
    if (glacierTrait.melted) {
      return null;
    }

    // Get the item being thrown from shared data
    // The throwing action stores itemId in sharedData during execute
    // But we're in postValidate, so we need to get it differently
    // Actually, the item is available through the action context...
    // For interceptors, we need to check the world state

    // The item being thrown is passed through the interceptor mechanism
    // We store the torch check result for postExecute
    sharedData.glacierTarget = true;

    return null;
  },

  /**
   * Post-execute: Melt the glacier if a lit torch was thrown.
   */
  postExecute(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): void {
    const glacierTrait = entity.get(GlacierTrait);
    if (!glacierTrait || glacierTrait.melted) {
      return;
    }

    // Get the thrown item from the standard throwing sharedData
    // The throwing action stores itemId in the action's sharedData
    const itemId = sharedData.itemId as string | undefined;
    if (!itemId) return;

    const item = world.getEntity(itemId);
    if (!item) return;

    // Check if it's a torch
    if (!isTorch(item)) {
      // Wrong item - no special effect (standard throw message will show)
      return;
    }

    // Check if the torch is lit
    if (!isLit(item)) {
      // Torch is not lit - store for custom message
      sharedData.torchWasCold = true;
      return;
    }

    // SUCCESS! Lit torch thrown at glacier - melt it!
    sharedData.glacierMelted = true;
    sharedData.torchId = itemId;

    // Mark glacier as melted
    glacierTrait.melted = true;

    // Update glacier description
    const identity = entity.get(IdentityTrait);
    if (identity) {
      identity.description = 'A pool of water remains where the massive glacier once stood. The north passage is now clear.';
    }

    // Add exits: Glacier Room N → Volcano View, Volcano View S → Glacier Room
    const glacierRoom = world.getEntity(glacierTrait.glacierRoomId);
    if (glacierRoom) {
      const roomTrait = glacierRoom.get(RoomTrait);
      if (roomTrait) {
        roomTrait.exits[Direction.NORTH] = { destination: glacierTrait.northDestination };
      }
    }

    const volcanoView = world.getEntity(glacierTrait.northDestination);
    if (volcanoView) {
      const roomTrait = volcanoView.get(RoomTrait);
      if (roomTrait) {
        roomTrait.exits[Direction.SOUTH] = { destination: glacierTrait.glacierRoomId };
      }
    }

    // Extinguish the torch and move to stream view
    const lightSource = item.get(LightSourceTrait);
    if (lightSource) {
      lightSource.isLit = false;
    }

    // Update torch to "burned out" state
    const torchIdentity = item.get(IdentityTrait);
    if (torchIdentity) {
      torchIdentity.name = 'burned out ivory torch';
      torchIdentity.description = 'A burned out ivory torch. The flame has been extinguished.';
      torchIdentity.aliases = ['torch', 'ivory torch', 'burned out torch', 'ivory'];
    }

    // Move torch downstream (carried by glacier melt)
    world.moveEntity(itemId, glacierTrait.torchDestination);
  },

  /**
   * Post-report: Add glacier melt message to output.
   */
  postReport(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): CapabilityEffect[] {
    const effects: CapabilityEffect[] = [];

    if (sharedData.glacierMelted) {
      effects.push(
        createEffect('game.message', {
          messageId: GlacierMessages.GLACIER_MELTS,
          params: {}
        })
      );
    } else if (sharedData.torchWasCold) {
      effects.push(
        createEffect('game.message', {
          messageId: GlacierMessages.THROW_COLD,
          params: {}
        })
      );
    }

    return effects;
  }
};
