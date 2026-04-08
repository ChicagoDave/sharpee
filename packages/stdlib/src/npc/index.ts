/**
 * NPC Module Exports (ADR-070)
 *
 * Provides NPC behavior system for autonomous characters.
 */

// Types
export * from './types';

// Message IDs
export * from './npc-messages';
export * from './character-messages';

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
} from './npc-service';

// Character model observation and lucidity (ADR-141)
export {
  observeEvent,
  filterPerception,
  injectHallucinations,
  DefaultStateTransitions,
  type StateTransitionRule,
} from './character-observer';
export {
  processLucidityDecay,
  enterLucidityWindow,
  DECAY_RATE_TURNS,
} from './lucidity-decay';

// Standard behaviors
export {
  guardBehavior,
  passiveBehavior,
  createWandererBehavior,
  createFollowerBehavior,
  createPatrolBehavior,
} from './behaviors';
