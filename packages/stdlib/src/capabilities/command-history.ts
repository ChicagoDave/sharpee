/**
 * Command history capability for tracking executed commands
 * Supports the AGAIN/G action functionality
 */

import { ICapabilitySchema } from '@sharpee/world-model';

/**
 * Command history capability schema
 * Tracks executed commands for replay functionality
 */
export const CommandHistoryCapabilitySchema: ICapabilitySchema = {
  entries: {
    type: 'array',
    default: [],
    required: true
  },
  maxEntries: {
    type: 'number',
    default: 100,
    required: false
  }
};

/**
 * Individual command history entry
 */
export interface CommandHistoryEntry {
  actionId: string;           // 'if.action.taking'
  originalText: string;       // 'take the brass lamp'
  parsedCommand: {
    verb: string;
    directObject?: string;
    indirectObject?: string;
    preposition?: string;
  };
  turnNumber: number;
  timestamp: number;
}

/**
 * Type-safe command history data interface
 */
export interface CommandHistoryData {
  entries: CommandHistoryEntry[];
  maxEntries?: number;
}