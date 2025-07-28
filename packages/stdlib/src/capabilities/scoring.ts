/**
 * Scoring capability for tracking player score, achievements, and progress
 */

import { CapabilitySchema } from '@sharpee/world-model';

/**
 * Scoring capability schema
 * Tracks player score, achievements, and progress
 */
export const ScoringCapabilitySchema: CapabilitySchema = {
  scoreValue: {
    type: 'number',
    default: 0,
    required: true
  },
  maxScore: {
    type: 'number',
    default: 0,
    required: true
  },
  moves: {
    type: 'number',
    default: 0,
    required: false
  },
  achievements: {
    type: 'array',
    default: [],
    required: false
  },
  scoreHistory: {
    type: 'array',
    default: [],
    required: false
  }
};

/**
 * Type-safe scoring data interface
 */
export interface ScoringData {
  scoreValue: number;
  maxScore: number;
  moves?: number;
  achievements?: string[];
  scoreHistory?: Array<{
    action: string;
    points: number;
    timestamp: number;
  }>;
}