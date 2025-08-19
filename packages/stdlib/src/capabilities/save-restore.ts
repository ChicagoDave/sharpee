/**
 * Save/Restore capability for managing save game slots and metadata
 */

import { ICapabilitySchema } from '@sharpee/world-model';

/**
 * Save/Restore capability schema
 * Manages save game slots and metadata
 */
export const SaveRestoreCapabilitySchema: ICapabilitySchema = {
  saves: {
    type: 'object',
    default: {},
    required: true
  },
  lastSave: {
    type: 'string',
    default: '',
    required: false
  },
  autoSaveEnabled: {
    type: 'boolean',
    default: true,
    required: false
  },
  maxSaveSlots: {
    type: 'number',
    default: 10,
    required: false
  }
};

/**
 * Individual save data
 */
export interface SaveData {
  timestamp: number;
  turnCount: number;
  score: number;
  description?: string;
}

/**
 * Type-safe save/restore data interface
 */
export interface SaveRestoreData {
  saves: Record<string, SaveData>;
  lastSave?: string;
  autoSaveEnabled?: boolean;
  maxSaveSlots?: number;
}