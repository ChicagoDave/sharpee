/**
 * World-Aware Parser - Integrates the enhanced parser with IFWorld
 * 
 * This module bridges the gap between the parser and the world model,
 * providing real-time scope calculation and entity resolution.
 */

import { IFWorld } from '../../world-model/if-world';
import { IFEntity, isContainer, isSupporter, isPerson } from '../../world-model/if-entities/types';
import { EntityId } from '../../world-model/types';
import { 
  IFParser, 
  ParseResult, 
  ScopeContext,
  IFCommand,
  GrammarPattern
} from '../if-parser-types';
import { EnhancedIFParser } from '../enhanced-if-parser';
import { ScopeHintType } from '../grammar';

/**
 * Configuration for world-aware parser
 */
export interface WorldAwareParserConfig {
  /** Maximum entities to show in disambiguation */
  maxDisambiguationOptions?: number;
  /** Track recently mentioned entities */
  trackRecentMentions?: boolean;
  /** Number of recent mentions to track */
  recentMentionLimit?: number;
}

/**
 * Parser that integrates with IFWorld for real-time scope and entity resolution
 */
export class WorldAwareParser implements IFParser {
  private parser: EnhancedIFParser;
  private world: IFWorld;
  private config: Required<WorldAwareParserConfig>;
  private recentlyMentioned: EntityId[] = [];

  constructor(
    parser: EnhancedIFParser,
    world: IFWorld,
    config: WorldAwareParserConfig = {}
  ) {
    this.parser = parser;
    this.world = world;
    this.config = {
      maxDisambiguationOptions: config.maxDisambiguationOptions ?? 5,
      trackRecentMentions: config.trackRecentMentions ?? true,
      recentMentionLimit: config.recentMentionLimit ?? 10
    };
  }

  /**
   * Parse input using real world scope
   */
  parse(input: string): ParseResult {
    // Calculate current scope from world
    const scope = this.calculateScope();
    
    // Get entity resolver
    const getEntity = (id: EntityId) => this.world.getEntity(id);
    
    // Parse with enhanced parser
    const result = this.parser.parse(input, scope, getEntity);
    
    // Track mentioned entities
    if (result.success && this.config.trackRecentMentions) {
      this.updateRecentMentions(result.commands);
    }
    
    return result;
  }

  /**
   * Continue parsing after disambiguation
   */
  continueWithDisambiguation(
    original: IFCommand,
    choice: EntityId,
    context: 'noun' | 'second'
  ): IFCommand {
    const result = this.parser.continueWithDisambiguation(original, choice, context);
    
    // Update recent mentions
    if (this.config.trackRecentMentions) {
      this.addRecentMention(choice);
    }
    
    return result;
  }

  /**
   * Add grammar pattern
   */
  addGrammar(pattern: GrammarPattern): void {
    this.parser.addGrammar(pattern);
  }

  /**
   * Get all grammar patterns
   */
  getGrammarPatterns(): GrammarPattern[] {
    return this.parser.getGrammarPatterns();
  }

  /**
   * Calculate scope from world state
   */
  private calculateScope(): ScopeContext {
    const worldScope = this.world.calculateScope();
    
    return {
      visible: worldScope.visible,
      reachable: worldScope.reachable,
      known: worldScope.known,
      recentlyMentioned: [...this.recentlyMentioned]
    };
  }

  /**
   * Update recently mentioned entities from commands
   */
  private updateRecentMentions(commands: IFCommand[]): void {
    for (const command of commands) {
      // Add primary noun
      if (command.noun && command.noun.length > 0) {
        this.addRecentMention(command.noun[0].entity.id);
      }
      
      // Add secondary noun
      if (command.second && command.second.length > 0) {
        this.addRecentMention(command.second[0].entity.id);
      }
    }
  }

  /**
   * Add entity to recent mentions
   */
  private addRecentMention(entityId: EntityId): void {
    // Remove if already present
    const index = this.recentlyMentioned.indexOf(entityId);
    if (index >= 0) {
      this.recentlyMentioned.splice(index, 1);
    }
    
    // Add to front
    this.recentlyMentioned.unshift(entityId);
    
    // Trim to limit
    if (this.recentlyMentioned.length > this.config.recentMentionLimit) {
      this.recentlyMentioned.length = this.config.recentMentionLimit;
    }
  }

  /**
   * Get recently mentioned entities
   */
  getRecentlyMentioned(): EntityId[] {
    return [...this.recentlyMentioned];
  }

