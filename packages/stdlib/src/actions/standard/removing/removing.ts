/**
 * Removing action - remove objects from containers or surfaces
 *
 * This action handles taking objects from containers or supporters.
 * It's essentially a targeted form of taking.
 *
 * Uses four-phase pattern:
 * 1. validate: Check item and source exist and are accessible
 * 2. execute: Remove from source and take to inventory
 * 3. blocked: Generate error events when validation fails
 * 4. report: Generate success events with removed data
 *
 * Supports multi-object commands:
 * - "remove all from box" - removes all items from container
 * - "remove all but X from box" - removes all except specified items
 * - "remove X and Y from box" - removes multiple specified items
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ISemanticEvent } from '@sharpee/core';
import { captureEntitySnapshot } from '../../base/snapshot-utils';
import {
  TraitType,
  OpenableBehavior,
  ContainerBehavior,
  SupporterBehavior,
  ActorBehavior,
  IRemoveItemResult,
  IRemoveItemFromSupporterResult,
  ITakeItemResult,
  IFEntity
} from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope';
import { RemovingEventMap } from './removing-events';
import { RemovingMessages } from './removing-messages';

// Import types
import { getRemovingSharedData, RemovingItemScratch } from './removing-types';

// Import multi-object helpers
import { isMultiObjectCommand, getExcludedNames } from '../../../helpers/multi-object-handler';
import { nounPhraseFor } from '../../../utils';
import {
  ActionLifecycleDescriptor,
  resolveLifecycle,
  getLifecycleState,
  runPreValidate,
  runPostValidate,
  runPostExecute,
  runPostReport,
  runOnBlocked,
  runMultiObjectValidate,
  getMultiObjectLifecycle,
  runMultiObjectExecute,
  runMultiObjectReport,
  blockedMessageId
} from '../../lifecycle';

/**
 * Interceptor surface (ADR-228). D6-B delegation-seam ruling: removing IS
 * a take (it re-implements taking's mutation and emits `if.event.taken`),
 * so the item is consulted under BOTH ids — `if.action.removing` first
 * (the specific phrasing), then `if.action.taking`. A taking-guard (the
 * TrollAxe class) can therefore never be bypassed by REMOVE FROM
 * phrasing. Authors: one physical operation fires hooks under two ids —
 * register a trait's interceptor under exactly ONE of them to avoid
 * double-mutation. The source container/supporter is consulted under
 * `if.action.removing` per D3-B (all command entities fire).
 */
export const removingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.REMOVING,
  slots: [
    {
      id: 'item',
      actionIds: [IFActions.REMOVING, IFActions.TAKING],
      resolve: (ctx) => ctx.command.directObject?.entity,
      seedData: (ctx, entity) => ({
        itemId: entity.id,
        itemName: entity.name,
        sourceId: ctx.command.indirectObject?.entity?.id,
        sourceName: ctx.command.indirectObject?.entity?.name
      })
    },
    {
      id: 'source',
      actionIds: [IFActions.REMOVING],
      resolve: (ctx) => ctx.command.indirectObject?.entity,
      seedData: (ctx, entity, multiObjectItem) => {
        const item = multiObjectItem ?? ctx.command.directObject?.entity;
        return {
          itemId: item?.id,
          itemName: item?.name,
          sourceId: entity.id,
          sourceName: entity.name
        };
      }
    },
    {
      // ADR-230 Phase 6 (sketch ruling 6): `take X from Y with Z` remapped
      // from the orphan if.action.taking_with onto removing; the explicit
      // tool is consultable (D3b treatment, interceptor-only — no trait
      // requirement). Published order item → source → tool.
      id: 'tool',
      actionIds: [IFActions.REMOVING],
      resolve: (ctx) => ctx.command.instrument?.entity,
      seedData: (ctx, entity) => ({
        toolId: entity.id,
        toolName: entity.name,
        itemId: ctx.command.directObject?.entity?.id,
        sourceId: ctx.command.indirectObject?.entity?.id
      })
    }
  ]
};

// ============================================================================
// Helper Functions (standalone to avoid `this` issues in object literal)
// ============================================================================

/**
 * Check if an entity is portable (can be taken)
 */
function isPortable(entity: IFEntity): boolean {
  if (entity.has(TraitType.ROOM)) return false;
  if (entity.has(TraitType.SCENERY)) return false;
  if (entity.has(TraitType.ACTOR)) return false;
  return true;
}

/**
 * Get entities from source container/supporter for "remove all from X"
 */
function getSourceContents(context: ActionContext, source: IFEntity): IFEntity[] {
  const contents = context.world.getContents(source.id);
  return contents.filter(e => isPortable(e));
}

