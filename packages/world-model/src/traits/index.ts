// packages/world-model/src/traits/index.ts
// Central export point for all traits

// Base trait types
export * from './trait.js';
export * from './trait-types.js';
export * from './implementations.js';

// Individual trait modules (each exports both Trait and Behavior)
export * from './identity/index.js';
export * from './container/index.js';
export * from './room/index.js';
export * from './openable/index.js';
export * from './lockable/index.js';
export * from './cuttable/index.js';
export * from './diggable/index.js';
export * from './readable/index.js';
export * from './light-source/index.js';
export * from './exit/index.js';
export * from './climbable/index.js';
export * from './scenery/index.js';
export * from './supporter/index.js';
export * from './switchable/index.js';
export * from './wearable/index.js';
export * from './clothing/index.js';
export * from './edible/index.js';
export * from './door/index.js';
export * from './region/index.js';
export * from './scene/index.js';
export * from './actor/index.js';

// Manipulation traits
export * from './pullable/index.js';
export * from './attached/index.js';
export * from './pushable/index.js';
export * from './button/index.js';
export * from './moveable-scenery/index.js';

// Combat traits
export * from './weapon/index.js';
export * from './breakable/index.js';
export * from './destructible/index.js';
export * from './combatant/index.js';
export * from './equipped/index.js';

// Health / life-state (ADR-226, ADR-223 child A)
export * from './health/index.js';
export * from './deadly-room/index.js';

// Transport traits
export * from './vehicle/index.js';
export * from './enterable/index.js';

// NPC traits
export * from './npc/index.js';
export * from './open-inventory/index.js';

// Character model (ADR-141)
export * from './character-model/index.js';

// Concealment traits (ADR-148)
export * from './concealment/index.js';

// System traits
export * from './story-info/index.js';

// Wall obstructor protocol (ADR-173 Phase 5)
export * from './obstructor-protocol.js';

// Spatial sound traits (ADR-172 Phase 2)
export * from './acoustic/index.js';
export * from './listener/index.js';

// Register function
export * from './register-all.js';

// All traits in one import
export * from './all-traits.js';
