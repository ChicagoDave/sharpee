/**
 * Say Action Module
 *
 * Handles player speech in Dungeo.
 * Used for the Cyclops puzzle and potentially other speech interactions.
 */

export * from './types';
export * from './say-action';

import { sayAction } from './say-action';

export const sayActions = [sayAction];