/**
 * Validate removing a single entity from source
 */
function validateSingleEntity(
  context: ActionContext,
  item: IFEntity,
  source: IFEntity
): ValidationResult {
  const actor = context.player;

  // Check if player already has the item
  if (ActorBehavior.isHolding(actor, item.id, context.world)) {
    return {
      valid: false,
      error: RemovingMessages.ALREADY_HAVE,
      params: { item: nounPhraseFor(item) }
    };
  }

  // Check if the item is actually in/on the source
  const itemLocation = context.world.getLocation(item.id);
  if (!itemLocation || itemLocation !== source.id) {
    if (source.has(TraitType.CONTAINER)) {
      return {
        valid: false,
        error: RemovingMessages.NOT_IN_CONTAINER,
        params: {
          item: nounPhraseFor(item),
          container: nounPhraseFor(source)
        }
      };
    } else if (source.has(TraitType.SUPPORTER)) {
      return {
        valid: false,
        error: RemovingMessages.NOT_ON_SURFACE,
        params: {
          item: nounPhraseFor(item),
          surface: nounPhraseFor(source)
        }
      };
    } else {
      return {
        valid: false,
        error: RemovingMessages.NOT_IN_CONTAINER,
        params: {
          item: nounPhraseFor(item),
          container: nounPhraseFor(source)
        }
      };
    }
  }

  // Container-specific checks using behavior
  if (source.has(TraitType.CONTAINER)) {
    // Check if container is open
    if (source.has(TraitType.OPENABLE) && !OpenableBehavior.isOpen(source)) {
      return {
        valid: false,
        error: RemovingMessages.CONTAINER_CLOSED,
        params: { container: nounPhraseFor(source) }
      };
    }
  }

  // Use ActorBehavior to validate taking capacity
  if (!ActorBehavior.canTakeItem(actor, item, context.world)) {
    return {
      valid: false,
      error: RemovingMessages.CANNOT_TAKE,
      params: { item: nounPhraseFor(item) }
    };
  }

  return { valid: true };
}

/**
 * Expand the multi-object item list for "remove all/X and Y from Z" —
 * removing resolves its items from the SOURCE's contents, not from scope.
 */
function expandRemovableItems(context: ActionContext, source: IFEntity): IFEntity[] {
  const directObject = context.command.parsed.structure.directObject;
  let items: IFEntity[];

  if (directObject?.isAll) {
    // "remove all from X" - get all contents of source
    items = getSourceContents(context, source);

    // Apply exclusions from "all but X"
    const excludedNames = getExcludedNames(context);
    if (excludedNames.length > 0) {
      items = items.filter(e => {
        const name = e.name.toLowerCase();
        return !excludedNames.includes(name);
      });
    }
  } else if (directObject?.isList && directObject.items) {
    // "remove X and Y from Z" - resolve each item from source contents
    const sourceContents = getSourceContents(context, source);
    items = [];
    for (const np of directObject.items) {
      const searchTerm = (np.head || np.text).toLowerCase();
      const match = sourceContents.find(e => e.name.toLowerCase() === searchTerm);
      if (match) {
        items.push(match);
      }
    }
  } else {
    items = [];
  }

  return items;
}

/**
 * Execute removing a single entity from source. Mutation results are
 * written into `scratch` — the single-object sharedData or the item's
 * multi-object itemData (ADR-228 D4).
 */
function executeSingleEntity(
  context: ActionContext,
  item: IFEntity,
  source: IFEntity,
  scratch: RemovingItemScratch
): void {
  const actor = context.player;

  // First validate removal from source using appropriate behavior
  let removeResult: IRemoveItemResult | IRemoveItemFromSupporterResult | null = null;

  if (source.has(TraitType.CONTAINER)) {
    removeResult = ContainerBehavior.removeItem(source, item, context.world);
  } else if (source.has(TraitType.SUPPORTER)) {
    removeResult = SupporterBehavior.removeItem(source, item, context.world);
  }

  scratch.removeResult = removeResult;

  // Validate taking using ActorBehavior
  const takeResult: ITakeItemResult = ActorBehavior.takeItem(actor, item, context.world);
  scratch.takeResult = takeResult;

  // Perform the actual move - this is the critical mutation!
  context.world.moveEntity(item.id, actor.id);
}

/**
 * Generate success events for removing a single entity
 *
 * Uses simplified event pattern (ADR-097): domain event carries messageId directly.
 */
