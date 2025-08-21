/**
 * Data for the 'if.event.closed' event
 * 
 * This is what goes in SemanticEvent.data
 */

import { EntityId } from '@sharpee/core';

export interface ClosedEventData {
  // What was closed
  targetId: EntityId;
  targetName: string;
  
  // Type information
  isContainer: boolean;
  isDoor: boolean;
  isSupporter: boolean;
  
  // Container state
  hasContents: boolean;
  contentsCount: number;
  contentsIds: EntityId[];
}
