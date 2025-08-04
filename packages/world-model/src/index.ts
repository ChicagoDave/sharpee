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

// Individual trait exports
export * from './traits/identity';
export * from './traits/container';
export * from './traits/room';
export * from './traits/openable';
export * from './traits/lockable';
export * from './traits/readable';
export * from './traits/light-source';
export * from './traits/exit';
export * from './traits/entry';
export * from './traits/scenery';
export * from './traits/supporter';
export * from './traits/switchable';
export * from './traits/wearable';
export * from './traits/edible';
export * from './traits/door';
export * from './traits/actor';
export * from './traits/attached';
export * from './traits/bell-pull';
export * from './traits/breakable';
export * from './traits/button';
export * from './traits/clothing';
export * from './traits/cord';
export * from './traits/crank';
export * from './traits/dial';
export * from './traits/fragile';
export * from './traits/knob';
export * from './traits/lever';
export * from './traits/moveable-scenery';
export * from './traits/pullable';
export * from './traits/pushable';
export * from './traits/turnable';
export * from './traits/valve';
export * from './traits/wheel';

// Extension system
export * from './extensions';

// World model
export * from './world';

// Services
export * from './services';

// Scope system
export * from './scope';
