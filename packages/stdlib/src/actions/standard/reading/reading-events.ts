/**
 * Event definitions for the reading action
 * @module
 */

import { ISemanticEvent } from '@sharpee/core';

/**
 * Data for reading events
 */
export interface ReadingEventData {
  /** ID of the entity being read */
  targetId: string;
  /** Name of the entity being read */
  targetName: string;
  /** The text content */
  text: string;
  /** Type of readable (book, sign, note, etc.) */
  readableType?: string;
  /** Whether this has been read before */
  hasBeenRead?: boolean;
  /** Current page (for multi-page items) */
  currentPage?: number;
  /** Total pages (for multi-page items) */
  totalPages?: number;
}

/**
 * Create a reading event
 */
export function createReadingEvent(data: ReadingEventData): ISemanticEvent {
  return {
    id: `${Date.now()}-read`,
    type: 'if.event.read',
    timestamp: Date.now(),
    data: { ...data } as Record<string, unknown>,
    entities: {
      target: data.targetId
    }
  };
}

/**
 * Reading event type map
 */
export interface ReadingEventMap {
  'if.event.read': ReadingEventData;
}