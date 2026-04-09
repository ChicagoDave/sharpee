/**
 * Custom actions for The Alderman.
 *
 * Public interface: customActions, ACCUSE_ACTION_ID, setSolution
 * Owner: thealderman story
 */

export { accuseAction, ACCUSE_ACTION_ID, setSolution } from './accuse-action';

import { accuseAction } from './accuse-action';
import type { Action } from '@sharpee/stdlib';

/** All story-specific actions. */
export const customActions: Action[] = [
  accuseAction,
];
