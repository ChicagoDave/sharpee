/**
 * Going action module
 * 
 * Exports the going action and its associated event types
 */

export { goingAction, exitBlockedKey, exitMessageKey } from './going';
export type { 
  ActorMovedEventData, 
  ActorExitedEventData, 
  ActorEnteredEventData, 
  GoingErrorData 
} from './going-events';
