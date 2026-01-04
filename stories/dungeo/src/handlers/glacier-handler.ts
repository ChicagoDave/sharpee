/**
 * Glacier Handler
 *
 * Handles the glacier puzzle in the Glacier Room.
 * When the player throws a lit torch at the glacier, it melts
 * and reveals the north passage to Volcano View.
 */

import { WorldModel, IWorldModel, RoomTrait, Direction, IdentityTrait, LightSourceTrait } from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';

// State keys
const GLACIER_MELTED_KEY = 'dungeo.glacier.melted';

// Message IDs for glacier puzzle
export const GlacierMessages = {
  GLACIER_MELTS: 'dungeo.glacier.melts',
  TORCH_CONSUMED: 'dungeo.glacier.torch_consumed',
  PASSAGE_REVEALED: 'dungeo.glacier.passage_revealed',
  THROW_COLD: 'dungeo.glacier.throw_cold',
  THROW_WRONG_ITEM: 'dungeo.glacier.throw_wrong_item'
};

/**
 * Check if the glacier has already been melted
 */
export function isGlacierMelted(world: IWorldModel): boolean {
  return (world.getStateValue(GLACIER_MELTED_KEY) as boolean) || false;
}

/**
 * Register the glacier event handler
 *
 * Listens for if.event.thrown events and handles the glacier puzzle.
 */
export function registerGlacierHandler(
  world: WorldModel,
  glacierRoomId: string,
  volcanoViewId: string
): void {
  world.registerEventHandler('if.event.thrown', (event: ISemanticEvent, w: IWorldModel): void => {
    // Already melted - nothing to do
    if (isGlacierMelted(w)) {
      return;
    }

    const data = event.data as Record<string, any> | undefined;
    if (!data) return;

    // Check if thrown at a target (not directional throw)
    if (data.throwType !== 'at_target') return;

    // Check if the target is the glacier
    const targetId = data.target as string | undefined;
    if (!targetId) return;

    const target = w.getEntity(targetId);
    if (!target) return;

    const targetIdentity = target.get(IdentityTrait);
    const targetName = targetIdentity?.name || '';

    if (targetName !== 'glacier') return;

    // Check if the item is the torch
    const itemId = data.item as string | undefined;
    if (!itemId) return;

    const item = w.getEntity(itemId);
    if (!item) return;

    const itemIdentity = item.get(IdentityTrait);
    const itemName = itemIdentity?.name || '';

    // Check if it's the ivory torch (or any torch)
    if (!itemName.toLowerCase().includes('torch')) {
      // Wrong item thrown at glacier - no special effect
      return;
    }

    // Check if the torch is lit
    const lightSource = item.get(LightSourceTrait);
    if (!lightSource || !lightSource.isLit) {
      // Torch is not lit - store message to emit
      w.setStateValue('dungeo.glacier.throw_cold_pending', true);
      return;
    }

    // SUCCESS! Lit torch thrown at glacier - melt it!
    meltGlacier(w, glacierRoomId, volcanoViewId, itemId);
  });
}

/**
 * Melt the glacier and open the passage
 */
function meltGlacier(
  world: IWorldModel,
  glacierRoomId: string,
  volcanoViewId: string,
  torchId: string
): void {
  // Mark glacier as melted
  world.setStateValue(GLACIER_MELTED_KEY, true);

  // Update glacier entity state
  const glacierRoom = world.getEntity(glacierRoomId);
  if (glacierRoom) {
    const contents = world.getContents(glacierRoomId);
    const glacier = contents.find(e => {
      const identity = e.get(IdentityTrait);
      return identity?.name === 'glacier';
    });

    if (glacier) {
      (glacier as any).isMelted = true;

      // Update glacier description
      const identity = glacier.get(IdentityTrait);
      if (identity) {
        identity.description = 'A pool of water remains where the massive glacier once stood. The north passage is now clear.';
      }
    }
  }

  // Add exits: Glacier Room N → Volcano View, Volcano View S → Glacier Room
  const glacierRoomEntity = world.getEntity(glacierRoomId);
  if (glacierRoomEntity) {
    const roomTrait = glacierRoomEntity.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.NORTH] = { destination: volcanoViewId };
    }
  }

  const volcanoView = world.getEntity(volcanoViewId);
  if (volcanoView) {
    const roomTrait = volcanoView.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.SOUTH] = { destination: glacierRoomId };
    }
  }

  // Remove/destroy the torch - it's consumed by melting the glacier
  // In classic Zork, the torch melts into the glacier
  world.removeEntity(torchId);

  // Set flag for messaging
  world.setStateValue('dungeo.glacier.just_melted', true);
}
