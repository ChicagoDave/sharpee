/**
 * Ghost Ritual Handler - ADR-078 Thief's Canvas Puzzle
 *
 * Listens for DROP events in the Basin Room when the trap is disarmed.
 * When the frame piece is dropped while incense is burning:
 * 1. Thief's ghost appears
 * 2. Canvas spawns in Gallery
 * 3. Frame piece is consumed
 */

import { ISemanticEvent, EntityId } from '@sharpee/core';
import { WorldModel, IdentityTrait } from '@sharpee/world-model';
import { createThiefsCanvas } from '../objects/thiefs-canvas-objects';
import { BasinRoomTrait } from '../traits';

export const GhostRitualMessages = {
  GHOST_APPEARS: 'dungeo.ghost.appears',
  CANVAS_SPAWNS: 'dungeo.ghost.canvas_spawns',
  WRONG_ITEM: 'dungeo.ghost.wrong_item',
  NOT_BLESSED: 'dungeo.ghost.not_blessed',
} as const;

/**
 * Check if an entity is the frame piece
 */
function isFramePiece(entity: any): boolean {
  return entity?.isFramePiece === true;
}

/**
 * Find the Basin Room
 */
function findBasinRoom(world: WorldModel): EntityId | undefined {
  const room = world.getAllEntities().find(e => {
    const identity = e.get(IdentityTrait);
    return identity?.name === 'Basin Room';
  });
  return room?.id;
}

/**
 * Find the Gallery room
 */
function findGallery(world: WorldModel): EntityId | undefined {
  const room = world.getAllEntities().find(e => {
    const identity = e.get(IdentityTrait);
    return identity?.name === 'Gallery';
  });
  return room?.id;
}

/**
 * Register the ghost ritual handler
 *
 * Call this from story.onEngineReady() to wire up the ritual.
 */
export function registerGhostRitualHandler(world: WorldModel): void {
  const basinRoomId = findBasinRoom(world);
  const galleryId = findGallery(world);

  if (!basinRoomId) {
    console.warn('Basin Room not found - ghost ritual handler not registered');
    return;
  }

  if (!galleryId) {
    console.warn('Gallery not found - ghost ritual handler not registered');
    return;
  }

  // Listen for drop events
  // Note: We use `world` from the closure (WorldModel) rather than `w` from
  // the event handler (IWorldModel) to ensure type compatibility with createThiefsCanvas
  world.registerEventHandler('if.event.dropped', (event, _w) => {
    const data = event.data as Record<string, any> | undefined;
    if (!data) return;

    const itemId = data.itemId || data.target;
    const locationId = data.location || data.locationId;

    // Must be in Basin Room
    if (locationId !== basinRoomId) return;

    // Get the dropped item
    const item = world.getEntity(itemId);
    if (!item) return;

    // Must be the frame piece
    if (!isFramePiece(item)) return;

    // Check if basin trap is disarmed (incense is burning)
    const basinRoom = world.getEntity(basinRoomId);
    if (!basinRoom) return;

    const basinTrait = basinRoom.get(BasinRoomTrait);
    if (basinTrait?.basinState !== 'disarmed') {
      // Basin trap not disarmed - the item just sits there
      return;
    }

    // RITUAL COMPLETE!
    completeGhostRitual(world, itemId, galleryId);
  });
}

/**
 * Complete the ghost ritual
 * - Remove frame piece
 * - Create canvas in Gallery
 * - Emit ghost appearance event
 */
function completeGhostRitual(
  world: WorldModel,
  framePieceId: EntityId,
  galleryId: EntityId
): void {
  // Remove the frame piece (consumed by the ritual)
  world.removeEntity(framePieceId);

  // Create the canvas treasure in the Gallery
  const canvas = createThiefsCanvas(world);
  world.moveEntity(canvas.id, galleryId);

  // Mark the ritual as complete
  world.setStateValue('dungeo.ghost_ritual.complete', true);
  world.setStateValue('dungeo.ghost_ritual.canvas_id', canvas.id);
}

/**
 * Check if the ghost ritual has been completed
 */
export function isGhostRitualComplete(world: WorldModel): boolean {
  return world.getStateValue('dungeo.ghost_ritual.complete') === true;
}
