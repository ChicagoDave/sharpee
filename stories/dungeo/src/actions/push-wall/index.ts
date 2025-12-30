/**
 * Push Wall Action Module
 *
 * Exports the push wall action for the Royal Puzzle.
 */

export * from './types';
export { pushWallAction } from './push-wall-action';

import { pushWallAction } from './push-wall-action';

export const pushWallActions = [pushWallAction];
