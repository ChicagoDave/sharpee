/**
 * NPC Module Exports (ADR-070)
 *
 * Provides the NPC decision layer for autonomous characters (ADR-328 D5):
 * behaviors decide, the engine's actor phase executes through the pipeline.
 */

// Types
export * from './types.js';

// Message IDs
export * from './npc-messages.js';
export * from './character-messages.js';

// Service
export {
  NpcService,
  createNpcService,
  type INpcService,
  type NpcTickContext,
  type NpcTickPhase,
} from './npc-service.js';

// Standard behaviors
export {
  guardBehavior,
  passiveBehavior,
  createWandererBehavior,
  createFollowerBehavior,
  createPatrolBehavior,
} from './behaviors.js';
