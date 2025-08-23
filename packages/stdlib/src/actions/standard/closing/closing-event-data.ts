/**
 * Data for the 'if.event.closed' event
 * 
 * This is what goes in SemanticEvent.data
 */

import { EntityId, EntitySnapshot } from '@sharpee/core';

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
  
  // Backward compatibility
  containerId?: EntityId;
  containerName?: string;
  
  // Atomic event snapshots
  /** Complete snapshot of the target after closing */
  targetSnapshot?: EntitySnapshot;
  
  /** Complete snapshots of contents (if container) */
  contentsSnapshots?: EntitySnapshot[];
}
