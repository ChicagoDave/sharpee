/**
 * Event handler types for the event system (ADR-075)
 *
 * Entity `on` handler types were removed in ISSUE-068.
 * Only story-level handler types remain.
 */

import type { ISemanticEvent } from '@sharpee/core';
import type { WorldQuery } from './effects/world-query';
import type { Effect } from './effects/types';

/**
 * Game event that can be handled by the story
 */
export interface IGameEvent extends ISemanticEvent {
  type: string;
  data: Record<string, any>;
}

/**
 * Story-level event handler (ADR-075)
 *
 * Receives read-only WorldQuery and returns Effect[]
 */
export type StoryEventHandler = (event: IGameEvent, query: WorldQuery) => Effect[];
