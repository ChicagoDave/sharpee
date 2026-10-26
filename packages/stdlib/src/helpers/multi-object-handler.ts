/**
 * Multi-Object Handler
 *
 * Handles "take all", "take all but X", and "take X and Y" patterns.
 * Actions use this helper to expand multi-object commands into entity lists.
 * A list's entities are the validator's `directObjects` (ADR-385 D5); an
 * `all but` exclusion removes every candidate the one noun matcher names.
 */

import { IFEntity, WorldModel, TraitType, matchNoun, namingSurfaceOf } from '@sharpee/world-model';
import { ActionContext } from '../actions/enhanced-types.js';
import { StandardScopeResolver } from '../scope/scope-resolver.js';
import { type INounPhrase } from '@sharpee/world-model';

/**
 * Result of processing a single entity in a multi-object command
 */
export interface MultiObjectItem {
  entity: IFEntity;
  nounPhrase?: INounPhrase;  // Original noun phrase if from isList
}

/**
 * Options for multi-object expansion
 */
export interface MultiObjectOptions {
  /** Filter function to determine which entities are valid targets */
  filter?: (entity: IFEntity, world: WorldModel) => boolean;
  /** Required scope level (default: reachable) */
  scope?: 'carried' | 'reachable' | 'visible';
}

/**
 * Check if the current command is a multi-object command (isAll or isList)
 */
export function isMultiObjectCommand(context: ActionContext): boolean {
  const directObject = context.command.parsed.structure.directObject;
  return !!(directObject?.isAll || directObject?.isList);
}

/**
 * Check if the current command uses "all" keyword
 */
export function isAllCommand(context: ActionContext): boolean {
  return context.command.parsed.structure.directObject?.isAll === true;
}

/**
 * Check if the current command is a list (X and Y)
 */
export function isListCommand(context: ActionContext): boolean {
  return context.command.parsed.structure.directObject?.isList === true;
}

/**
 * Remove from the candidates every entity an `all but` exclusion names
 * (ADR-385 D5): the one noun matcher decides, over each entity's naming
 * surface as the actor sees it. An exclusion that names nothing removes
 * nothing.
 *
 * @param context Action context (the parsed command's `excluded` phrases, the world, the actor)
 * @param candidates The expansion before exclusions
 * @returns The candidates no exclusion names
 */
export function withoutExcluded(context: ActionContext, candidates: IFEntity[]): IFEntity[] {
  const excluded = context.command.parsed.excluded;
  if (!excluded || excluded.length === 0) {
    return candidates;
  }
  const { world, actor } = context;
  return candidates.filter((entity) => {
    const surface = namingSurfaceOf(world, entity, actor.id);
    return !excluded.some((phrase) => matchNoun(surface, phrase) !== null);
  });
}

/**
 * Expand a multi-object command into a list of target entities.
 *
 * For "take all": Returns all entities matching scope/filter, minus excluded
 * For "take X and Y": Returns resolved entities for each item
 * For single object: Returns the single resolved entity
 *
 * @param context Action context
 * @param options Filter and scope options
 * @returns Array of entities to process
 */
export function expandMultiObject(
  context: ActionContext,
  options: MultiObjectOptions = {}
): MultiObjectItem[] {
  const directObject = context.command.parsed.structure.directObject;
  const world = context.world;
  const actor = context.actor;

  // Handle "all" keyword
  if (directObject?.isAll) {
    return expandAll(context, options);
  }

  // Handle list "X and Y": the validator resolved every item (ADR-385 D5)
  if (directObject?.isList) {
    return expandList(context);
  }

  // Single object - use the already-resolved entity
  const entity = context.command.directObject?.entity;
  if (entity) {
    return [{ entity }];
  }

  // No target
  return [];
}

/**
 * Expand "all" into matching entities
 */
function expandAll(
  context: ActionContext,
  options: MultiObjectOptions
): MultiObjectItem[] {
  const world = context.world;
  const actor = context.actor;
  const directObject = context.command.parsed.structure.directObject;
  const scopeResolver = new StandardScopeResolver(world);

  // Get entities based on scope
  let candidates: IFEntity[];
  switch (options.scope) {
    case 'carried':
      // ADR-247: `carried` scope (e.g. `drop all`) is held items, not worn —
      // matches the IF convention that `all` never strips worn clothing.
      candidates = world.getCarriedAndWorn(actor.id).carried;
      break;
    case 'visible':
      candidates = scopeResolver.getVisible(actor);
      break;
    case 'reachable':
    default:
      candidates = scopeResolver.getReachable(actor);
      break;
  }

  // Apply filter if provided
  if (options.filter) {
    candidates = candidates.filter(e => options.filter!(e, world));
  }

  // Apply default portable filter (not room, not scenery, not actor)
  candidates = candidates.filter(e => isPortable(e));

  // ADR-385 D2: `all` followed by noun words means every candidate the one
  // noun matcher names for them (`take all coins`); `my` keeps only what the
  // actor carries or wears when something there matches (`drop all my coins`)
  if (directObject && directObject.text) {
    candidates = candidates.filter(e => matchNoun(namingSurfaceOf(world, e, actor.id), directObject) !== null);
  }
  if (directObject?.ownedByActor) {
    const { carried, worn } = world.getCarriedAndWorn(actor.id);
    const ownedIds = new Set([...carried, ...worn].map(e => e.id));
    const owned = candidates.filter(e => ownedIds.has(e.id));
    if (owned.length > 0) {
      candidates = owned;
    }
  }

  // Apply exclusions from "all but X"
  candidates = withoutExcluded(context, candidates);

  return candidates.map(entity => ({ entity }));
}

/**
 * The entities of a list "X and Y": the validator's `directObjects`, in the
 * order typed, each entity once (ADR-385 D5). Nothing is matched by name
 * here; an item that named nothing or tied already failed validation.
 */
function expandList(context: ActionContext): MultiObjectItem[] {
  const results: MultiObjectItem[] = [];
  const seen = new Set<string>();
  for (const ref of context.command.directObjects ?? []) {
    if (seen.has(ref.entity.id)) continue;
    seen.add(ref.entity.id);
    results.push({ entity: ref.entity, nounPhrase: ref.parsed as INounPhrase });
  }
  return results;
}

/**
 * Check if an entity is portable (can be taken)
 */
function isPortable(entity: IFEntity): boolean {
  // Can't take rooms
  if (entity.has(TraitType.ROOM)) {
    return false;
  }

  // Can't take scenery
  if (entity.has(TraitType.SCENERY)) {
    return false;
  }

  // Can't take actors
  if (entity.has(TraitType.ACTOR)) {
    return false;
  }

  return true;
}
