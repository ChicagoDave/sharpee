// packages/stdlib/src/constants/if-actions.ts

/**
 * Standard Interactive Fiction actions
 * These are the common verbs/actions that players can perform
 */
export enum IFActions {
  // Movement actions
  GOING = 'if.action.going',
  ENTERING = 'if.action.entering',
  EXITING = 'if.action.exiting',
  CLIMBING = 'if.action.climbing',
  JUMPING = 'if.action.jumping',
  
  // Observation actions
  LOOKING = 'if.action.looking',
  EXAMINING = 'if.action.examining',
  SEARCHING = 'if.action.searching',
  LOOKING_UNDER = 'if.action.looking_under',
  LOOKING_BEHIND = 'if.action.looking_behind',
  LISTENING = 'if.action.listening',
  SMELLING = 'if.action.smelling',
  TOUCHING = 'if.action.touching',
  TASTING = 'if.action.tasting',
  
  // Object manipulation
  TAKING = 'if.action.taking',
  DROPPING = 'if.action.dropping',
  PUTTING = 'if.action.putting',
  INSERTING = 'if.action.inserting',
  REMOVING = 'if.action.removing',
  THROWING = 'if.action.throwing',
  
  // Container/supporter actions
  OPENING = 'if.action.opening',
  CLOSING = 'if.action.closing',
  EMPTYING = 'if.action.emptying',
  
  // Lock/unlock actions
  LOCKING = 'if.action.locking',
  UNLOCKING = 'if.action.unlocking',
  
  // Wearing actions
  WEARING = 'if.action.wearing',
  TAKING_OFF = 'if.action.taking_off',
  
  // Device actions
  SWITCHING_ON = 'if.action.switching_on',
  SWITCHING_OFF = 'if.action.switching_off',
  PUSHING = 'if.action.pushing',
  PULLING = 'if.action.pulling',
  TURNING = 'if.action.turning',
  SETTING = 'if.action.setting',
  
  // Consumption actions
  EATING = 'if.action.eating',
  DRINKING = 'if.action.drinking',
  
  // Communication actions
  TALKING = 'if.action.talking',
  ASKING = 'if.action.asking',
  TELLING = 'if.action.telling',
  ANSWERING = 'if.action.answering',
  SHOWING = 'if.action.showing',
  GIVING = 'if.action.giving',
  
  // Combat/interaction actions
  ATTACKING = 'if.action.attacking',
  KISSING = 'if.action.kissing',
  WAVING = 'if.action.waving',
  
  // Using actions
  USING = 'if.action.using',
  CONSULTING = 'if.action.consulting',
  
  // Meta actions
  INVENTORY = 'if.action.inventory',
  WAITING = 'if.action.waiting',
  SLEEPING = 'if.action.sleeping',
  WAKING = 'if.action.waking',
  SAVING = 'if.action.saving',
  RESTORING = 'if.action.restoring',
  RESTARTING = 'if.action.restarting',
  QUITTING = 'if.action.quitting',
  SCORING = 'if.action.scoring',
  VERIFYING = 'if.action.verifying',
  VERSION = 'if.action.version',
  HELP = 'if.action.help',
  HINTS = 'if.action.hints',
  ABOUT = 'if.action.about'
}

/**
 * Action categories for grouping
 */
export enum IFActionCategory {
  MOVEMENT = 'movement',
  OBSERVATION = 'observation',
  MANIPULATION = 'manipulation',
  CONTAINER = 'container',
  DEVICE = 'device',
  CONSUMPTION = 'consumption',
  COMMUNICATION = 'communication',
  COMBAT = 'combat',
  META = 'meta'
}

/**
 * Map actions to their categories
 */
