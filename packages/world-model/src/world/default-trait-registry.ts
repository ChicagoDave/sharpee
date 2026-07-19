// packages/world-model/src/world/default-trait-registry.ts

/**
 * Default-trait registry (ADR-189).
 *
 * Maps an `EntityType` to factory functions that produce the traits an entity of
 * that type should arrive with. `WorldModel.createEntity` consults this map and
 * adds the default traits (unless called with `{ defaultTraits: false }`), so a
 * type keeps the behavior its name promises by construction.
 *
 * Factories (not shared instances) so every entity gets its own trait objects.
 *
 * Public interface: `DEFAULT_TRAITS`. Owner context: `@sharpee/world-model` — internal.
 */

import { EntityType } from '../entities/entity-types.js';
import { ITrait } from '../traits/trait.js';
import { SceneryTrait } from '../traits/scenery/index.js';

/** Produces a fresh trait instance for an entity's default-trait set. */
export type DefaultTraitFactory = () => ITrait;

/**
 * Entity type → default trait factories.
 *
 * Conservative by design (ADR-189): `SCENERY` is the only mapping. Its trait is a
 * pure marker, so a SCENERY entity can promise "can't be taken" by construction.
 * Other types (`ROOM`, `CONTAINER`, `ACTOR`, `DOOR`, …) are intentionally absent;
 * their traits need per-entity data and are decided individually.
 */
export const DEFAULT_TRAITS: Map<string, DefaultTraitFactory[]> =
  new Map<string, DefaultTraitFactory[]>([
    [EntityType.SCENERY, [() => new SceneryTrait()]],
  ]);
