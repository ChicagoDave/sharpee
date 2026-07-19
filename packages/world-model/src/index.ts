// packages/world-model/src/index.ts

// Core entities
export * from './entities/index.js';

// Behaviors base
export * from './behaviors/index.js';

// Constants
export * from './constants/index.js';

// Commands and interfaces (IF-specific types)
export * from './commands/index.js';
export * from './interfaces/index.js';

// Traits
export * from './traits/trait.js';
export * from './traits/trait-types.js';
export * from './traits/implementations.js';

// State-derived adjective contributors (ADR-193)
export {
  registerAdjectiveContributor,
  getStateAdjectives,
  type AdjectiveContributor,
} from './state-adjectives.js';

// State-derived detail-clause contributors (ADR-195 S2)
export {
  registerClauseContributor,
  getStateClauses,
  type ClauseContributor,
} from './state-clauses.js';

// Individual trait exports
export * from './traits/identity/index.js';
export * from './traits/container/index.js';
export * from './traits/room/index.js';
export * from './traits/openable/index.js';
export * from './traits/lockable/index.js';
export * from './traits/cuttable/index.js';
export * from './traits/diggable/index.js';
export * from './traits/readable/index.js';
export * from './traits/light-source/index.js';
export * from './traits/exit/index.js';
export * from './traits/climbable/index.js';
export * from './traits/scenery/index.js';
export * from './traits/supporter/index.js';
export * from './traits/switchable/index.js';
export * from './traits/wearable/index.js';
export * from './traits/edible/index.js';
export * from './traits/door/index.js';
export * from './traits/actor/index.js';
export * from './traits/attached/index.js';
export * from './traits/button/index.js';
export * from './traits/clothing/index.js';
export * from './traits/moveable-scenery/index.js';
export * from './traits/pullable/index.js';
export * from './traits/pushable/index.js';
export * from './traits/npc/index.js';
export * from './traits/vehicle/index.js';
export * from './traits/story-info/index.js';
export * from './traits/character-model/index.js';
export * from './traits/concealment/index.js';
export * from './traits/acoustic/index.js';
export * from './traits/listener/index.js';
export * from './traits/obstructor-protocol.js';

// Root-barrel hygiene fix (2026-07-14): these trait subdirs shipped with leaf
// barrels and a mid-level traits/index.ts export but were never enumerated in
// this root barrel, so their traits were unreachable via `@sharpee/world-model`
// (consumers reached them only through deep subpath imports). Enumerated here to
// close the gap. The four combat-family subdirs export their *Trait via the trait
// file directly — NOT the leaf barrel — because their behaviors are already
// re-exported by `./behaviors` above; a leaf-barrel `export *` would double-star
// those behavior symbols and silently drop them.
export * from './traits/enterable/index.js';
export * from './traits/equipped/index.js';
export * from './traits/open-inventory/index.js';
export * from './traits/region/index.js';
export * from './traits/scene/index.js';
export * from './traits/weapon/weaponTrait.js';
export * from './traits/breakable/breakableTrait.js';
export * from './traits/destructible/destructibleTrait.js';
export * from './traits/combatant/combatantTrait.js';
// Health trait (ADR-226) — trait file direct; HealthBehavior comes via `./behaviors`
export * from './traits/health/healthTrait.js';
// Deadly-room trigger shape (ADR-224) — leaf barrel (trait + behavior + verdict type)
export * from './traits/deadly-room/index.js';

// Extension system
export * from './extensions/index.js';

// World model
export * from './world/index.js';

// Scope system
export * from './scope/index.js';

// Event system types (basic types only - ADR-075 effects moved to event-processor)
export * from './events/types.js';

// Capability dispatch system (ADR-090)
export * from './capabilities/index.js';

// Annotations (ADR-124)
export * from './annotations/index.js';
