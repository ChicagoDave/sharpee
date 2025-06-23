/**
 * Compatibility adapter for the old RuleSystem interface
 * This allows existing code to work with the new simple rule system
 */

import { SemanticEvent } from '../events/types';
import { SimpleRuleSystemImpl } from './simple-rule-system';
import { RuleWorld } from './types';

/**
 * Game context interface that the old system expects
 */
interface GameContext {
  worldState: any;
  player: any;
  currentLocation: any;
  getEntity: (id: string) => any;
  updateWorldState?: (updater: (state: any) => any) => GameContext;
  [key: string]: any;
}

/**
 * Result interface that the old system expects
 */
interface OldRuleResult {
  prevented: boolean;
  preventMessage?: string;
  events: SemanticEvent[];
  context: GameContext;
}

/**
 * Old RuleSystem interface for compatibility
 */
export interface RuleSystem {
  processEvent(event: SemanticEvent, context: GameContext): OldRuleResult;
}

/**
 * Adapter that makes the new SimpleRuleSystem compatible with old interfaces
 */
export class RuleSystemAdapter implements RuleSystem {
  constructor(private simpleRuleSystem: SimpleRuleSystemImpl) {}

  processEvent(event: SemanticEvent, context: GameContext): OldRuleResult {
    // Create a RuleWorld adapter from the GameContext
    const world = createRuleWorldFromGameContext(context);
    
    // Process through the simple rule system
    const result = this.simpleRuleSystem.processEvent(event, world);
    
    // Convert back to old format
    return {
      prevented: result.prevent || false,
      preventMessage: result.message,
      events: result.events || [],
      context: context // Return original context for now
    };
  }
}

/**
 * Create a RuleWorld from a GameContext
 */
function createRuleWorldFromGameContext(context: GameContext): RuleWorld {
  return {
    getEntity: (id: string) => context.getEntity(id),
    updateEntity: (id: string, changes: Record<string, any>) => {
      // For now, just update the entity directly
      const entity = context.getEntity(id);
      if (entity) {
        if (entity.attributes) {
          Object.assign(entity.attributes, changes);
        } else {
          Object.assign(entity, changes);
        }
      }
    },
    getPlayer: () => context.player,
    getCurrentLocation: () => context.currentLocation
  };
}

/**
 * Create a compatible rule system
 */
export function createRuleSystem(): RuleSystem {
  const simpleRuleSystem = new SimpleRuleSystemImpl();
  return new RuleSystemAdapter(simpleRuleSystem);
}
