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
  ENTERING_ROOM: 'if.action.entering_room', // ADR-126: destination interceptor for room entry conditions
  ENTERING: 'if.action.entering',
  EXITING: 'if.action.exiting',
  CLIMBING: 'if.action.climbing',
  JUMPING: 'if.action.jumping',
  
  // Observation actions
  LOOKING: 'if.action.looking',
  EXAMINING: 'if.action.examining',
  SEARCHING: 'if.action.searching',
  LOOKING_UNDER: 'if.action.looking_under',
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

  // Tool-gated dispatch actions (ADR-230 D3c / Phase 6)
  CUTTING: 'if.action.cutting',
  DIGGING: 'if.action.digging',
  
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
  ASKING_FOR: 'if.action.asking_for', // ADR-372 D3
  TELLING: 'if.action.telling',
  ANSWERING: 'if.action.answering',
  SAYING_GOODBYE: 'if.action.saying_goodbye',
  // ADR-370 D2: bare yes / no / sorry outside an open exchange
  SAYING_YES: 'if.action.saying_yes',
  SAYING_NO: 'if.action.saying_no',
  SAYING_SORRY: 'if.action.saying_sorry',
  SHOWING: 'if.action.showing',
  GIVING: 'if.action.giving',
  BUYING: 'if.action.buying', // ADR-372 D5
  TYING: 'if.action.tying', // ADR-373 D6
  UNTYING: 'if.action.untying', // ADR-373 D6
  LIGHTING: 'if.action.lighting', // ADR-374 D9
  EXTINGUISHING: 'if.action.extinguishing', // ADR-374 D9
  
  // Combat/interaction actions
  ATTACKING: 'if.action.attacking',
  KISSING: 'if.action.kissing',
  BURNING: 'if.action.burning', // ADR-371 D2
  BREAKING: 'if.action.breaking', // ADR-373 D3: no grammar; fired by the action that broke the thing
  WAVING: 'if.action.waving',

  // Concealment actions (ADR-148)
  HIDING: 'if.action.hiding',
  REVEALING: 'if.action.revealing',

  // Capability-dispatch actions (ADR-090)
  // These dispatch to trait behaviors instead of having fixed semantics
  LOWERING: 'if.action.lowering',
  RAISING: 'if.action.raising',
  
  // Reference actions
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
  UNDOING: 'if.action.undoing',
  AGAIN: 'if.action.again',
  SCORING: 'if.action.scoring',
  VERSION: 'if.action.version',
  HELP: 'if.action.help',
  ABOUT: 'if.action.about',
} as const;

export type IFActionType = typeof IFActions[keyof typeof IFActions];
