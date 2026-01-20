/**
 * Room Info Actions Module
 *
 * ROOM, RNAME, and OBJECTS commands for detailed room information.
 */

export * from './types';
export * from './room-action';
export * from './rname-action';
export * from './objects-action';

import { roomAction } from './room-action';
import { rnameAction } from './rname-action';
import { objectsAction } from './objects-action';

export const roomInfoActions = [roomAction, rnameAction, objectsAction];
