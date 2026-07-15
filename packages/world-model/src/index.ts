// packages/world-model/src/index.ts

// Core entities
export * from './entities';

// Behaviors base
export * from './behaviors';

// Constants
export * from './constants';

// Commands and interfaces (IF-specific types)
export * from './commands';
export * from './interfaces';

// Traits
export * from './traits/trait';
export * from './traits/trait-types';
export * from './traits/implementations';

// State-derived adjective contributors (ADR-193)
export {
  registerAdjectiveContributor,
  getStateAdjectives,
  type AdjectiveContributor,
} from './state-adjectives';

// State-derived detail-clause contributors (ADR-195 S2)
export {
  registerClauseContributor,
  getStateClauses,
  type ClauseContributor,
} from './state-clauses';

// Individual trait exports
export * from './traits/identity';
export * from './traits/container';
export * from './traits/room';
export * from './traits/openable';
export * from './traits/lockable';
export * from './traits/readable';
export * from './traits/light-source';
export * from './traits/exit';
export * from './traits/climbable';
export * from './traits/scenery';
export * from './traits/supporter';
export * from './traits/switchable';
export * from './traits/wearable';
export * from './traits/edible';
export * from './traits/door';
export * from './traits/actor';
export * from './traits/attached';
export * from './traits/button';
export * from './traits/clothing';
export * from './traits/moveable-scenery';
export * from './traits/pullable';
export * from './traits/pushable';
export * from './traits/npc';
export * from './traits/vehicle';
export * from './traits/story-info';
export * from './traits/character-model';
export * from './traits/concealment';
export * from './traits/acoustic';
export * from './traits/listener';
export * from './traits/obstructor-protocol';

// Root-barrel hygiene fix (2026-07-14): these trait subdirs shipped with leaf
// barrels and a mid-level traits/index.ts export but were never enumerated in
// this root barrel, so their traits were unreachable via `@sharpee/world-model`
// (consumers reached them only through deep subpath imports). Enumerated here to
// close the gap. The four combat-family subdirs export their *Trait via the trait
// file directly — NOT the leaf barrel — because their behaviors are already
// re-exported by `./behaviors` above; a leaf-barrel `export *` would double-star
// those behavior symbols and silently drop them.
export * from './traits/enterable';
export * from './traits/equipped';
export * from './traits/open-inventory';
export * from './traits/region';
export * from './traits/scene';
export * from './traits/weapon/weaponTrait';
export * from './traits/breakable/breakableTrait';
export * from './traits/destructible/destructibleTrait';
export * from './traits/combatant/combatantTrait';

// Extension system
export * from './extensions';

// World model
export * from './world';

// Scope system
export * from './scope';

// Event system types (basic types only - ADR-075 effects moved to event-processor)
export * from './events/types';

// Capability dispatch system (ADR-090)
export * from './capabilities';

// Annotations (ADR-124)
export * from './annotations';
