/**
 * Ghost Ritual Dropping Interceptor (ADR-118)
 *
 * When the frame piece is dropped in the Basin Room while incense
 * is burning (basin disarmed), completes the ghost ritual:
 * - Frame piece is consumed
 * - Thief's canvas spawns in Gallery
 *
 * Replaces ghost-ritual-handler.ts event handler pattern.
 *
 * Requires world state values set during story init:
 * - dungeo.ghost_ritual.basin_room_id
 * - dungeo.ghost_ritual.gallery_id
 */

import {
  ActionInterceptor,
  InterceptorSharedData,
  InterceptorResult,
  CapabilityEffect,
  createEffect,
  IFEntity,
  WorldModel
} from '@sharpee/world-model';
import { BasinRoomTrait } from '../traits/basin-room-trait';
import { createThiefsCanvas } from '../objects/thiefs-canvas-objects';

export const GhostRitualInterceptorMessages = {
  GHOST_APPEARS: 'dungeo.ghost.appears',
  CANVAS_SPAWNS: 'dungeo.ghost.canvas_spawns',
} as const;

/** Legacy message IDs (kept for language layer registration) */
export const GhostRitualMessages = {
  GHOST_APPEARS: 'dungeo.ghost.appears',
  CANVAS_SPAWNS: 'dungeo.ghost.canvas_spawns',
  WRONG_ITEM: 'dungeo.ghost.wrong_item',
  NOT_BLESSED: 'dungeo.ghost.not_blessed',
} as const;

export const GhostRitualDroppingInterceptor: ActionInterceptor = {
  /**
   * Post-validate: Check if we're in Basin Room with basin disarmed.
   */
  postValidate(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): InterceptorResult | null {
    const basinRoomId = world.getStateValue('dungeo.ghost_ritual.basin_room_id') as string | undefined;
    if (!basinRoomId) return null;

    // Check if player is in the Basin Room
    const containingRoom = world.getContainingRoom(actorId);
    const roomId = containingRoom?.id || world.getLocation(actorId);

    if (roomId !== basinRoomId) return null;

    // Check if basin trap is disarmed
    const basinRoom = world.getEntity(basinRoomId);
    if (!basinRoom) return null;

    const basinTrait = basinRoom.get(BasinRoomTrait);
    if (basinTrait?.basinState !== 'disarmed') return null;

    // Conditions met — store for postExecute
    sharedData.willCompleteRitual = true;

    return null; // Allow the drop to proceed
  },

  /**
   * Post-execute: Complete the ritual — consume frame piece, spawn canvas.
   */
  postExecute(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): void {
    if (!sharedData.willCompleteRitual) return;

    const galleryId = world.getStateValue('dungeo.ghost_ritual.gallery_id') as string;
    if (!galleryId) return;

    // Remove the frame piece (consumed by the ritual)
    world.removeEntity(entity.id);

    // Create the canvas treasure in the Gallery
    const canvas = createThiefsCanvas(world);
    world.moveEntity(canvas.id, galleryId);

    // Mark the ritual as complete
    world.setStateValue('dungeo.ghost_ritual.complete', true);
    world.setStateValue('dungeo.ghost_ritual.canvas_id', canvas.id);

    sharedData.ritualCompleted = true;
  },

  /**
   * Post-report: Add ghost appearance message.
   */
  postReport(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): CapabilityEffect[] {
    if (!sharedData.ritualCompleted) return [];

    return [
      createEffect('game.message', {
        messageId: GhostRitualInterceptorMessages.GHOST_APPEARS
      }),
      createEffect('game.message', {
        messageId: GhostRitualInterceptorMessages.CANVAS_SPAWNS
      })
    ];
  }
};
