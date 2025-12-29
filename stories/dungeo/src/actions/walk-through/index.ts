/**
 * Walk Through Action Module
 *
 * Handles the Bank of Zork wall-walking puzzle.
 */

export * from './types';
export * from './walk-through-action';

import { walkThroughAction } from './walk-through-action';

export const walkThroughActions = [walkThroughAction];
