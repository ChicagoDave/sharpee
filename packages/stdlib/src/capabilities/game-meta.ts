/**
 * Game meta capability for tracking game preferences and meta information
 */

import { CapabilitySchema } from '@sharpee/world-model';

/**
 * Game meta capability schema
 * Tracks game preferences and meta information
 */
export const GameMetaCapabilitySchema: CapabilitySchema = {
  turnCount: {
    type: 'number',
    default: 0,
    required: true
  },
  startTime: {
    type: 'number',
    default: 0,
    required: true
  },
  lastAction: {
    type: 'string',
    default: '',
    required: false
  },
  preferences: {
    type: 'object',
    default: {
      verboseMode: false,
      briefMode: false,
      scoring: true
    },
    required: true
  }
};

/**
 * Type-safe game meta data interface
 */
export interface GameMetaData {
  turnCount: number;
  startTime: number;
  lastAction?: string;
  preferences: {
    verboseMode: boolean;
    briefMode: boolean;
    scoring: boolean;
    [key: string]: any;
  };
}