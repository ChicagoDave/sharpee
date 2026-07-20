// packages/world-model/src/behaviors/index.ts

export { Behavior, IWorldAwareBehavior, isWorldAwareBehavior } from './behavior.js';

// Re-export all behavior classes as they are added
// These will come from the trait folders
export { ContainerBehavior } from '../traits/container/containerBehavior.js';
export { SceneryBehavior } from '../traits/scenery/sceneryBehavior.js';
export { WearableBehavior } from '../traits/wearable/wearableBehavior.js';
export { ReadableBehavior } from '../traits/readable/readableBehavior.js';
export { LightSourceBehavior } from '../traits/light-source/lightSourceBehavior.js';
export { ExitBehavior } from '../traits/exit/exitBehavior.js';
export { ClimbableBehavior } from '../traits/climbable/climbableBehavior.js';
export { OpenableBehavior } from '../traits/openable/openableBehavior.js';
export { LockableBehavior } from '../traits/lockable/lockableBehavior.js';

// Combat behaviors
export { WeaponBehavior } from '../traits/weapon/weaponBehavior.js';
export { BreakableBehavior } from '../traits/breakable/breakableBehavior.js';
export { DestructibleBehavior } from '../traits/destructible/destructibleBehavior.js';
export { CombatBehavior } from '../traits/combatant/combatantBehavior.js';
export { AttackBehavior, IAttackResult, AttackIneffectiveReason } from './attack.js';

// Health / life-state (ADR-226, ADR-223 child A)
export { HealthBehavior } from '../traits/health/healthBehavior.js';

// Export result types from behaviors
export type { IOpenResult, ICloseResult } from '../traits/openable/openableBehavior.js';
export type { IWeaponDamageResult } from '../traits/weapon/weaponBehavior.js';
export type { IBreakResult } from '../traits/breakable/breakableBehavior.js';
export type { IDamageResult } from '../traits/destructible/destructibleBehavior.js';
export type { ICombatResult } from '../traits/combatant/combatantBehavior.js';
