/**
 * Scene store — shape and read side (ADR-320 D4; adr-320 contracts.md
 * §1.3 as amended for Phase 6)
 *
 * Live scenes ride the world-state key `character.scenes` (the
 * `CHARACTER_TURN_KEY` idiom), serialized with the ordinary world save so
 * mid-scene save/restore is the ordinary world round trip (D17 — state
 * inside the save format, never beside it). The store shape and the pure
 * reads live HERE so stdlib's dispatch and the character runtime share
 * one declaration (the co-located wire-type rule); the write side
 * (`writeSceneStore`) lives in `@sharpee/character`'s scene runtime,
 * which remains the store's single writer.
 *
 * Invariants (enforced by the scene runtime, the single writer):
 * - a participant is in at most one live scene;
 * - every live scene has at least two participants;
 * - scene ids are minted by the runtime and unique within a save.
 *
 * Public interface: CHARACTER_SCENES_KEY, SceneStoreState, readSceneStore,
 *   liveScenes, sceneOf, sceneWith.
 * Owner context: world-model / character-model trait
 */

import type { WorldModel } from '../../world/WorldModel.js';
import type { ConversationSceneState } from './conversation-scene.js';

/** World-state key holding every live scene (adr-320 contracts.md §1.3). */
export const CHARACTER_SCENES_KEY = 'character.scenes';

/** The stored shape under `character.scenes` — plain JSON-safe data. */
export interface SceneStoreState {
  /** Monotonic scene-id sequence (ids stay unique across a save's lifetime). */
  nextSceneSeq: number;

  /** Live scenes by id. Closed scenes are removed (memory keeps their trace). */
  scenes: Record<string, ConversationSceneState>;

  /**
   * Manner beat rotation cursors (ADR-320 D5), keyed
   * `<ownerId>:<rowIndex>` → last emitted beat index. Rides the store so
   * no-back-to-back-repeat survives save/restore byte-identically.
   */
  mannerRotation: Record<string, number>;
}

/** A fresh, empty store (the state before any scene has opened). */
function emptyStore(): SceneStoreState {
  return { nextSceneSeq: 1, scenes: {}, mannerRotation: {} };
}

/**
 * Read the scene store from world state (a fresh empty store when the key
 * has never been written).
 *
 * @param world - The live world
 * @returns The current store state
 */
export function readSceneStore(world: WorldModel): SceneStoreState {
  return (world.getStateValue(CHARACTER_SCENES_KEY) as SceneStoreState | undefined) ?? emptyStore();
}

/**
 * Every live scene, in stable (insertion) order.
 *
 * @param world - The live world
 * @returns The live scenes
 */
export function liveScenes(world: WorldModel): ConversationSceneState[] {
  return Object.values(readSceneStore(world).scenes);
}

/**
 * A live scene by id.
 *
 * @param world - The live world
 * @param sceneId - The scene id
 * @returns The scene, or undefined when closed or never opened
 */
export function sceneOf(world: WorldModel, sceneId: string): ConversationSceneState | undefined {
  return readSceneStore(world).scenes[sceneId];
}

/**
 * The live scene a participant is in, if any (at most one — the store's
 * participation invariant).
 *
 * @param world - The live world
 * @param participantId - The participant entity id
 * @returns The scene, or undefined when the participant is in none
 */
export function sceneWith(world: WorldModel, participantId: string): ConversationSceneState | undefined {
  return liveScenes(world).find((s) => s.participantIds.includes(participantId));
}
