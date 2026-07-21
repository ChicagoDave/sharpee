/**
 * Shared helpers for searching and examining actions
 * 
 * These utilities help with content discovery, concealed item handling,
 * and message determination for sensory actions.
 */

import { ISemanticEvent } from '@sharpee/core';
import {
  TraitType,
  IdentityBehavior,
  IFEntity
} from '@sharpee/world-model';
import { Phrase } from '@sharpee/if-domain';
import { ActionContext } from '../enhanced-types.js';
import { nounPhraseFor } from '../../utils/index.js';

/**
 * Context about what was searched and found
 */
export interface SearchContext {
  target: IFEntity;
  contents: IFEntity[];
  concealedItems: IFEntity[];
  isLocation: boolean;
  targetType: 'container' | 'supporter' | 'location' | 'object';
}

/**
 * Analyze search target and find all contents
 */
export function analyzeSearchTarget(
  context: ActionContext,
  target?: IFEntity
): SearchContext {
  // If no target, search the current location
  const searchTarget = target || context.currentLocation;
  const isLocation = !target;
  
  // Get all contents
  const contents = context.world.getContents(searchTarget.id);
  
  // Find concealed items
  const concealedItems = contents.filter(item => {
    if (item.has(TraitType.IDENTITY)) {
      return IdentityBehavior.isConcealed(item);
    }
    return false;
  });
  
  // Determine target type
  let targetType: SearchContext['targetType'];
  if (isLocation) {
    targetType = 'location';
  } else if (searchTarget.has(TraitType.CONTAINER)) {
    targetType = 'container';
  } else if (searchTarget.has(TraitType.SUPPORTER)) {
    targetType = 'supporter';
  } else {
    targetType = 'object';
  }
  
  return {
    target: searchTarget,
    contents,
    concealedItems,
    isLocation,
    targetType
  };
}

/**
 * Reveal concealed items found during search
 */
export function revealConcealedItems(items: IFEntity[]): void {
  items.forEach(item => {
    if (item.has(TraitType.IDENTITY)) {
      IdentityBehavior.reveal(item);
    }
  });
}

/**
 * Bridge a list of entities to a `PhraseList` message param (ADR-192): the
 * assembler owns articles/joining, so params never carry pre-joined strings.
 */
function phraseListFor(items: IFEntity[]): Phrase {
  return {
    kind: 'list',
    conj: 'and',
    items: items.map(item => nounPhraseFor(item)),
  };
}

/**
 * The concealment-reveal message ID for a search-target shape. The position
 * lives in the per-shape template in lang-en-us — stdlib never synthesizes
 * an English preposition (language-layer separation).
 */
function foundConcealedMessageId(targetType: SearchContext['targetType']): string {
  switch (targetType) {
    case 'container':
      return 'found_concealed_in_container';
    case 'supporter':
      return 'found_concealed_on_supporter';
    case 'location':
    case 'object':
    default:
      return 'found_concealed_here';
  }
}

/**
 * Determine the appropriate search message based on what was found
 */
export function determineSearchMessage(
  searchContext: SearchContext
): { messageId: string; params: Record<string, any> } {
  const { target, contents, concealedItems, targetType } = searchContext;

  // params carry phrases for the assembler (ADR-192) — never bare strings
  const params: Record<string, any> = {
    target: nounPhraseFor(target)
  };

  // Found concealed items - most important result
  if (concealedItems.length > 0) {
    params.items = phraseListFor(concealedItems);
    return { messageId: foundConcealedMessageId(targetType), params };
  }

  // Target-specific messages when nothing concealed
  switch (targetType) {
    case 'container':
      if (contents.length === 0) {
        return { messageId: 'empty_container', params };
      } else {
        params.items = phraseListFor(contents);
        return { messageId: 'container_contents', params };
      }

    case 'supporter':
      if (contents.length > 0) {
        params.items = phraseListFor(contents);
        return { messageId: 'supporter_contents', params };
      } else {
        return { messageId: 'nothing_special', params };
      }

    case 'location':
      return { messageId: 'searched_location', params };

    case 'object':
    default:
      if (contents.length > 0) {
        return { messageId: 'searched_object', params };
      } else {
        return { messageId: 'nothing_special', params };
      }
  }
}

/**
 * Build search event data
 */
export function buildSearchEventData(
  searchContext: SearchContext
): Record<string, any> {
  return {
    target: searchContext.target.id,
    targetName: searchContext.target.name,
    foundItems: searchContext.concealedItems.map(item => item.id),
    foundItemNames: searchContext.concealedItems.map(item => item.name),
    searchingLocation: searchContext.isLocation
  };
}