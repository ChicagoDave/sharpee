// packages/extensions/mirrors/src/mirror-extension.ts

import { WorldModelExtension, WorldState, EntityId } from '@core/world-model/types';
import { CommandExtension, AbilityExtension, ExtensionType } from '@core/extensions/types';
import { ParsedCommand } from '@core/parser/core/types';
import { CommandResult, GameContext } from '@core/execution/types';
import { createEvent } from '@core/events/event-system';
import { StandardEventTypes, StandardEventTags } from '@core/events/standard-events';
import { StandardEntityAttributes } from '@core/world-model/implementations/entity-manager';

/**
 * Entity attributes specific to mirrors
 */
interface MirrorAttributes extends StandardEntityAttributes {
  reflective: boolean;
  quality: number; // 0-100, higher means better reflection
  sizeCategory: string; // small, medium, large
  portable: boolean;
  framed: boolean;
}

/**
 * Entity attributes specific to characters
 */
interface CharacterAttributes extends StandardEntityAttributes {
  abilities: string[]; // List of special abilities
  health: number;
  stats?: {
    strength?: number;
    dexterity?: number;
    intelligence?: number;
  };
}

/**
 * State extension for tracking mirror connections
 */
interface MirrorsState {
  connections: Record<string, string[]>;
  lastUsed?: {
    mirrorId: EntityId;
    timestamp: number;
  };
}

/**
 * WorldModel extension for mirrors
 */
export class MirrorsWorldModelExtension implements WorldModelExtension {
  public readonly id = 'mirrors';
  public readonly name = 'Mirrors World Model';
  public readonly version = '0.1.0';

  /**
   * Initialize mirror state
   */
  public initialize(state: WorldState): WorldState {
    // If the state already has mirror data, don't overwrite it
    if (state.extensions?.mirrors) {
      return state;
    }
    
    return {
      ...state,
      extensions: {
        ...state.extensions,
        mirrors: {
          connections: {},
          lastUsed: undefined
        } as MirrorsState
      }
    };
  }

  /**
   * Get mirror state from world state
   */
  public static getMirrorState(state: WorldState): MirrorsState {
    return (state.extensions?.mirrors as MirrorsState) || { connections: {} };
  }

  /**
   * Update mirror state in world state
   */
  public static updateMirrorState(state: WorldState, updateFn: (mirrorState: MirrorsState) => MirrorsState): WorldState {
    const currentMirrorState = MirrorsWorldModelExtension.getMirrorState(state);
    const newMirrorState = updateFn(currentMirrorState);
    
    return {
      ...state,
      extensions: {
        ...state.extensions,
        mirrors: newMirrorState
      }
    };
  }

  /**
   * Connect two mirrors
   */
  public static connectMirrors(state: WorldState, mirrorIdA: EntityId, mirrorIdB: EntityId): WorldState {
    return MirrorsWorldModelExtension.updateMirrorState(state, (mirrorState) => {
      const connections = { ...mirrorState.connections };
      
      // Add bidirectional connection
      connections[mirrorIdA] = [...(connections[mirrorIdA] || []), mirrorIdB];
      connections[mirrorIdB] = [...(connections[mirrorIdB] || []), mirrorIdA];
      
      // Ensure no duplicates
      connections[mirrorIdA] = Array.from(new Set(connections[mirrorIdA]));
      connections[mirrorIdB] = Array.from(new Set(connections[mirrorIdB]));
      
      return {
        ...mirrorState,
        connections
      };
    });
  }

  /**
   * Record mirror usage
   */
  public static recordMirrorUse(state: WorldState, mirrorId: EntityId): WorldState {
    return MirrorsWorldModelExtension.updateMirrorState(state, (mirrorState) => {
      return {
        ...mirrorState,
        lastUsed: {
          mirrorId,
          timestamp: Date.now()
        }
      };
    });
  }

  /**
   * Get connected mirrors
   */
  public static getConnectedMirrors(state: WorldState, mirrorId: EntityId): EntityId[] {
    const mirrorState = MirrorsWorldModelExtension.getMirrorState(state);
    return mirrorState.connections[mirrorId] || [];
  }
}

/**
 * Command extension for mirror-related commands
 */
export class MirrorCommandExtension implements CommandExtension {
  public readonly id = 'mirror-commands';
  public readonly name = 'Mirror Commands';
  public readonly version = '0.1.0';
  public readonly verbs = ['connect', 'link'];

