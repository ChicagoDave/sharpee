/**
 * Command Resolver - Transforms parsed commands into resolved commands
 * 
 * This component handles:
 * - Entity disambiguation
 * - Pronoun resolution
 * - "ALL" expansion
 * - Implicit object inference
 * - Spatial relation resolution
 */

import { 
  ParsedIFCommand, 
  ResolvedIFCommand, 
  ScoredMatch,
  SpatialReference 
} from '../parser/if-parser-types';
import { GameContext } from '../world-model/types';
import { EntityId } from '../core-imports';
import { IFEntity } from '../world-model/traits/if-entity';
import { IFEntityType } from '../constants/if-entity-types';
import { IFRelationshipType } from '../constants/if-relationships';

export interface DisambiguationStrategy {
  /**
   * Choose between ambiguous matches
   */
  disambiguate(
    matches: ScoredMatch[],
    context: 'noun' | 'second',
    command: ParsedIFCommand,
    gameContext: GameContext
  ): Promise<IFEntity | undefined>;
}

export interface ResolverOptions {
  /**
   * Strategy for handling disambiguation
   */
  disambiguationStrategy?: DisambiguationStrategy;
  
  /**
   * Whether to automatically infer implicit second objects
   */
  inferImplicitObjects?: boolean;
  
  /**
   * Maximum number of entities for "ALL" commands
   */
  maxAllTargets?: number;
}

export class CommandResolver {
  private options: Required<ResolverOptions>;
  private pronounAntecedent?: IFEntity;
  
  constructor(options: ResolverOptions = {}) {
    this.options = {
      disambiguationStrategy: options.disambiguationStrategy || new InteractiveDisambiguation(),
      inferImplicitObjects: options.inferImplicitObjects ?? true,
      maxAllTargets: options.maxAllTargets ?? 50
    };
  }
  
  /**
   * Resolve a parsed command into an executable command
   */
  async resolve(
    parsed: ParsedIFCommand,
    context: GameContext
  ): Promise<ResolvedIFCommand> {
    // Resolve actor
    const actor = context.world.getEntity(parsed.actor);
    if (!actor) {
      throw new Error(`Actor entity not found: ${parsed.actor}`);
    }
    
    // Start building resolved command
    const resolved: ResolvedIFCommand = {
      action: parsed.action,
      actor,
      preposition: parsed.preposition,
      text: parsed.text,
      pattern: parsed.pattern,
      originalInput: parsed.originalInput
    };
    
    // Handle "ALL" commands
    if (parsed.matchAll) {
      resolved.allTargets = await this.resolveAllTargets(parsed, context);
      return resolved;
    }
    
    // Resolve first noun
    if (parsed.noun && parsed.noun.length > 0) {
      const noun = await this.resolveEntity(parsed.noun, 'noun', parsed, context);
      if (noun) {
        resolved.noun = noun;
        // Update pronoun antecedent
        this.pronounAntecedent = noun;
      }
    }
    
    // Resolve second noun
    if (parsed.second && parsed.second.length > 0) {
      resolved.second = await this.resolveEntity(parsed.second, 'second', parsed, context);
    } else if (this.shouldInferSecond(parsed, resolved, context)) {
      // Try to infer implicit second object
      const inferred = await this.inferSecondObject(parsed, resolved, context);
      if (inferred) {
        resolved.second = inferred;
        resolved.implicitSecond = true;
      }
    }
    
    // Check for spatial relations in prepositions
    if (parsed.preposition && this.isSpatialPreposition(parsed.preposition)) {
      resolved.spatialRelation = await this.resolveSpatialRelation(parsed, resolved, context);
    }
    
    return resolved;
  }
  
  /**
   * Resolve a single entity from scored matches
   */
  private async resolveEntity(
    matches: ScoredMatch[],
    context: 'noun' | 'second',
    command: ParsedIFCommand,
    gameContext: GameContext
  ): Promise<IFEntity | undefined> {
    if (matches.length === 0) {
      return undefined;
    }
    
    if (matches.length === 1) {
      return matches[0].entity;
    }
    
    // Need disambiguation
    return this.options.disambiguationStrategy.disambiguate(
      matches,
      context,
      command,
      gameContext
    );
  }
  
  /**
   * Resolve "ALL" into specific entities
   */
  private async resolveAllTargets(
    parsed: ParsedIFCommand,
    context: GameContext
  ): Promise<IFEntity[]> {
    const targets: IFEntity[] = [];
    
    // Get scope based on action and preposition
    let scope: IFEntity[] = [];
    
    if (parsed.preposition === 'from' && parsed.second && parsed.second.length > 0) {
      // "TAKE ALL FROM BOX"
      const container = await this.resolveEntity(parsed.second, 'second', parsed, context);
      if (container) {
        const contents = container.relationships[IFRelationshipType.CONTAINS] || [];
        scope = contents.map(id => context.world.getEntity(id)).filter((e): e is IFEntity => !!e);
      }
    } else {
      // "TAKE ALL" - everything in current location
      const location = context.currentLocation;
      const contents = location.relationships[IFRelationshipType.CONTAINS] || [];
      scope = contents.map(id => context.world.getEntity(id)).filter((e): e is IFEntity => !!e);
    }
    
    // Filter based on action
    for (const entity of scope) {
      if (this.isValidForAction(entity, parsed.action, context)) {
        targets.push(entity);
        if (targets.length >= this.options.maxAllTargets) {
          break;
        }
      }
    }
    
    return targets;
  }
  
