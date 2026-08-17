/**
 * Scene store — write side (ADR-320 D4; adr-320 contracts.md §1.3 as
 * amended for Phase 6)
 *
 * The store shape and the pure reads live in `@sharpee/world-model`
 * (`conversation-scene-store.ts`) so stdlib's dispatch and this runtime
 * share one declaration; they are re-exported here so the runtime's
 * internal call sites keep one import home. The write stays HERE: the
 * scene runtime is the store's single writer — every other consumer
 * reads.
 *
 * Public interface: CHARACTER_SCENES_KEY, SceneStoreState, readSceneStore,
 *   writeSceneStore, liveScenes, sceneOf, sceneWith.
 * Owner context: @sharpee/character / conversation
 */

import { CHARACTER_SCENES_KEY, type WorldModel, type SceneStoreState } from '@sharpee/world-model';

export {
  CHARACTER_SCENES_KEY,
  readSceneStore,
  liveScenes,
  sceneOf,
  sceneWith,
  type SceneStoreState,
} from '@sharpee/world-model';

/**
 * Write the scene store back to world state. Scene-runtime-only — every
 * other consumer reads.
 *
 * @param world - The live world
 * @param state - The store state to persist
 */
export function writeSceneStore(world: WorldModel, state: SceneStoreState): void {
  world.setStateValue(CHARACTER_SCENES_KEY, state);
}
