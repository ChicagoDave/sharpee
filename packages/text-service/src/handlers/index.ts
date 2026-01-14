/**
 * Event handlers for TextService
 *
 * @see ADR-096 Text Service Architecture
 */

// Types
export type { EventHandler, HandlerContext, ChainableEventData, GenericEventData } from './types.js';

// Handlers
export { handleRoomDescription } from './room.js';
export { handleActionSuccess, handleActionFailure } from './action.js';
export { handleRevealed } from './revealed.js';
export { handleGameMessage, handleGenericEvent } from './generic.js';
