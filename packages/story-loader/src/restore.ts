/**
 * restore.ts — the mutating half of the restore reconciler (ADR-388 D5).
 *
 * Purpose: when a save's identity stamp differs from the installed story's,
 * reconcile the restored world against this compile's identity manifest:
 * build and wire every entity the save lacks, wire every exit a held room
 * lacks, drop the keys the manifest declares no identity for, re-seed
 * un-authored landing lists, and report the stored values the manifest
 * does not declare — leaving them exactly as they were. The decisions that
 * need no world live in `reconcile.ts`; this module applies them through
 * the same build modules the load uses and the world's state bag.
 *
 * Invariants: idempotent — a second pass over the same world adds, drops
 * and re-seeds nothing. Mutates only through `buildEntity`, `wireEntity`,
 * `wireExit` and the world's state bag.
 *
 * Public interface: reconcileRestoredWorld.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-388 D5 — the reconciler; D6 — the retired-key sweep it replaces.
 * - ADR-389 D2 — the body beside `reconcile.ts`, off the facade.
 */
import type { IREntity } from '@sharpee/chord';
import type { IRestoreIdentity, IRestoreReconciliation } from '@sharpee/core';
import { AuthorModel, IFEntity, RoomTrait, TraitType, WorldModel } from '@sharpee/world-model';
import { resolvePendingEntityRefs } from './build/adjectives.js';
import type { BuildContext } from './build/context.js';
import { buildEntity } from './build/entity.js';
import { toDirection, wireEntity, wireExit } from './build/wiring.js';
import { requireEntity } from './identity.js';
import { orphanedKeys, reseedLandingRecord, unmappableValues } from './reconcile.js';
import { landingKey, type LandingRecord } from './state-keys.js';

/**
 * Reconcile a restored world against this compile's identity manifest
 * (ADR-388 D5): build and wire every entity the save lacks, wire every
 * exit a held room lacks, drop the keys the manifest declares no identity
 * for, re-seed un-authored landing lists, and report the stored values
 * the manifest does not declare — leaving them exactly as they were.
 * Mutates only through the loader's own build and wire modules and the
 * world's state bag; idempotent, so a second pass over the same world
 * adds, drops and re-seeds nothing.
 *
 * @param story the build context (the IR and the build state the wiring reads)
 * @param world the fully restored world
 * @param identity the engine's stamp comparison
 * @returns the report, for the dispatcher to deliver
 */
export function reconcileRestoredWorld(story: BuildContext, world: WorldModel, identity: IRestoreIdentity): IRestoreReconciliation {
  const manifest = story.ir.identity;

  // 1. Add what is new: every entity the manifest declares and the restored
  //    world lacks, built and wired exactly as at load. Build all first, so
  //    a new entity placed in another new entity's room finds it.
  const author = new AuthorModel(world.getDataStore(), world);
  const added: Array<{ ir: IREntity; entity: IFEntity }> = [];
  for (const irEntity of story.ir.entities) {
    if (world.hasEntity(irEntity.id)) continue;
    added.push({ ir: irEntity, entity: buildEntity(story, world, irEntity) });
  }
  resolvePendingEntityRefs(story, world);
  for (const { ir: irEntity, entity } of added) wireEntity(story, world, author, irEntity, entity);
  const addedIds = new Set(added.map((a) => a.ir.id));

  // 2. Exits new on rooms the save already holds: wired through the same
  //    method load uses, only for a direction the room has nothing under.
  const addedExits: string[] = [];
  for (const irEntity of story.ir.entities) {
    if (addedIds.has(irEntity.id) || irEntity.exits.length === 0) continue;
    const entity = requireEntity(world, irEntity.id, irEntity);
    const room = entity.get(TraitType.ROOM) as RoomTrait | undefined;
    if (!room) continue;
    for (const exit of irEntity.exits) {
      if (exit.to.kind !== 'room') continue;
      const direction = toDirection(exit.direction, irEntity);
      if ((room.exits as Record<string, unknown>)[direction] !== undefined) continue;
      if (exit.via !== null && requireEntity(world, exit.via, irEntity).has(TraitType.DOOR)) continue;
      wireExit(world, irEntity, entity, exit);
      addedExits.push(`${irEntity.id} ${exit.direction} -> ${exit.to.id}`);
    }
  }

  // 3. Drop what is orphaned: a key under a family the manifest knows,
  //    whose identity the manifest does not declare.
  const state = world.getState();
  const droppedKeys = orphanedKeys(manifest, Object.keys(state));
  if (droppedKeys.length > 0) {
    for (const key of droppedKeys) delete state[key];
    world.setState(state);
  }

  // 4. Re-seed landings the author never `set`, from the current list.
  const reseededLandings: string[] = [];
  for (const landing of manifest.landings) {
    const key = landingKey(landing.region);
    const record = world.getStateValue(key) as LandingRecord | undefined;
    if (!record || record.authored) continue;
    const next = reseedLandingRecord(record, landing.rooms.filter((id) => world.hasEntity(id)));
    if (next === undefined) continue;
    world.setStateValue(key, next);
    reseededLandings.push(landing.region);
  }

  // 5. Report what cannot be mapped, and leave it.
  const unmappable = unmappableValues(manifest, story.ir.story.states, (key) => world.getStateValue(key));

  return {
    savedStamp: identity.savedStamp,
    currentStamp: manifest.stamp,
    addedEntities: added.map((a) => a.ir.id),
    addedExits,
    droppedKeys,
    reseededLandings,
    unmappable,
  };
}
