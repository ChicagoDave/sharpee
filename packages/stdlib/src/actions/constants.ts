/**
 * Standard Interactive Fiction action identifiers
 * 
 * These are the common verbs/actions that players can perform
 */

export const ActionIDs = {
  // Movement actions
  GOING: 'if.action.going',
  
  // Observation actions
  LOOKING: 'if.action.looking',
  EXAMINING: 'if.action.examining',
  
  // Object manipulation
  TAKING: 'if.action.taking',
  DROPPING: 'if.action.dropping',
  
  // Container/supporter actions
  OPENING: 'if.action.opening',
  
  // Meta actions
  INVENTORY: 'if.action.inventory',
} as const;

export const IFActions = {
  // Movement actions
  GOING: 'if.action.going',
  ENTERING: 'if.action.entering',
  EXITING: 'if.action.exiting',
  CLIMBING: 'if.action.climbing',
  JUMPING: 'if.action.jumping',
  
  // Observation actions
  LOOKING: 'if.action.looking',
  EXAMINING: 'if.action.examining',
  SEARCHING: 'if.action.searching',
  LOOKING_UNDER: 'if.action.looking_under',
  LOOKING_BEHIND: 'if.action.looking_behind',
  LISTENING: 'if.action.listening',
  SMELLING: 'if.action.smelling',
  TOUCHING: 'if.action.touching',
  TASTING: 'if.action.tasting',
  
  // Object manipulation
  TAKING: 'if.action.taking',
  DROPPING: 'if.action.dropping',
  PUTTING: 'if.action.putting',
  INSERTING: 'if.action.inserting',
  REMOVING: 'if.action.removing',
  THROWING: 'if.action.throwing',
  
  // Container/supporter actions
  OPENING: 'if.action.opening',
  CLOSING: 'if.action.closing',
  EMPTYING: 'if.action.emptying',
  
  // Lock/unlock actions
  LOCKING: 'if.action.locking',
  UNLOCKING: 'if.action.unlocking',
  
  // Wearing actions
  WEARING: 'if.action.wearing',
  TAKING_OFF: 'if.action.taking_off',
  
  // Device actions
  SWITCHING_ON: 'if.action.switching_on',
  SWITCHING_OFF: 'if.action.switching_off',
  PUSHING: 'if.action.pushing',
  PULLING: 'if.action.pulling',
  TURNING: 'if.action.turning',
  SETTING: 'if.action.setting',
  
  // Consumption actions
  EATING: 'if.action.eating',
  DRINKING: 'if.action.drinking',
  
  // Communication actions
  TALKING: 'if.action.talking',
  ASKING: 'if.action.asking',
  TELLING: 'if.action.telling',
  ANSWERING: 'if.action.answering',
  SHOWING: 'if.action.showing',
  GIVING: 'if.action.giving',
  
  // Combat/interaction actions
  ATTACKING: 'if.action.attacking',
  KISSING: 'if.action.kissing',
  WAVING: 'if.action.waving',
  
  // Using actions
  // USING: 'if.action.using', // Removed - USE is not idiomatic IF
  CONSULTING: 'if.action.consulting',
  READING: 'if.action.reading',
  
  // Meta actions
  INVENTORY: 'if.action.inventory',
  WAITING: 'if.action.waiting',
  SLEEPING: 'if.action.sleeping',
  WAKING: 'if.action.waking',
  SAVING: 'if.action.saving',
  RESTORING: 'if.action.restoring',
  RESTARTING: 'if.action.restarting',
  QUITTING: 'if.action.quitting',
  SCORING: 'if.action.scoring',
  VERIFYING: 'if.action.verifying',
  VERSION: 'if.action.version',
  HELP: 'if.action.help',
  HINTS: 'if.action.hints',
  ABOUT: 'if.action.about',
} as const;

export type IFActionType = typeof IFActions[keyof typeof IFActions];
