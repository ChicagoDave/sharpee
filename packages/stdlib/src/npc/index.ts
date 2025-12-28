/**
 * NPC Module Exports (ADR-070)
 *
 * Provides NPC behavior system for autonomous characters.
 */

// Types
export * from './types';

// Message IDs
export * from './npc-messages';

// Service
export { NpcService, createNpcService, type INpcService } from './npc-service';

// Standard behaviors
export {
  guardBehavior,
  passiveBehavior,
  createWandererBehavior,
  createFollowerBehavior,
  createPatrolBehavior,
} from './behaviors';
