/**
 * Multi-Object Handler
 *
 * Handles "take all", "take all but X", and "take X and Y" patterns.
 * Actions use this helper to expand multi-object commands into entity lists.
 */

import { IFEntity, WorldModel, TraitType } from '@sharpee/world-model';
import { ActionContext } from '../actions/enhanced-types';
import { StandardScopeResolver } from '../scope/scope-resolver';
import { INounPhrase } from '@sharpee/world-model';

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
 * Get excluded entity names from "all but X" pattern
 */
export function getExcludedNames(context: ActionContext): string[] {
  const excluded = context.command.parsed.excluded;
  if (!excluded || excluded.length === 0) {
    return [];
  }
  return excluded.map(np => np.head || np.text).map(s => s.toLowerCase());
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
  const player = context.player;

  // Handle "all" keyword
  if (directObject?.isAll) {
    return expandAll(context, options);
  }

  // Handle list "X and Y"
  if (directObject?.isList && directObject.items) {
    return expandList(context, directObject.items, options);
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
  const player = context.player;
  const scopeResolver = new StandardScopeResolver(world);

  // Get entities based on scope
  let candidates: IFEntity[];
  switch (options.scope) {
    case 'carried':
      candidates = world.getContents(player.id);
      break;
    case 'visible':
      candidates = scopeResolver.getVisible(player);
      break;
    case 'reachable':
    default:
      candidates = scopeResolver.getReachable(player);
      break;
  }

  // Apply filter if provided
  if (options.filter) {
    candidates = candidates.filter(e => options.filter!(e, world));
  }

  // Apply default portable filter (not room, not scenery, not actor)
  candidates = candidates.filter(e => isPortable(e));

  // Apply exclusions from "all but X"
  const excludedNames = getExcludedNames(context);
  if (excludedNames.length > 0) {
    candidates = candidates.filter(e => {
      const name = e.name.toLowerCase();
      const aliases = getEntityAliases(e).map(a => a.toLowerCase());
      // Exclude if name or any alias matches excluded list
      return !excludedNames.includes(name) &&
             !aliases.some(a => excludedNames.includes(a));
    });
  }

  return candidates.map(entity => ({ entity }));
}

/**
 * Expand list items "X and Y" into entities
 */
function expandList(
  context: ActionContext,
  items: INounPhrase[],
  options: MultiObjectOptions
): MultiObjectItem[] {
  const world = context.world;
  const player = context.player;
  const scopeResolver = new StandardScopeResolver(world);
  const results: MultiObjectItem[] = [];

  // Get scope candidates
  let scopeCandidates: IFEntity[];
  switch (options.scope) {
    case 'carried':
      scopeCandidates = world.getContents(player.id);
      break;
    case 'visible':
      scopeCandidates = scopeResolver.getVisible(player);
      break;
    case 'reachable':
    default:
      scopeCandidates = scopeResolver.getReachable(player);
      break;
  }

  // Resolve each item in the list
  for (const item of items) {
    const searchTerm = (item.head || item.text).toLowerCase();

    // Find matching entity in scope
    const match = scopeCandidates.find(e => {
      const name = e.name.toLowerCase();
      const aliases = getEntityAliases(e).map(a => a.toLowerCase());
      return name === searchTerm || aliases.includes(searchTerm);
    });

    if (match) {
      // Apply filter if provided
      if (!options.filter || options.filter(match, world)) {
        results.push({ entity: match, nounPhrase: item });
      }
    }
    // Note: If item doesn't resolve, we skip it (partial success)
    // The action can check results.length vs items.length to detect this
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

/**
 * Get entity aliases from identity trait
 */
function getEntityAliases(entity: IFEntity): string[] {
  const identity = entity.get(TraitType.IDENTITY);
  if (identity && typeof identity === 'object' && 'aliases' in identity) {
    const aliases = (identity as any).aliases;
    if (Array.isArray(aliases)) {
      return aliases.map(String);
    }
  }
  return [];
}
