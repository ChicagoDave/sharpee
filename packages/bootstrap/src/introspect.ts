/**
 * Project introspection — runtime world → IDE manifest (ADR-184).
 *
 * Purpose: project a constructed story world into the {@link ProjectManifest} the
 *   Sharpee IDE renders as its Sharpee-aware project tree. This is the semantic
 *   half of ADR-184: categories and trait data come from the *runtime* world
 *   (ground truth), not from static source analysis. Source positions (file:line)
 *   are added IDE-side from the tree-sitter name index and are absent here.
 * Public interface: buildManifest().
 * Owner context: @sharpee/bootstrap — the shared loader/assembly layer (ADR-180)
 *   used by the bundle CLI, transcript-tester, and devkit. The wire shape is owned
 *   by @sharpee/ide-protocol.
 *
 * @see ADR-184: IDE project introspection via runtime world model
 */

import { WorldModel, IFEntity, TraitType, RoomTrait, IdentityTrait } from '@sharpee/world-model';
import {
  type ProjectManifest,
  type EntityNode,
  type EntityCategory,
  type TraitSummary,
  SCHEMA_VERSION,
} from '@sharpee/ide-protocol';

/**
 * Derive an entity's project-tree category from its runtime trait set.
 * First match wins, per the ADR-184 derivation table. Region outranks room so a
 * region entity that also carries room-like traits still buckets as a region.
 */
function deriveCategory(entity: IFEntity): EntityCategory {
  if (entity.hasTrait(TraitType.REGION)) return 'region';
  if (entity.hasTrait(TraitType.ROOM)) return 'room';
  if (entity.hasTrait(TraitType.ACTOR)) return 'npc';
  return 'object';
}

/** Project the IDE-relevant fields from an entity's traits (sparse — present only if carried). */
function summarizeTraits(entity: IFEntity): TraitSummary {
  const summary: TraitSummary = {};

  if (entity.hasTrait(TraitType.IDENTITY)) {
    const identity = entity.getTrait<IdentityTrait>(TraitType.IDENTITY);
    const description = identity?.description?.trim();
    summary.identity = description ? { description } : {};
  }

  if (entity.hasTrait(TraitType.ROOM)) {
    const room = entity.getTrait<RoomTrait>(TraitType.ROOM);
    summary.room = { exits: room ? Object.keys(room.exits) : [] };
  }

  if (entity.hasTrait(TraitType.CONTAINER)) {
    summary.container = {
      openable: entity.hasTrait(TraitType.OPENABLE),
      lockable: entity.hasTrait(TraitType.LOCKABLE),
    };
  }

  return summary;
}

/**
 * Build the IDE project manifest by projecting a constructed world.
 *
 * Excludes the player (not an authored entity) and door/exit entities (they
 * surface under a room's `exits`, not as a top-level category). Emits no
 * `source` — file:line is joined IDE-side from the tree-sitter name index.
 *
 * @param world         the constructed story world
 * @param story         story id (e.g. the story directory basename)
 * @param generatedFrom which path produced this manifest
 */
export function buildManifest(
  world: WorldModel,
  story: string,
  generatedFrom: 'cli' | 'bridge'
): ProjectManifest {
  const playerId = world.getPlayer()?.id;

  const entities: EntityNode[] = world
    .getAllEntities()
    .filter((entity) => entity.id !== playerId)
    .filter((entity) => !entity.hasTrait(TraitType.DOOR) && !entity.hasTrait(TraitType.EXIT))
    .map((entity) => ({
      id: entity.id,
      displayName: entity.name,
      category: deriveCategory(entity),
      traits: summarizeTraits(entity),
    }));

  return {
    schemaVersion: SCHEMA_VERSION,
    story,
    generatedFrom,
    entities,
  };
}
