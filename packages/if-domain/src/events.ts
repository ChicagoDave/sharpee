/**
 * Standard Interactive Fiction events.
 * 
 * These are the core events that can occur in the IF world model.
 * Extensions can add their own events using namespaced identifiers.
 */

export const IFEvents = {
  // Core object manipulation
  TAKEN: 'taken',
  DROPPED: 'dropped',
  MOVED: 'moved',
  EXAMINED: 'examined',
  
  // Container/supporter events  
  PUT_IN: 'put_in',
  PUT_ON: 'put_on',
  REMOVED_FROM: 'removed_from',
  ITEM_PUT_ON: 'item_put_on',
  ITEM_REMOVED_FROM: 'item_removed_from',
  CONTAINER_EMPTIED: 'container_emptied',
  CONTAINER_NOT_OPEN: 'container_not_open',
  NOT_A_CONTAINER: 'not_a_container',
  NOT_A_SUPPORTER: 'not_a_supporter',
  DOESNT_FIT: 'doesnt_fit',
  
  // Openable events
  OPENED: 'opened',
  CLOSED: 'closed',
  NOT_OPENABLE: 'not_openable',
  
  // Lockable events
  LOCKED: 'locked',
  UNLOCKED: 'unlocked',
  CONTAINER_LOCKED: 'container_locked',
  CONTAINER_UNLOCKED: 'container_unlocked',
  ALREADY_LOCKED: 'already_locked',
  ALREADY_UNLOCKED: 'already_unlocked',
  UNLOCK_FAILED: 'unlock_failed',
  NOT_LOCKABLE: 'not_lockable',
  
  // Switchable events
  SWITCHED_ON: 'switched_on',
  SWITCHED_OFF: 'switched_off',
  DEVICE_SWITCHED_ON: 'device_switched_on',
  DEVICE_SWITCHED_OFF: 'device_switched_off',
  DEVICE_ACTIVATED: 'device_activated',
  
  // Wearable events
  WORN: 'worn',
  REMOVED: 'removed',
  
  // Edible events
  EATEN: 'eaten',
  DRUNK: 'drunk',
  ITEM_EATEN: 'item_eaten',
  ITEM_DRUNK: 'item_drunk',
  ITEM_DESTROYED: 'item_destroyed',
  
  // Movement events
  ACTOR_MOVED: 'actor_moved',
  ACTOR_ENTERED: 'actor_entered',
  ACTOR_EXITED: 'actor_exited',
  MOVEMENT_BLOCKED: 'movement_blocked',
  
  // Entry/exit events
  ENTERED: 'entered',
  EXITED: 'exited',
  EVACUATED: 'evacuated',
  CLIMBED: 'climbed',
  
  // Room events
  ROOM_ENTERED: 'room_entered',
  ROOM_EXITED: 'room_exited',
  ROOM_DESCRIBED: 'room_described',
  ROOM_FIRST_ENTERED: 'room_first_entered',
  ROOM_ILLUMINATED: 'room_illuminated',
  ROOM_DARKENED: 'room_darkened',
  NEW_EXIT_REVEALED: 'new_exit_revealed',
  
  // Light events
  LIGHT_CHANGED: 'light_changed',
  LOCATION_ILLUMINATED: 'location_illuminated',
  LOCATION_DARKENED: 'location_darkened',
  FUEL_DEPLETED: 'fuel_depleted',
  FUEL_LOW: 'fuel_low',
  REFUELED: 'refueled',
  
  // Reading events
  READ: 'read',
  
  // Observation events
  SEARCHED: 'searched',
  LISTENED: 'listened',
  SMELLED: 'smelled',
  TOUCHED: 'touched',
  
  // Social/interaction events
  GIVEN: 'given',
  SHOWN: 'shown',
  THROWN: 'thrown',
  
  // Device manipulation events
  PUSHED: 'pushed',
  PULLED: 'pulled',
  TURNED: 'turned',
  USED: 'used',
  
  // General message events
  CUSTOM_MESSAGE: 'custom_message',
  
  // Visibility events
  VISIBILITY_CHANGED: 'visibility_changed',
  
  // Action meta-events
  ACTION_PREVENTED: 'action_prevented',
  ACTION_FAILED: 'action_failed',
  ACTION_SUCCEEDED: 'action_succeeded',
  
  // Meta action events
  WAITED: 'waited',
  SCORE_DISPLAYED: 'score_displayed',
  HELP_DISPLAYED: 'help_displayed',
  ABOUT_DISPLAYED: 'about_displayed',

  // Scoring events (ADR-085)
  SCORE_GAINED: 'if.event.score_gained',
  SCORE_LOST: 'if.event.score_lost',
} as const;

export type IFEventType = typeof IFEvents[keyof typeof IFEvents];

/**
 * Event categories for filtering and handling
 */
export const IFEventCategory = {
  MANIPULATION: 'manipulation',
  MOVEMENT: 'movement',
  STATE_CHANGE: 'state_change',
  PERCEPTION: 'perception',
  META: 'meta',
} as const;

export type IFEventCategoryType = typeof IFEventCategory[keyof typeof IFEventCategory];
