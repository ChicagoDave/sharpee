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
export { EntryBehavior } from '../traits/entry/entryBehavior';
