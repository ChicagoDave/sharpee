/**
 * NPC Module Exports (ADR-070)
 *
 * Provides NPC behavior system for autonomous characters.
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
  registerNpcCombatResolver,
  clearNpcCombatResolver,
  type INpcService,
  type NpcCombatResolver,
  type NpcTickContext,
  type NpcTickPhase,
} from './npc-service.js';

// Character model observation and lucidity (ADR-141)
export {
  observeEvent,
  filterPerception,
  injectHallucinations,
  DefaultStateTransitions,
  type StateTransitionRule,
} from './character-observer.js';
export {
  processLucidityDecay,
  enterLucidityWindow,
  DECAY_RATE_TURNS,
} from './lucidity-decay.js';

// Standard behaviors
export {
  guardBehavior,
  passiveBehavior,
  createWandererBehavior,
  createFollowerBehavior,
  createPatrolBehavior,
} from './behaviors.js';
