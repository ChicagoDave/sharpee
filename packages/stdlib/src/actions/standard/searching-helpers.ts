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
import { ActionContext } from '../enhanced-types';

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
 * Determine the appropriate search message based on what was found
 */
export function determineSearchMessage(
  searchContext: SearchContext
): { messageId: string; params: Record<string, any> } {
  const { target, contents, concealedItems, targetType } = searchContext;
  
  const params: Record<string, any> = {
    target: target.name
  };
  
  // Found concealed items - most important result
  if (concealedItems.length > 0) {
    params.items = concealedItems.map(item => item.name).join(', ');
    params.where = getLocationPreposition(targetType);
    return { messageId: 'found_concealed', params };
  }
  
  // Target-specific messages when nothing concealed
  switch (targetType) {
    case 'container':
      if (contents.length === 0) {
        return { messageId: 'empty_container', params };
      } else {
        params.items = contents.map(item => item.name).join(', ');
        return { messageId: 'container_contents', params };
      }
      
    case 'supporter':
      if (contents.length > 0) {
        params.items = contents.map(item => item.name).join(', ');
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
 * Get the appropriate preposition for where items were found
 */
function getLocationPreposition(targetType: SearchContext['targetType']): string {
  switch (targetType) {
    case 'container':
      return 'inside';
    case 'supporter':
      return 'on';
    case 'location':
    case 'object':
    default:
      return 'here';
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