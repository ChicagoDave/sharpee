// packages/world-model/src/behaviors/index.ts

export { Behavior, IWorldAwareBehavior, isWorldAwareBehavior } from './behavior';

// Re-export all behavior classes as they are added
// These will come from the trait folders
export { ContainerBehavior } from '../traits/container/containerBehavior';
export { SceneryBehavior } from '../traits/scenery/sceneryBehavior';
export { WearableBehavior } from '../traits/wearable/wearableBehavior';
export { ReadableBehavior } from '../traits/readable/readableBehavior';
export { LightSourceBehavior } from '../traits/light-source/lightSourceBehavior';
export { ExitBehavior } from '../traits/exit/exitBehavior';
export { ClimbableBehavior } from '../traits/climbable/climbableBehavior';
export { OpenableBehavior } from '../traits/openable/openableBehavior';
export { LockableBehavior } from '../traits/lockable/lockableBehavior';

// Combat behaviors
export { WeaponBehavior } from '../traits/weapon/weaponBehavior';
export { BreakableBehavior } from '../traits/breakable/breakableBehavior';
export { DestructibleBehavior } from '../traits/destructible/destructibleBehavior';
export { CombatBehavior } from '../traits/combatant/combatantBehavior';
export { AttackBehavior, IAttackResult } from './attack';

// Export result types from behaviors
export type { IOpenResult, ICloseResult } from '../traits/openable/openableBehavior';
export type { IWeaponDamageResult } from '../traits/weapon/weaponBehavior';
export type { IBreakResult } from '../traits/breakable/breakableBehavior';
export type { IDamageResult } from '../traits/destructible/destructibleBehavior';
export type { ICombatResult } from '../traits/combatant/combatantBehavior';