  /**
   * Clear recent mentions
   */
  clearRecentMentions(): void {
    this.recentlyMentioned = [];
  }

  /**
   * Check if entity matches a scope hint using world state
   */
  checkScopeHint(entityId: EntityId, hint: ScopeHintType): boolean {
    const entity = this.world.getEntity(entityId);
    if (!entity) return false;

    const ifEntity = entity as IFEntity;
    
    switch (hint) {
      case ScopeHintType.HELD:
        // Check if entity is held by player
        return this.world.getLocation(entityId) === this.world.getPlayer()?.id;
        
      case ScopeHintType.REACHABLE:
        // Check if entity is reachable
        const scope = this.world.calculateScope();
        return scope.reachable.has(entityId);
        
      case ScopeHintType.VISIBLE:
        // Check if entity is visible
        return this.world.isVisible(entityId);
        
      case ScopeHintType.CONTAINER:
        return isContainer(ifEntity);
        
      case ScopeHintType.SUPPORTER:
        return isSupporter(ifEntity);
        
      case ScopeHintType.PERSON:
        return isPerson(ifEntity);
        
      case ScopeHintType.DOOR:
        return ifEntity.type === 'door';
        
      case ScopeHintType.OPENABLE:
        return ifEntity.attributes.openable === true;
        
      case ScopeHintType.LOCKABLE:
        return ifEntity.attributes.lockable === true;
        
      case ScopeHintType.WORN:
        // Check if worn by player
        return ifEntity.attributes.worn === true && 
               this.world.getLocation(entityId) === this.world.getPlayer()?.id;
        
      case ScopeHintType.WEARABLE:
        return ifEntity.attributes.wearable === true;
        
      case ScopeHintType.EDIBLE:
        return ifEntity.attributes.edible === true;
        
      case ScopeHintType.ENTERABLE:
        // Can enter containers, supporters, and rooms
        if (ifEntity.type === 'room') return true;
        if (isContainer(ifEntity) && ifEntity.attributes.enterable !== false) return true;
        if (isSupporter(ifEntity)) return true;
        return false;
        
      case ScopeHintType.SWITCHED_ON:
        return ifEntity.attributes.on === true;
        
      case ScopeHintType.SWITCHABLE:
        return ifEntity.attributes.switchable === true;
        
      default:
        return false;
    }
  }

  /**
   * Get entities matching a scope hint
   */
  getEntitiesMatchingHint(hint: ScopeHintType): IFEntity[] {
    const scope = this.world.calculateScope();
    const matches: IFEntity[] = [];
    
    // Check all entities in scope
    for (const entityId of scope.reachable) {
      if (this.checkScopeHint(entityId, hint)) {
        const entity = this.world.getEntity(entityId);
        if (entity) {
          matches.push(entity as IFEntity);
        }
      }
    }
    
    return matches;
  }

  /**
   * Get a description of what entities match a hint (for error messages)
   */
  getScopeHintDescription(hint: ScopeHintType): string {
    switch (hint) {
      case ScopeHintType.HELD:
        return 'something you are holding';
      case ScopeHintType.CONTAINER:
        return 'a container';
      case ScopeHintType.SUPPORTER:
        return 'something you can put things on';
      case ScopeHintType.PERSON:
        return 'a person';
      case ScopeHintType.DOOR:
        return 'a door';
      case ScopeHintType.OPENABLE:
        return 'something that can be opened';
      case ScopeHintType.LOCKABLE:
        return 'something that can be locked';
      case ScopeHintType.VISIBLE:
        return 'something visible';
      case ScopeHintType.REACHABLE:
        return 'something within reach';
      case ScopeHintType.WORN:
        return 'something you are wearing';
      case ScopeHintType.WEARABLE:
        return 'something that can be worn';
      case ScopeHintType.EDIBLE:
        return 'something edible';
      case ScopeHintType.ENTERABLE:
        return 'something you can enter';
      case ScopeHintType.SWITCHED_ON:
        return 'something that is switched on';
      case ScopeHintType.SWITCHABLE:
        return 'something that can be switched on or off';
      default:
        return 'something';
    }
  }
}

/**
 * Create a world-aware parser
 */
export function createWorldAwareParser(
  parser: EnhancedIFParser,
  world: IFWorld,
  config?: WorldAwareParserConfig
): WorldAwareParser {
  return new WorldAwareParser(parser, world, config);
}
