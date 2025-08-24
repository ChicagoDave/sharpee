/**
 * Test utilities for stdlib tests
 * 
 * This module provides helper functions to create test contexts,
 * set up basic worlds, and validate events in action tests.
 */

import { 
  SemanticEvent
} from '@sharpee/core';
import {
  WorldModel,
  IFEntity,
  TraitType,
  ValidatedCommand
} from '@sharpee/world-model';
import { registerStandardCapabilities } from '../../src/capabilities';
import { createActionContext } from '../../src/actions/enhanced-context';
import { Action, ActionContext } from '../../src/actions/enhanced-types';

/**
 * Creates a basic test world with player and room
 * @param options Configuration options
 * @param options.capabilities Array of capability names to register (defaults to all)
 */
export function setupBasicWorld(options: {
  capabilities?: string[];
} = {}) {
  const world = new WorldModel();
  
  // Register capabilities (default to all if not specified)
  registerStandardCapabilities(world, options.capabilities);
  
  // Create room
  const room = world.createEntity('Test Room', 'room');
  room.add({ type: TraitType.ROOM });
  
  // Create player
  const player = world.createEntity('yourself', 'actor');
  player.add({ type: TraitType.ACTOR });
  player.add({ type: TraitType.CONTAINER });
  
  // Move player to room
  world.moveEntity(player.id, room.id);
  
  // Set player as the active player
  world.setPlayer(player.id);
  
  return { world, player, room };
}

/**
 * Creates a real action context for testing
 */
export function createRealTestContext(
  action: Action,
  world: WorldModel,
  command: ValidatedCommand
): ActionContext {
  const player = world.getPlayer();
  if (!player) {
    throw new Error('No player set in world model');
  }
  
  const locationId = world.getLocation(player.id);
  let location = null;
  let currentLocation = null;
  
  if (locationId) {
    location = world.getEntity(locationId);
    if (!location) {
      throw new Error('Player location entity not found');
    }
    // Use the immediate location for currentLocation (for actions like looking)
    currentLocation = location;
  }
  
  // Create base context with shared data support
  const baseContext: ActionContext = {
    world,
    player,
    command,
    currentLocation: currentLocation!,
    canSee: (entity) => world.canSee(player.id, entity.id),
    canReach: (entity) => {
      // Basic reachability logic
      if (!world.canSee(player.id, entity.id)) return false;
      
      // Can always reach things we're carrying
      if (world.getLocation(entity.id) === player.id) return true;
      
      // Check if in same room
      const playerRoom = world.getContainingRoom(player.id);
      const entityRoom = world.getContainingRoom(entity.id);
      if (!playerRoom || !entityRoom || playerRoom.id !== entityRoom.id) {
        return false;
      }
      
      // Check position-based reachability
      const entityIdentity = entity.get(TraitType.IDENTITY);
      if (entityIdentity && (entityIdentity as any).position) {
        const pos = (entityIdentity as any).position;
        // Items with y > 3 are considered out of reach
        if (pos.y && pos.y > 3) {
          return false;
        }
      }
      
      return true;
    },
    canTake: (entity) => !entity.hasTrait(TraitType.SCENERY) && !entity.hasTrait(TraitType.ROOM) && !entity.hasTrait(TraitType.DOOR),
    isInScope: (entity) => world.getInScope(player.id).some(e => e.id === entity.id),
    getVisible: () => world.getVisible(player.id),
    getInScope: () => world.getInScope(player.id),
    // Add shared data support for actions that need it (like quitting)
    getSharedData: () => ({
      score: 0,
      moves: 0,
      hasUnsavedChanges: false,
      stats: {
        maxScore: 100,
        nearComplete: false,
        playTime: 0,
        achievements: []
      }
    })
  } as ActionContext & { getSharedData?: () => any };
  
  return createActionContext(world, player, action, command);
}