export const IF_ACTION_CATEGORIES: Record<IFActions, IFActionCategory> = {
  // Movement
  [IFActions.GOING]: IFActionCategory.MOVEMENT,
  [IFActions.ENTERING]: IFActionCategory.MOVEMENT,
  [IFActions.EXITING]: IFActionCategory.MOVEMENT,
  [IFActions.CLIMBING]: IFActionCategory.MOVEMENT,
  [IFActions.JUMPING]: IFActionCategory.MOVEMENT,
  
  // Observation
  [IFActions.LOOKING]: IFActionCategory.OBSERVATION,
  [IFActions.EXAMINING]: IFActionCategory.OBSERVATION,
  [IFActions.SEARCHING]: IFActionCategory.OBSERVATION,
  [IFActions.LOOKING_UNDER]: IFActionCategory.OBSERVATION,
  [IFActions.LOOKING_BEHIND]: IFActionCategory.OBSERVATION,
  [IFActions.LISTENING]: IFActionCategory.OBSERVATION,
  [IFActions.SMELLING]: IFActionCategory.OBSERVATION,
  [IFActions.TOUCHING]: IFActionCategory.OBSERVATION,
  [IFActions.TASTING]: IFActionCategory.OBSERVATION,
  
  // Manipulation
  [IFActions.TAKING]: IFActionCategory.MANIPULATION,
  [IFActions.DROPPING]: IFActionCategory.MANIPULATION,
  [IFActions.PUTTING]: IFActionCategory.MANIPULATION,
  [IFActions.INSERTING]: IFActionCategory.MANIPULATION,
  [IFActions.REMOVING]: IFActionCategory.MANIPULATION,
  [IFActions.THROWING]: IFActionCategory.MANIPULATION,
  [IFActions.WEARING]: IFActionCategory.MANIPULATION,
  [IFActions.TAKING_OFF]: IFActionCategory.MANIPULATION,
  [IFActions.GIVING]: IFActionCategory.MANIPULATION,
  [IFActions.SHOWING]: IFActionCategory.MANIPULATION,
  
  // Container
  [IFActions.OPENING]: IFActionCategory.CONTAINER,
  [IFActions.CLOSING]: IFActionCategory.CONTAINER,
  [IFActions.EMPTYING]: IFActionCategory.CONTAINER,
  [IFActions.LOCKING]: IFActionCategory.CONTAINER,
  [IFActions.UNLOCKING]: IFActionCategory.CONTAINER,
  
  // Device
  [IFActions.SWITCHING_ON]: IFActionCategory.DEVICE,
  [IFActions.SWITCHING_OFF]: IFActionCategory.DEVICE,
  [IFActions.PUSHING]: IFActionCategory.DEVICE,
  [IFActions.PULLING]: IFActionCategory.DEVICE,
  [IFActions.TURNING]: IFActionCategory.DEVICE,
  [IFActions.SETTING]: IFActionCategory.DEVICE,
  [IFActions.USING]: IFActionCategory.DEVICE,
  
  // Consumption
  [IFActions.EATING]: IFActionCategory.CONSUMPTION,
  [IFActions.DRINKING]: IFActionCategory.CONSUMPTION,
  
  // Communication
  [IFActions.TALKING]: IFActionCategory.COMMUNICATION,
  [IFActions.ASKING]: IFActionCategory.COMMUNICATION,
  [IFActions.TELLING]: IFActionCategory.COMMUNICATION,
  [IFActions.ANSWERING]: IFActionCategory.COMMUNICATION,
  
  // Combat
  [IFActions.ATTACKING]: IFActionCategory.COMBAT,
  [IFActions.KISSING]: IFActionCategory.COMBAT,
  [IFActions.WAVING]: IFActionCategory.COMBAT,
  
  // Meta
  [IFActions.INVENTORY]: IFActionCategory.META,
  [IFActions.WAITING]: IFActionCategory.META,
  [IFActions.SLEEPING]: IFActionCategory.META,
  [IFActions.WAKING]: IFActionCategory.META,
  [IFActions.SAVING]: IFActionCategory.META,
  [IFActions.RESTORING]: IFActionCategory.META,
  [IFActions.RESTARTING]: IFActionCategory.META,
  [IFActions.QUITTING]: IFActionCategory.META,
  [IFActions.SCORING]: IFActionCategory.META,
  [IFActions.VERIFYING]: IFActionCategory.META,
  [IFActions.VERSION]: IFActionCategory.META,
  [IFActions.HELP]: IFActionCategory.META,
  [IFActions.HINTS]: IFActionCategory.META,
  [IFActions.ABOUT]: IFActionCategory.META,
  [IFActions.CONSULTING]: IFActionCategory.META
};
