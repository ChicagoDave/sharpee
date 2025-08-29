// packages/world-model/src/traits/index.ts
// Central export point for all traits

// Base trait types
export * from './trait';
export * from './trait-types';
export * from './implementations';

// Individual trait modules (each exports both Trait and Behavior)
export * from './identity';
export * from './container';
export * from './room';
export * from './openable';
export * from './lockable';
export * from './readable';
export * from './light-source';
export * from './exit';
export * from './climbable';
export * from './scenery';
export * from './supporter';
export * from './switchable';
export * from './wearable';
export * from './clothing';
export * from './edible';
export * from './door';
export * from './actor';

// Manipulation traits
export * from './pullable';
export * from './attached';
export * from './pushable';
export * from './button';
export * from './moveable-scenery';

// Register function
export * from './register-all';

// All traits in one import
export * from './all-traits';