/**
 * Creates a validated command for testing
 * 
 * @param actionId The action ID (e.g., 'if.action.taking')
 * @param options Command options
 * @param options.verb The verb that was parsed (defaults to first word of action ID after last dot)
 * @param options.entity The resolved entity (if CommandValidator found it)
 * @param options.secondEntity The resolved indirect object entity
 * @param options.preposition The preposition in the command
 * @param options.extras Extra command data
 * @param options.nounPhrase Text that parser found but validator couldn't resolve
 * @param options.rawInput The raw input string (defaults to verb)
 */
export function createCommand(
  actionId: string,
  options: {
    verb?: string;
    entity?: IFEntity;
    secondEntity?: IFEntity;
    preposition?: string;
    extras?: Record<string, any>;
    nounPhrase?: string; // For simulating unresolved entities
    rawInput?: string;
  } = {}
): ValidatedCommand {
  // Extract verb from action ID if not provided
  const verb = options.verb || actionId.split('.').pop() || 'unknown';
  const rawInput = options.rawInput || verb;
  
  const structure: any = { 
    verb: { 
      tokens: [0], 
      text: verb, 
      head: verb 
    } 
  };
  
  // If we have an entity, add direct object structure
  if (options.entity) {
    structure.directObject = {
      tokens: [1],
      text: options.entity.name,
      head: options.entity.name,
      modifiers: [],
      articles: [],
      determiners: [],
      candidates: [options.entity.name]
    };
  }
  // If we have a noun phrase but no entity, create a proper directObject structure
  // This simulates what happens when the parser finds a noun but validator can't resolve it
  else if (options.nounPhrase) {
    structure.directObject = {
      tokens: [1],
      text: options.nounPhrase,
      head: options.nounPhrase,
      modifiers: [],
      articles: [],
      determiners: [],
      candidates: [options.nounPhrase]
    };
  }
  
  // Add preposition to structure if provided
  if (options.preposition) {
    structure.preposition = { 
      tokens: structure.directObject ? [2] : [1],
      text: options.preposition 
    };
  }
  
  // Add indirect object if provided
  if (options.secondEntity) {
    structure.indirectObject = {
      tokens: structure.preposition ? [3] : [2],
      text: options.secondEntity.name,
      head: options.secondEntity.name,
      modifiers: [],
      articles: [],
      determiners: [],
      candidates: [options.secondEntity.name]
    };
  }
  
  let pattern = 'VERB_ONLY';
  if (options.entity || options.nounPhrase) {
    pattern = options.secondEntity ? 'VERB_NOUN_PREP_NOUN' : 'VERB_NOUN';
  }
  
  return {
    parsed: {
      rawInput,
      action: actionId, // In normal flow, parser resolves verb to action ID
      tokens: [],
      structure,
      pattern,
      confidence: 1.0,
      extras: options.extras || {}
    },
    actionId: actionId,
    directObject: options.entity ? { 
      entity: options.entity,
      parsed: structure.directObject
    } : undefined,
    indirectObject: options.secondEntity ? { 
      entity: options.secondEntity,
      parsed: structure.indirectObject
    } : undefined
  };
}

/**
 * Export createRealTestContext as createTestContext for backward compatibility
 */
export const createTestContext = createRealTestContext;


/**
 * Asserts that an event exists in the event list with the expected properties
 * 
 * Updated to handle our new standardized event structure where the actual
 * event data is nested in event.data.data
 */
export function expectEvent(
  events: SemanticEvent[],
  eventType: string,
  expectedData?: Record<string, any>
) {
  const event = events.find(e => e.type === eventType);
  
  if (!event) {
    throw new Error(`Expected event of type '${eventType}' not found. Found events: ${events.map(e => e.type).join(', ')}`);
  }
  
  if (expectedData) {
    // Handle our new structure where event data is in data.data (for platform events with payload, use payload.data)
    const eventData = (event as any).payload?.data || (event.data as any)?.data || event.data || {};
    
    Object.entries(expectedData).forEach(([key, value]) => {
      // Special handling for old test format
      if (key === 'messageId' || key === 'params' || key === 'reason') {
        // These are at the data level (or payload for platform events), not nested
        const topLevelData = (event as any).payload || event.data || {};
        if (typeof value === 'object' && value && value.asymmetricMatch) {
          expect(topLevelData[key]).toEqual(value);
        } else {
          expect(topLevelData[key]).toEqual(value);
        }
      } else {
        // Regular event data is in the nested data field
        if (typeof value === 'object' && value && value.asymmetricMatch) {
          expect(eventData[key]).toEqual(value);
        } else {
          expect(eventData[key]).toEqual(value);
        }
      }
    });
  }
}

