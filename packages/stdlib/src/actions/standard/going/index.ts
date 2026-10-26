/**
 * Going action module
 *
 * Exports the going action and its associated event types. The exit
 * evaluator key builders live with traversal's home in world-model
 * (ADR-378 D3); they are re-exported here for the story-loader's registrar
 * and the expanse edge readers.
 */

export { goingAction, goingLifecycle } from './going.js';
export { exitBlockedKey, exitMessageKey, exitHiddenKey } from '@sharpee/world-model';
export type {
  ActorMovedEventData,
  ActorExitedEventData,
  ActorEnteredEventData,
  GoingErrorData
} from './going-events.js';