  /**
   * Check if this extension can handle the command
   */
  public canHandle(command: ParsedCommand, context: GameContext): boolean {
    // Handle "connect/link mirror to/with mirror"
    if (this.verbs.includes(command.verb) && command.directObject?.includes('mirror')) {
      return true;
    }
    
    return false;
  }

  /**
   * Execute the command
   */
  public execute(command: ParsedCommand, context: GameContext): CommandResult {
    // Handle connect/link command
    const { player, currentLocation } = context;
    
    // Extract mirror names from command
    const targetMirror = command.directObject || '';
    const secondMirror = command.indirectObject || command.prepositions['to'] || command.prepositions['with'];
    
    if (!secondMirror) {
      return {
        success: false,
        events: [
          createEvent(StandardEventTypes.COMMAND_FAILED, {
            error: 'You need to specify which mirrors to connect.'
          })
        ],
        error: 'You need to specify which mirrors to connect.'
      };
    }
    
    // Find mirrors
    const mirror1 = context.findEntityByName(targetMirror, { 
      typeFilter: ['mirror', 'reflective-surface']
    });
    
    const mirror2 = context.findEntityByName(secondMirror, {
      typeFilter: ['mirror', 'reflective-surface']
    });
    
    if (!mirror1) {
      return {
        success: false,
        events: [
          createEvent(StandardEventTypes.COMMAND_FAILED, {
            error: `You don't see any ${targetMirror} here.`
          })
        ],
        error: `You don't see any ${targetMirror} here.`
      };
    }
    
    if (!mirror2) {
      return {
        success: false,
        events: [
          createEvent(StandardEventTypes.COMMAND_FAILED, {
            error: `You don't see any ${secondMirror} here.`
          })
        ],
        error: `You don't see any ${secondMirror} here.`
      };
    }
    
    // Check if player has Silver Blood ability
    const playerAttributes = player.attributes as CharacterAttributes;
    const abilities = playerAttributes.abilities || [];
    const hasSilverBlood = Array.isArray(abilities) && abilities.includes('silver');
    
    if (!hasSilverBlood) {
      return {
        success: false,
        events: [
          createEvent(StandardEventTypes.COMMAND_FAILED, {
            error: 'You do not possess the ability to connect mirrors.'
          })
        ],
        error: 'You do not possess the ability to connect mirrors.'
      };
    }
    
    // Connect the mirrors
    const updatedState = MirrorsWorldModelExtension.connectMirrors(
      context.worldState,
      mirror1.id,
      mirror2.id
    );
    
    // Update the context
    const newContext = context.updateWorldState(() => updatedState);
    
    // Create success event
    const connectEvent = createEvent(
      StandardEventTypes.MIRROR_CONNECTED,
      {
        mirror1: mirror1.id,
        mirror2: mirror2.id,
        mirror1Name: mirror1.attributes.name || 'first mirror',
        mirror2Name: mirror2.attributes.name || 'second mirror'
      },
      {
        actor: player.id,
        target: mirror1.id,
        instrument: mirror2.id,
        location: currentLocation.id,
        tags: [StandardEventTags.MIRROR_ABILITY]
      }
    );
    
    return {
      success: true,
      events: [connectEvent]
    };
  }
}

/**
 * Ability extension for mirror travel
 */
export class MirrorTravelAbility implements AbilityExtension {
  public readonly id = 'mirror-travel';
  public readonly name = 'Mirror Travel';
  public readonly version = '0.1.0';
  public readonly dependencies = ['mirrors'];
  
  /**
   * Initialize the ability
   */
  public initialize(context: GameContext): void {
    // No initialization needed
  }
  
  /**
   * Check if the ability can be used
   */
  public canUse(context: GameContext, targetId?: EntityId): boolean {
    const { player } = context;
    
    // Check if player has Silver Blood ability
    const playerAttributes = player.attributes as CharacterAttributes;
    const abilities = playerAttributes.abilities || [];
    const hasSilverBlood = Array.isArray(abilities) && abilities.includes('silver');
    
    if (!hasSilverBlood) return false;
    
    // If no target specified, check if there's a mirror in the current location
    if (!targetId) {
      const mirrors = context.getEntitiesByType('mirror')
        .filter(mirror => context.isVisible(mirror.id));
      
      return mirrors.length > 0;
    }
    
    // Otherwise, check if the target is a mirror and is visible
    const target = context.getEntity(targetId);
    if (!target) return false;
    
    return (target.type === 'mirror' || target.type === 'reflective-surface') && 
           context.isVisible(targetId);
  }
  
