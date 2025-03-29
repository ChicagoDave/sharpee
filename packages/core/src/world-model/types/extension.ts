// packages/core/src/world-model/types/extension.ts

import { WorldState } from './state-tree';

/**
 * Represents an extension to the world model
 */
export interface WorldModelExtension {
  /**
   * Unique identifier for this extension
   */
  id: string;
  
  /**
   * Human-readable name of the extension
   */
  name: string;
  
  /**
   * Initialize extension state
   */
  initialize: (state: WorldState) => WorldState;
  
  /**
   * Clean up extension state
   */
  cleanup?: (state: WorldState) => WorldState;
  
  /**
   * Process state changes 
   */
  processStateChange?: (prevState: WorldState, nextState: WorldState) => WorldState;
}

/**
 * Registry of active extensions
 */
export interface ExtensionRegistry {
  /**
   * Map of extension IDs to extension instances
   */
  extensions: Record<string, WorldModelExtension>;
  
  /**
   * Order in which extensions should be processed
   */
  processingOrder: string[];
}