/**
 * Test data builder for common test scenarios
 */
export class TestData {
  /**
   * Creates a world with an object with specific traits
   */
  static withObject(name: string, traits: Record<string, any> = {}, worldOptions?: { capabilities?: string[] }) {
    const { world, player, room } = setupBasicWorld(worldOptions);
    
    const object = world.createEntity(name, 'object');
    
    // Add each trait
    Object.entries(traits).forEach(([traitType, traitData]) => {
      if (typeof traitData === 'object' && traitData.type) {
        object.add(traitData);
      } else {
        object.add({ type: traitType, ...traitData });
      }
    });
    
    // Move object to room by default
    world.moveEntity(object.id, room.id);
    
    return { world, player, room, object };
  }
  
  /**
   * Creates a world with a container holding an object
   */
  static withContainer(containerName: string, objectName: string, worldOptions?: { capabilities?: string[] }) {
    const { world, player, room } = setupBasicWorld(worldOptions);
    
    const container = world.createEntity(containerName, 'object');
    container.add({ type: TraitType.CONTAINER });
    
    const object = world.createEntity(objectName, 'object');
    
    world.moveEntity(container.id, room.id);
    world.moveEntity(object.id, container.id);
    
    return { world, player, room, container, object };
  }
  
  /**
   * Creates a world with an NPC
   */
  static withNPC(name: string, traits: Record<string, any> = {}, worldOptions?: { capabilities?: string[] }) {
    const { world, player, room } = setupBasicWorld(worldOptions);
    
    const npc = world.createEntity(name, 'actor');
    npc.add({ type: TraitType.ACTOR });
    
    // Add additional traits
    Object.entries(traits).forEach(([traitType, traitData]) => {
      if (typeof traitData === 'object' && traitData.type) {
        npc.add(traitData);
      } else {
        npc.add({ type: traitType, ...traitData });
      }
    });
    
    world.moveEntity(npc.id, room.id);
    
    return { world, player, room, npc };
  }
  
  /**
   * Creates a world with an item in the player's inventory
   */
  static withInventoryItem(name: string, traits: Record<string, any> = {}, worldOptions?: { capabilities?: string[] }) {
    const { world, player, room } = setupBasicWorld(worldOptions);
    
    const item = world.createEntity(name, 'object');
    
    // Add traits
    Object.entries(traits).forEach(([traitType, traitData]) => {
      if (typeof traitData === 'object' && traitData.type) {
        item.add(traitData);
      } else {
        item.add({ type: traitType, ...traitData });
      }
    });
    
    // Move item to player inventory
    world.moveEntity(item.id, player.id);
    
    return { world, player, room, item };
  }
}

/**
 * Helper to find entity by name in world
 */
export function findEntityByName(world: WorldModel, name: string): IFEntity | undefined {
  const entities = world.getAllEntities();
  return entities.find(e => e.name === name);
}

/**
 * Helper to update capability data in tests
 * This properly merges with existing data
 */
export function updateCapability(world: WorldModel, capabilityName: string, data: any): void {
  const currentData = world.getCapability(capabilityName) || {};
  world.updateCapability(capabilityName, {
    ...currentData,
    ...data
  });
}

// Parser helpers are available separately if needed
// but not exported by default to avoid circular dependencies
// import { createParserWithLanguage } from './parser-helpers';
