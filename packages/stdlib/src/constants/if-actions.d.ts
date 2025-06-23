/**
 * Standard Interactive Fiction actions
 * These are the common verbs/actions that players can perform
 */
export declare enum IFActions {
    GOING = "if.action.going",
    ENTERING = "if.action.entering",
    EXITING = "if.action.exiting",
    CLIMBING = "if.action.climbing",
    JUMPING = "if.action.jumping",
    LOOKING = "if.action.looking",
    EXAMINING = "if.action.examining",
    SEARCHING = "if.action.searching",
    LOOKING_UNDER = "if.action.looking_under",
    LOOKING_BEHIND = "if.action.looking_behind",
    LISTENING = "if.action.listening",
    SMELLING = "if.action.smelling",
    TOUCHING = "if.action.touching",
    TASTING = "if.action.tasting",
    TAKING = "if.action.taking",
    DROPPING = "if.action.dropping",
    PUTTING = "if.action.putting",
    INSERTING = "if.action.inserting",
    REMOVING = "if.action.removing",
    THROWING = "if.action.throwing",
    OPENING = "if.action.opening",
    CLOSING = "if.action.closing",
    EMPTYING = "if.action.emptying",
    LOCKING = "if.action.locking",
    UNLOCKING = "if.action.unlocking",
    WEARING = "if.action.wearing",
    TAKING_OFF = "if.action.taking_off",
    SWITCHING_ON = "if.action.switching_on",
    SWITCHING_OFF = "if.action.switching_off",
    PUSHING = "if.action.pushing",
    PULLING = "if.action.pulling",
    TURNING = "if.action.turning",
    SETTING = "if.action.setting",
    EATING = "if.action.eating",
    DRINKING = "if.action.drinking",
    TALKING = "if.action.talking",
    ASKING = "if.action.asking",
    TELLING = "if.action.telling",
    ANSWERING = "if.action.answering",
    SHOWING = "if.action.showing",
    GIVING = "if.action.giving",
    ATTACKING = "if.action.attacking",
    KISSING = "if.action.kissing",
    WAVING = "if.action.waving",
    USING = "if.action.using",
    CONSULTING = "if.action.consulting",
    INVENTORY = "if.action.inventory",
    WAITING = "if.action.waiting",
    SLEEPING = "if.action.sleeping",
    WAKING = "if.action.waking",
    SAVING = "if.action.saving",
    RESTORING = "if.action.restoring",
    RESTARTING = "if.action.restarting",
    QUITTING = "if.action.quitting",
    SCORING = "if.action.scoring",
    VERIFYING = "if.action.verifying",
    VERSION = "if.action.version",
    HELP = "if.action.help",
    HINTS = "if.action.hints",
    ABOUT = "if.action.about"
}
/**
 * Action categories for grouping
 */
export declare enum IFActionCategory {
    MOVEMENT = "movement",
    OBSERVATION = "observation",
    MANIPULATION = "manipulation",
    CONTAINER = "container",
    DEVICE = "device",
    CONSUMPTION = "consumption",
    COMMUNICATION = "communication",
    COMBAT = "combat",
    META = "meta"
}
/**
 * Map actions to their categories
 */
export declare const IF_ACTION_CATEGORIES: Record<IFActions, IFActionCategory>;