function reportSingleSuccess(
  context: ActionContext,
  item: IFEntity,
  source: IFEntity,
  _scratch: RemovingItemScratch,
  events: ISemanticEvent[]
): void {
  const actor = context.player;

  // Build message params — EntityInfo for the formatter chain (ADR-158)
  const params: Record<string, any> = {
    item: nounPhraseFor(item)
  };

  let messageKey: string;
  if (source.has(TraitType.CONTAINER)) {
    params.container = nounPhraseFor(source);
    messageKey = RemovingMessages.REMOVED_FROM;
  } else {
    params.surface = nounPhraseFor(source);
    messageKey = RemovingMessages.REMOVED_FROM_SURFACE;
  }

  // Emit domain event with messageId (simplified pattern - ADR-097)
  // Using if.event.taken since removing is semantically a form of taking
  events.push(context.event('if.event.taken', {
    // Rendering data (messageId + params for text-service)
    messageId: `${context.action.id}.${messageKey}`,
    params,
    // Domain data (for event sourcing / handlers)
    item: item.name,
    itemId: item.id,
    actorId: actor.id,
    fromLocation: source.id,
    container: source.name,
    fromContainer: source.has(TraitType.CONTAINER),
    fromSupporter: source.has(TraitType.SUPPORTER) && !source.has(TraitType.CONTAINER),
    itemSnapshot: captureEntitySnapshot(item, context.world, true),
    actorSnapshot: captureEntitySnapshot(actor, context.world, false),
    sourceSnapshot: captureEntitySnapshot(source, context.world, source.has(TraitType.ROOM))
  }));
}

/**
 * Generate blocked event for a single entity that couldn't be removed
 *
 * Uses simplified event pattern (ADR-097): domain event carries messageId directly.
 */
function reportSingleBlocked(
  context: ActionContext,
  item: IFEntity,
  source: IFEntity,
  result: ValidationResult,
  events: ISemanticEvent[]
): void {
  events.push(context.event('if.event.remove_blocked', {
    // Rendering data — EntityInfo for the formatter chain (ADR-158)
    messageId: blockedMessageId(context, result),
    params: { ...result.params, item: nounPhraseFor(item), source: nounPhraseFor(source) },
    // Domain data — strings for handlers
    itemId: item.id,
    itemName: item.name,
    sourceId: source.id,
    sourceName: source.name,
    reason: result.error
  }));
}

// ============================================================================
// Action Definition
// ============================================================================

