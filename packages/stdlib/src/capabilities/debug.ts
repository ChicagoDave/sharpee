/**
 * Debug capability for tracking debug/author command settings
 * 
 * This capability stores flags for various debug outputs that can be
 * toggled via meta-commands (author commands) without affecting game state.
 */

import { CapabilitySchema } from '@sharpee/world-model';

/**
 * Debug capability schema
 * Tracks which debug events should be emitted
 */
export const DebugCapabilitySchema: CapabilitySchema = {
  debugParserEvents: {
    type: 'boolean',
    default: false,
    required: false
  },
  debugValidationEvents: {
    type: 'boolean',
    default: false,
    required: false
  },
  debugSystemEvents: {
    type: 'boolean',
    default: false,
    required: false
  },
  debugEngineEvents: {
    type: 'boolean',
    default: false,
    required: false
  },
  debugTextEvents: {
    type: 'boolean',
    default: false,
    required: false
  }
};

/**
 * Type-safe debug data interface
 */
export interface DebugData {
  debugParserEvents?: boolean;
  debugValidationEvents?: boolean;
  debugSystemEvents?: boolean;
  debugEngineEvents?: boolean;
  debugTextEvents?: boolean;
}

/**
 * Standard capability name for debug settings
 */
export const DEBUG_CAPABILITY = 'debug';

/**
 * Helper to check if any debug events are enabled
 */
export function isAnyDebugEnabled(debugData: DebugData | undefined): boolean {
  if (!debugData) return false;
  
  return !!(
    debugData.debugParserEvents ||
    debugData.debugValidationEvents ||
    debugData.debugSystemEvents ||
    debugData.debugEngineEvents ||
    debugData.debugTextEvents
  );
}

/**
 * Helper to create default debug settings
 */
export function createDefaultDebugData(): DebugData {
  return {
    debugParserEvents: false,
    debugValidationEvents: false,
    debugSystemEvents: false,
    debugEngineEvents: false,
    debugTextEvents: false
  };
}