// packages/stdlib/src/handlers/look-handler.ts

import { ParsedCommand } from '@core/parser/core/types';
import { Entity, EntityId, RelationshipType } from '@core/world-model/types';
import { CommandResult, GameContext } from '@core/execution/types';
import { BaseCommandHandler } from '@core/execution/command-handler';
import { createEvent } from '@core/events/event-system';
import { StandardEventTypes, StandardEventTags } from '@core/events/standard-events';

/**
 * Handler for the 'look' command and its synonyms
 */
export class LookHandler extends BaseCommandHandler {
  constructor() {
    super(['look', 'examine', 'x', 'inspect', 'check']);
  }

  /**
   * Execute the look command
   */
  public execute(command: ParsedCommand, context: GameContext): CommandResult {
    // Handle looking around (no direct object)
    if (!command.directObject) {
      return this.lookAround(context);
    }

    // Handle looking at specific object
    return this.lookAtObject(command.directObject, context);
  }

  /**
   * Validate the look command
   */
  public validate(command: ParsedCommand, context: GameContext): { valid: boolean; error?: string } {
    // Looking around is always valid
    if (!command.directObject) {
      return { valid: true };
    }

    // Validate looking at an object
    const targetEntity = context.findEntityByName(command.directObject);
    
    if (!targetEntity) {
      return {
        valid: false,
        error: `You don't see any ${command.directObject} here.`
      };
    }

    // Check if the entity is visible
    if (!context.isVisible(targetEntity.id)) {
      return {
        valid: false,
        error: `You don't see any ${command.directObject} here.`
      };
    }

    return { valid: true };
  }

  /**
   * Look around the current location
   */
  private lookAround(context: GameContext): CommandResult {
    const { currentLocation, player } = context;
    
    // Create an event for looking around
    const lookEvent = createEvent(
      StandardEventTypes.ITEM_EXAMINED,
      {
        location: currentLocation.id,
        description: currentLocation.attributes.description || 'You see nothing special.',
        exits: this.getExits(currentLocation, context),
        visibleItems: this.getVisibleItems(currentLocation, context)
      },
      {
        actor: player.id,
        target: currentLocation.id,
        location: currentLocation.id,
        tags: [StandardEventTags.VISIBLE]
      }
    );

    // Return success result with the look event
    return this.createSuccessResult([lookEvent]);
  }

  /**
   * Look at a specific object
   */
  private lookAtObject(objectName: string, context: GameContext): CommandResult {
    const { player, currentLocation } = context;
    
    // Find the entity being looked at
    const targetEntity = context.findEntityByName(objectName);
    
    if (!targetEntity) {
      return this.createFailureResult(`You don't see any ${objectName} here.`);
    }

    // Check if the entity is visible
    if (!context.isVisible(targetEntity.id)) {
      return this.createFailureResult(`You don't see any ${objectName} here.`);
    }

    // Get entity description
    const description = targetEntity.attributes.description || `You see nothing special about the ${objectName}.`;
    
    // Get contents if it's a container and it's open
    let contents: Entity[] = [];
    if (
      targetEntity.attributes.container === true &&
      targetEntity.attributes.open === true
    ) {
      const contentIds = targetEntity.relationships[RelationshipType.CONTAINS] || [];
      contents = contentIds
        .map(id => context.getEntity(id))
        .filter((e): e is Entity => !!e && context.isVisible(e.id));
    }

    // Create an event for examining the object
    const examineEvent = createEvent(
      StandardEventTypes.ITEM_EXAMINED,
      {
        itemName: targetEntity.attributes.name || objectName,
        description,
        isContainer: targetEntity.attributes.container === true,
        isOpen: targetEntity.attributes.open === true,
        contents: contents.map(e => ({
          id: e.id,
          name: e.attributes.name,
          type: e.type
        }))
      },
      {
        actor: player.id,
        target: targetEntity.id,
        location: currentLocation.id,
        tags: [StandardEventTags.VISIBLE]
      }
    );

    // Return success result with the examine event
    return this.createSuccessResult([examineEvent]);
  }

  /**
   * Get exits from a location
   */
  private getExits(location: Entity, context: GameContext): Record<string, string> {
    const exits: Record<string, string> = {};
    
    // Check for connections to other locations
    const connections = location.relationships[RelationshipType.CONNECTS_TO] || [];
    
    for (const connectionId of connections) {
      const connection = context.getEntity(connectionId);
      if (!connection) continue;
      
      // Skip if the connection is not accessible (e.g., locked door)
      if (connection.attributes.accessible === false) continue;
      
      // Get the direction
      const direction = connection.attributes.direction as string;
      if (!direction) continue;
      
      // Get the destination
      const destinationIds = connection.relationships[RelationshipType.CONNECTS_TO] || [];
      const destinationId = destinationIds.find(id => id !== location.id);
      if (!destinationId) continue;
      
      const destination = context.getEntity(destinationId);
      if (!destination) continue;
      
      // Add the exit
      exits[direction] = destination.attributes.name as string || 'unknown location';
    }
    
    return exits;
  }

  /**
   * Get visible items in a location
   */
  private getVisibleItems(location: Entity, context: GameContext): Array<{ id: EntityId; name: string; type: string }> {
    const containedIds = location.relationships[RelationshipType.CONTAINS] || [];
    
    return containedIds
      .map(id => context.getEntity(id))
      .filter((e): e is Entity => !!e && context.isVisible(e.id) && e.id !== context.player.id)
      .map(e => ({
        id: e.id,
        name: e.attributes.name as string || 'unnamed object',
        type: e.type
      }));
  }
}

/**
 * Create a new look command handler
 */
export function createLookHandler(): LookHandler {
  return new LookHandler();
}