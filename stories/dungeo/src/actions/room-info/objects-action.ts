/**
 * Objects Action
 *
 * Prints the verbose description of all objects in the current room
 * without describing the room itself.
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, OpenableTrait } from '@sharpee/world-model';
import { OBJECTS_ACTION_ID, RoomInfoMessages } from './types';

interface ObjectInfo {
  id: string;
  name: string;
  description?: string;
}

interface ContainerContentsInfo {
  containerId: string;
  containerName: string;
  preposition: 'in' | 'on';
  items: ObjectInfo[];
}

export const objectsAction: Action = {
  id: OBJECTS_ACTION_ID,
  group: 'observation',

  validate(context: ActionContext): ValidationResult {
    return { valid: true };
  },

  execute(context: ActionContext): void {
    // No mutations needed
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: this.id,
      messageId: result.error,
      reason: result.error,
      params: result.params || {}
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const { world, player } = context;

    const room = world.getContainingRoom(player.id);
    if (!room) {
      return events;
    }

    // Get all entities directly in the room (excluding player and scenery)
    const contents = world.getContents(room.id);
    const visibleItems: ObjectInfo[] = [];
    const containerContents: ContainerContentsInfo[] = [];

    for (const entity of contents) {
      // Skip the player
      if (entity.id === player.id) continue;

      // Skip scenery
      if (entity.hasTrait(TraitType.SCENERY)) continue;

      // Skip NPCs marked as not visible for listing
      if (entity.hasTrait('npc')) {
        const npcTrait = entity.get('npc') as any;
        if (npcTrait && npcTrait.state === 'DISABLED') continue;
      }

      visibleItems.push({
        id: entity.id,
        name: entity.name,
        description: entity.description,
      });

      // Check if this is an open container with contents
      if (entity.hasTrait(TraitType.CONTAINER)) {
        const openableTrait = entity.get<OpenableTrait>(TraitType.OPENABLE);
        if (openableTrait?.isOpen) {
          const containerItems = world.getContents(entity.id);
          if (containerItems.length > 0) {
            const items: ObjectInfo[] = containerItems.map(item => ({
              id: item.id,
              name: item.name
            }));
            containerContents.push({
              containerId: entity.id,
              containerName: entity.name,
              preposition: 'in',
              items,
            });
          }
        }
      }

      // Check if this is a supporter with contents
      if (entity.hasTrait(TraitType.SUPPORTER)) {
        const supporterItems = world.getContents(entity.id);
        if (supporterItems.length > 0) {
          const items: ObjectInfo[] = supporterItems.map(item => ({
            id: item.id,
            name: item.name
          }));
          containerContents.push({
            containerId: entity.id,
            containerName: entity.name,
            preposition: 'on',
            items,
          });
        }
      }
    }

    // Emit objects event
    events.push(context.event('dungeo.event.objects', {
      roomId: room.id,
      items: visibleItems,
      containerContents,
      hasItems: visibleItems.length > 0,
    }));

    return events;
  }
};
