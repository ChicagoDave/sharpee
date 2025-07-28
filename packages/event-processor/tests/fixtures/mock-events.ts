/**
 * Mock IFEvents constants for testing
 * These should match the actual event names used in the handlers
 */

export const IFEvents = {
  // Movement events
  TAKEN: 'taken',
  DROPPED: 'dropped',
  REMOVED: 'removed',
  ACTOR_MOVED: 'actor_moved',
  PUT_IN: 'put_in',
  PUT_ON: 'put_on',
  REMOVED_FROM: 'removed_from',
  
  // State change events
  OPENED: 'opened',
  CLOSED: 'closed',
  LOCKED: 'locked',
  UNLOCKED: 'unlocked',
  SWITCHED_ON: 'switched_on',
  SWITCHED_OFF: 'switched_off',
  WORN: 'worn',
  EATEN: 'eaten',
  DRUNK: 'drunk',
  
  // Observation events
  LOOK: 'look',
  EXAMINE: 'examine',
  OBSERVE: 'observe'
};