export const removingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.REMOVING,

  // Default scope requirements for this action's slots
  defaultScope: {
    item: ScopeLevel.REACHABLE,
    source: ScopeLevel.REACHABLE
  },

  requiredMessages: [
    'no_target',
    'no_source',
    'not_in_container',
    'not_on_surface',
    'container_closed',
    'removed_from',
    'removed_from_surface',
    'cant_reach',
    'already_have',
    'nothing_to_remove'
  ],
  group: 'object_manipulation',

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: true,
    directObjectScope: ScopeLevel.REACHABLE
  },

  validate(context: ActionContext): ValidationResult {
    const source = context.command.indirectObject?.entity;

    // Check for multi-object command — full per-item lifecycle (ADR-228 D4)
    if (isMultiObjectCommand(context)) {
      // Must have a source
      if (!source) {
        return { valid: false, error: RemovingMessages.NO_SOURCE };
      }

      // Container must be open if it's openable
      if (source.has(TraitType.CONTAINER) && source.has(TraitType.OPENABLE) && !OpenableBehavior.isOpen(source)) {
        return {
          valid: false,
          error: RemovingMessages.CONTAINER_CLOSED,
          params: { container: nounPhraseFor(source) }
        };
      }

      const items = expandRemovableItems(context, source);
      if (items.length === 0) {
        return { valid: false, error: RemovingMessages.NOTHING_TO_REMOVE };
      }

      const results = runMultiObjectValidate(
        context, removingLifecycle, 'item', items,
        (ctx, item) => validateSingleEntity(ctx, item, source)
      );

      // Valid if at least one can be removed; all-fail returns the first error
      if (!results.some(r => r.success)) {
        return { valid: false, error: results[0].error, errorQualified: results[0].errorQualified, params: results[0].errorParams };
      }
      return { valid: true };
    }

    // Single object validation
    const item = context.command.directObject?.entity;

    // Validate we have an item
    if (!item) {
      return {
        valid: false,
        error: RemovingMessages.NO_TARGET,
        params: {}
      };
    }

    // Validate we have a source
    if (!source) {
      return {
        valid: false,
        error: RemovingMessages.NO_SOURCE,
        params: { item: nounPhraseFor(item) }
      };
    }

    const state = resolveLifecycle(context, removingLifecycle);
    const preVeto = runPreValidate(context, state);
    if (preVeto) return preVeto;

    const standard = validateSingleEntity(context, item, source);
    if (!standard.valid) return standard;

    // Canonical placement (ADR-228): postValidate runs after ALL standard validation
    const postVeto = runPostValidate(context, state);
    if (postVeto) return postVeto;

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const source = context.command.indirectObject!.entity!;

    // Multi-object command: per-item execute + hooks (D4)
    const multi = getMultiObjectLifecycle(context);
    if (multi) {
      runMultiObjectExecute(context, multi, (ctx, item, itemData) => {
        executeSingleEntity(ctx, item, source, itemData as RemovingItemScratch);
      });
      return;
    }

    // Single object execution
    const sharedData = getRemovingSharedData(context);
    const item = context.command.directObject!.entity!;

    executeSingleEntity(context, item, source, sharedData);

    const state = getLifecycleState(context);
    if (state) runPostExecute(context, state);
  },

  /**
   * Report events after successful removing
   * Only called on success path - validation passed
   */
  report(context: ActionContext): ISemanticEvent[] {
    const source = context.command.indirectObject!.entity!;

    // Multi-object command: per-item success/blocked events + hooks (D4)
    const multi = getMultiObjectLifecycle(context);
    if (multi) {
      const events: ISemanticEvent[] = [];
      runMultiObjectReport(
        context, multi, events, 'if.event.taken', 'if.event.remove_blocked',
        (ctx, item, itemData, evts) => {
          reportSingleSuccess(ctx, item, source, itemData as RemovingItemScratch, evts);
        },
        (ctx, item, itemResult, evts) => {
          reportSingleBlocked(ctx, item, source, itemResult, evts);
        }
      );
      return events;
    }

    // Single object report
    const actor = context.player;
    const item = context.command.directObject!.entity!;

    // Build message params — EntityInfo for the formatter chain (ADR-158)
    const params: Record<string, any> = {
      item: nounPhraseFor(item)
    };

    let messageKey: string;
    if (source.has(TraitType.CONTAINER)) {
      params.container = nounPhraseFor(source);
      messageKey = RemovingMessages.REMOVED_FROM;
    } else {
      params.surface = nounPhraseFor(source);
      messageKey = RemovingMessages.REMOVED_FROM_SURFACE;
    }

    // Emit domain event with messageId (simplified pattern - ADR-097)
    const events: ISemanticEvent[] = [
      context.event('if.event.taken', {
        // Rendering data (messageId + params for text-service)
        messageId: `${context.action.id}.${messageKey}`,
        params,
        // Domain data (for event sourcing / handlers)
        item: item.name,
        itemId: item.id,
        actorId: actor.id,
        fromLocation: source.id,
        container: source.name,
        fromContainer: source.has(TraitType.CONTAINER),
        fromSupporter: source.has(TraitType.SUPPORTER) && !source.has(TraitType.CONTAINER),
        itemSnapshot: captureEntitySnapshot(item, context.world, true),
        actorSnapshot: captureEntitySnapshot(actor, context.world, false),
        sourceSnapshot: captureEntitySnapshot(source, context.world, source.has(TraitType.ROOM))
      })
    ];

    const state = getLifecycleState(context);
    if (state) runPostReport(context, state, events, 'if.event.taken');

    return events;
  },

  /**
   * Generate events when validation fails
   *
   * Uses simplified event pattern (ADR-097): domain event carries messageId directly.
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const item = context.command.directObject?.entity;
    const source = context.command.indirectObject?.entity;

    const events: ISemanticEvent[] = [context.event('if.event.remove_blocked', {
      // Rendering data — EntityInfo for the formatter chain (ADR-158)
      messageId: blockedMessageId(context, result),
      params: {
        ...result.params,
        item: item ? nounPhraseFor(item) : undefined,
        source: source ? nounPhraseFor(source) : undefined
      },
      // Domain data — strings for handlers
      itemId: item?.id,
      itemName: item?.name,
      sourceId: source?.id,
      sourceName: source?.name,
      reason: result.error
    })];

    if (result.error) {
      const state = getLifecycleState(context);
      if (state) {
        // Single-object path: notify all consultations (ADR-228 D2/D3)
        runOnBlocked(context, state, events, 'if.event.remove_blocked', result.error);
      } else {
        // Multi-object all-fail path: first failed item's consultations only
        // (taking's pattern — the blocked event carries that item's error).
        const multi = getMultiObjectLifecycle(context);
        const first = multi?.[0];
        if (first && !first.success) {
          runOnBlocked(context, first.state, events, 'if.event.remove_blocked', first.error ?? result.error);
        }
      }
    }

    return events;
  }
};