  /**
   * Check if we should try to infer a second object
   */
  private shouldInferSecond(
    parsed: ParsedIFCommand,
    resolved: Partial<ResolvedIFCommand>,
    context: GameContext
  ): boolean {
    if (!this.options.inferImplicitObjects) return false;
    if (!parsed.pattern.allowsImplicitSecond) return false;
    if (resolved.second) return false; // Already has second
    
    // Check if action typically needs a second object
    const needsSecond = ['unlocking', 'locking', 'lighting', 'digging', 'cutting'];
    return needsSecond.includes(parsed.action);
  }
  
  /**
   * Try to infer an implicit second object
   */
  private async inferSecondObject(
    parsed: ParsedIFCommand,
    resolved: Partial<ResolvedIFCommand>,
    context: GameContext
  ): Promise<IFEntity | undefined> {
    if (!resolved.noun) return undefined;
    
    const action = parsed.action;
    const target = resolved.noun;
    
    // Action-specific inference
    switch (action) {
      case 'unlocking':
      case 'locking': {
        // Find a key in inventory
        const inventory = context.player.relationships[IFRelationshipType.CONTAINS] || [];
        for (const id of inventory) {
          const item = context.world.getEntity(id);
          if (item && item.type === IFEntityType.KEY) {
            // Check if key matches the lock
            if (this.keyMatchesLock(item, target)) {
              return item;
            }
          }
        }
        break;
      }
      
      case 'lighting': {
        // Find matches, lighter, etc in inventory
        const inventory = context.player.relationships[IFRelationshipType.CONTAINS] || [];
        for (const id of inventory) {
          const item = context.world.getEntity(id);
          if (item && item.has && item.has('LIGHT_SOURCE')) {
            return item;
          }
        }
        break;
      }
    }
    
    return undefined;
  }
  
  /**
   * Check if an entity is valid for the given action
   */
  private isValidForAction(entity: IFEntity, action: string, context: GameContext): boolean {
    switch (action) {
      case 'taking':
        // Use trait-based checks
        return !entity.has || (entity.has('FIXED') === false &&
               !entity.isRoom &&
               entity.id !== context.player.id);
      
      case 'dropping':
        // Check if in inventory
        const inventory = context.player.relationships[IFRelationshipType.CONTAINS] || [];
        return inventory.includes(entity.id);
      
      default:
        return true;
    }
  }
  
  /**
   * Check if a preposition indicates spatial relation
   */
  private isSpatialPreposition(prep: string): boolean {
    const spatial = ['above', 'below', 'underneath', 'behind', 'under', 'over'];
    return spatial.includes(prep.toLowerCase());
  }
  
  /**
   * Resolve spatial relations
   */
  private async resolveSpatialRelation(
    parsed: ParsedIFCommand,
    resolved: Partial<ResolvedIFCommand>,
    context: GameContext
  ): Promise<SpatialReference | undefined> {
    if (!parsed.preposition || !resolved.second) return undefined;
    
    return {
      preposition: parsed.preposition,
      referenceEntity: resolved.second
    };
  }
  
  /**
   * Check if a key matches a lock
   */
  private keyMatchesLock(key: IFEntity, lock: IFEntity): boolean {
    // Check if lock specifies required key
    // Check lockable trait for required key
    const requiredKey = lock.has && lock.has('LOCKABLE') ? 
      (lock.get && lock.get('LOCKABLE')?.requiredKey) : undefined;
    if (requiredKey) {
      return key.id === requiredKey;
    }
    
    // Check if key specifies what it unlocks
    // Check key trait for what it unlocks
    const unlocks = key.has && key.has('KEY') ? 
      (key.get && key.get('KEY')?.unlocks) : undefined;
    if (unlocks) {
      return Array.isArray(unlocks) ? unlocks.includes(lock.id) : unlocks === lock.id;
    }
    
    // Default: any key works
    return true;
  }
}

/**
 * Default interactive disambiguation strategy
 */
export class InteractiveDisambiguation implements DisambiguationStrategy {
  async disambiguate(
    matches: ScoredMatch[],
    context: 'noun' | 'second',
    command: ParsedIFCommand,
    gameContext: GameContext
  ): Promise<IFEntity | undefined> {
    // For now, just pick the highest scoring match
    // In a real implementation, this would prompt the user
    return matches[0]?.entity;
  }
}

/**
 * Create a command resolver with options
 */
export function createCommandResolver(options?: ResolverOptions): CommandResolver {
  return new CommandResolver(options);
}