  /**
   * Execute the ability
   */
  public execute(context: GameContext, targetId?: EntityId): CommandResult {
    const { player, currentLocation } = context;
    
    // Find the target mirror if not specified
    let targetMirror;
    if (targetId) {
      targetMirror = context.getEntity(targetId);
    } else {
      const mirrors = context.getEntitiesByType('mirror')
        .filter(mirror => context.isVisible(mirror.id));
        
      if (mirrors.length === 0) {
        return {
          success: false,
          events: [
            createEvent(StandardEventTypes.ABILITY_FAILED, {
              error: 'There are no mirrors here to travel through.'
            })
          ],
          error: 'There are no mirrors here to travel through.'
        };
      }
      
      targetMirror = mirrors[0];
    }
    
    if (!targetMirror || !context.isVisible(targetMirror.id)) {
      return {
        success: false,
        events: [
          createEvent(StandardEventTypes.ABILITY_FAILED, {
            error: 'You cannot see that mirror clearly enough to travel through it.'
          })
        ],
        error: 'You cannot see that mirror clearly enough to travel through it.'
      };
    }
    
    // Get connected mirrors
    const connectedMirrorIds = MirrorsWorldModelExtension.getConnectedMirrors(
      context.worldState,
      targetMirror.id
    );
    
    if (connectedMirrorIds.length === 0) {
      return {
        success: false,
        events: [
          createEvent(StandardEventTypes.ABILITY_FAILED, {
            error: 'This mirror is not connected to any other mirrors.'
          })
        ],
        error: 'This mirror is not connected to any other mirrors.'
      };
    }
    
    // For simplicity, use the first connected mirror
    // In a real implementation, you'd provide a UI for choosing
    const destinationMirrorId = connectedMirrorIds[0];
    const destinationMirror = context.getEntity(destinationMirrorId);
    
    if (!destinationMirror) {
      return {
        success: false,
        events: [
          createEvent(StandardEventTypes.ABILITY_FAILED, {
            error: 'The connected mirror no longer exists.'
          })
        ],
        error: 'The connected mirror no longer exists.'
      };
    }
    
    // Find the destination room
    const destinationLocationIds = destinationMirror.relationships['containedBy'] || [];
    if (destinationLocationIds.length === 0) {
      return {
        success: false,
        events: [
          createEvent(StandardEventTypes.ABILITY_FAILED, {
            error: 'The connected mirror is not in a proper location.'
          })
        ],
        error: 'The connected mirror is not in a proper location.'
      };
    }
    
    const destinationLocationId = destinationLocationIds[0];
    const destinationLocation = context.getEntity(destinationLocationId);
    
    if (!destinationLocation) {
      return {
        success: false,
        events: [
          createEvent(StandardEventTypes.ABILITY_FAILED, {
            error: 'The destination location no longer exists.'
          })
        ],
        error: 'The destination location no longer exists.'
      };
    }
    
    // Record mirror usage
    const updatedState = MirrorsWorldModelExtension.recordMirrorUse(
      context.worldState,
      targetMirror.id
    );
    
    // Create travel event
    const travelEvent = createEvent(
      StandardEventTypes.MIRROR_TRAVERSED,
      {
        sourceMirror: targetMirror.id,
        destinationMirror: destinationMirror.id,
        sourceLocation: currentLocation.id,
        destinationLocation: destinationLocationId,
        sourceMirrorName: targetMirror.attributes.name || 'source mirror',
        destinationMirrorName: destinationMirror.attributes.name || 'destination mirror',
        sourceLocationName: currentLocation.attributes.name || 'source location',
        destinationLocationName: destinationLocation.attributes.name || 'destination location'
      },
      {
        actor: player.id,
        target: targetMirror.id,
        instrument: destinationMirror.id,
        location: currentLocation.id,
        tags: [StandardEventTags.MIRROR_ABILITY]
      }
    );
    
    return {
      success: true,
      events: [travelEvent],
      metadata: {
        newLocationId: destinationLocationId
      }
    };
  }
}

/**
 * Export all mirror-related extensions
 */
export const mirrorExtensions = {
  worldModel: new MirrorsWorldModelExtension(),
  commands: new MirrorCommandExtension(),
  abilities: new MirrorTravelAbility()
};