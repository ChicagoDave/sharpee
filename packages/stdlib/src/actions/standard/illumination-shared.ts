/**
 * illumination-shared.ts — what a light does to the room it lights.
 *
 * Switching a lamp on and lighting a lantern (ADR-374 D9) both turn a dark
 * room light for the one who did it, and the room is then described as if
 * they had looked; switching off and putting out can turn it dark. Whether
 * the room is dark is always asked of the actor (`isDarkFor`, ADR-374 D5),
 * before and after the change, so a night-vision observer is never told the
 * darkness lifted.
 *
 * Public interface: RevealedRoom, darkForActor, captureRevealedRoom,
 *   revealedRoomEvents.
 * Owner context: stdlib standard actions.
 */

import { type ISemanticEvent } from '@sharpee/core';
import { RoomTrait, TraitType, VisibilityBehavior } from '@sharpee/world-model';
import { ActionContext } from '../enhanced-types.js';
import { nounPhraseFor } from '../../utils/index.js';
import { captureRoomSnapshot, captureEntitySnapshots, RoomSnapshot, EntitySnapshot } from '../base/snapshot-utils.js';

/** The room as it stood once it was lit, captured in execute for report. */
export interface RevealedRoom {
  room: RoomSnapshot;
  visible: EntitySnapshot[];
}

/**
 * Whether the actor's room is dark to the actor.
 *
 * @param context - The acting context
 * @returns true when the actor cannot see the room
 */
export function darkForActor(context: ActionContext): boolean {
  const room = context.world.getContainingRoom(context.actor.id);
  return room ? VisibilityBehavior.isDarkFor(context.actor, room, context.world) : false;
}

/**
 * Capture the actor's room for an automatic look, after the light changed.
 *
 * @param context - The acting context
 * @returns The room and what is in it, or undefined when there is no room
 */
export function captureRevealedRoom(context: ActionContext): RevealedRoom | undefined {
  const room = context.world.getContainingRoom(context.actor.id);
  if (!room) return undefined;
  const contents = context.world.getContents(room.id).filter((e) => e.id !== context.actor.id);
  return { room: captureRoomSnapshot(room, context.world, false), visible: captureEntitySnapshots(contents, context.world) };
}

/**
 * The automatic look after a dark room is lit: the room description, then
 * its listable contents — exactly as the looking action emits them.
 *
 * @param context - The acting context
 * @param revealed - From captureRevealedRoom
 * @returns The room description event and, when anything is listable, the contents list
 */
export function revealedRoomEvents(context: ActionContext, revealed: RevealedRoom): ISemanticEvent[] {
  const room = revealed.room;
  const events: ISemanticEvent[] = [];
  // No messageId, as the looking action emits it: the engine's room handler
  // renders title and description. The live room entity carries the snippet
  // map (ADR-209); the snapshot does not.
  const roomSnippets = context.world.getEntity(room.id)?.getTrait(RoomTrait)?.snippets;
  events.push(context.event('if.event.room.description', {
    room,
    visibleItems: revealed.visible,
    roomId: room.id,
    roomName: room.name,
    roomDescription: room.description,
    ...(roomSnippets ? { roomSnippets } : {}),
    includeContents: true,
    verbose: true
  }));

  // Scenery belongs to the room's own prose, not the "You can see …" list,
  // as in the looking and going actions. A PhraseList of NounPhrases
  // (ADR-192), matching looking-data.ts.
  const listable = context.world.getContents(room.id)
    .filter((e) => e.id !== context.actor.id && !e.hasTrait(TraitType.SCENERY));
  if (listable.length > 0) {
    events.push(context.event('if.event.list.contents', {
      messageId: 'if.action.looking.contents_list',
      params: {
        items: { kind: 'list' as const, conj: 'and' as const, items: listable.map((e) => nounPhraseFor(e)) },
        count: listable.length
      }
    }));
  }
  return events;
}
