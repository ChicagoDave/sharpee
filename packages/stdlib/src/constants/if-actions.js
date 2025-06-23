// packages/stdlib/src/constants/if-actions.ts
/**
 * Standard Interactive Fiction actions
 * These are the common verbs/actions that players can perform
 */
export var IFActions;
(function (IFActions) {
    // Movement actions
    IFActions["GOING"] = "if.action.going";
    IFActions["ENTERING"] = "if.action.entering";
    IFActions["EXITING"] = "if.action.exiting";
    IFActions["CLIMBING"] = "if.action.climbing";
    IFActions["JUMPING"] = "if.action.jumping";
    // Observation actions
    IFActions["LOOKING"] = "if.action.looking";
    IFActions["EXAMINING"] = "if.action.examining";
    IFActions["SEARCHING"] = "if.action.searching";
    IFActions["LOOKING_UNDER"] = "if.action.looking_under";
    IFActions["LOOKING_BEHIND"] = "if.action.looking_behind";
    IFActions["LISTENING"] = "if.action.listening";
    IFActions["SMELLING"] = "if.action.smelling";
    IFActions["TOUCHING"] = "if.action.touching";
    IFActions["TASTING"] = "if.action.tasting";
    // Object manipulation
    IFActions["TAKING"] = "if.action.taking";
    IFActions["DROPPING"] = "if.action.dropping";
    IFActions["PUTTING"] = "if.action.putting";
    IFActions["INSERTING"] = "if.action.inserting";
    IFActions["REMOVING"] = "if.action.removing";
    IFActions["THROWING"] = "if.action.throwing";
    // Container/supporter actions
    IFActions["OPENING"] = "if.action.opening";
    IFActions["CLOSING"] = "if.action.closing";
    IFActions["EMPTYING"] = "if.action.emptying";
    // Lock/unlock actions
    IFActions["LOCKING"] = "if.action.locking";
    IFActions["UNLOCKING"] = "if.action.unlocking";
    // Wearing actions
    IFActions["WEARING"] = "if.action.wearing";
    IFActions["TAKING_OFF"] = "if.action.taking_off";
    // Device actions
    IFActions["SWITCHING_ON"] = "if.action.switching_on";
    IFActions["SWITCHING_OFF"] = "if.action.switching_off";
    IFActions["PUSHING"] = "if.action.pushing";
    IFActions["PULLING"] = "if.action.pulling";
    IFActions["TURNING"] = "if.action.turning";
    IFActions["SETTING"] = "if.action.setting";
    // Consumption actions
    IFActions["EATING"] = "if.action.eating";
    IFActions["DRINKING"] = "if.action.drinking";
    // Communication actions
    IFActions["TALKING"] = "if.action.talking";
    IFActions["ASKING"] = "if.action.asking";
    IFActions["TELLING"] = "if.action.telling";
    IFActions["ANSWERING"] = "if.action.answering";
    IFActions["SHOWING"] = "if.action.showing";
    IFActions["GIVING"] = "if.action.giving";
    // Combat/interaction actions
    IFActions["ATTACKING"] = "if.action.attacking";
    IFActions["KISSING"] = "if.action.kissing";
    IFActions["WAVING"] = "if.action.waving";
    // Using actions
    IFActions["USING"] = "if.action.using";
    IFActions["CONSULTING"] = "if.action.consulting";
    // Meta actions
    IFActions["INVENTORY"] = "if.action.inventory";
    IFActions["WAITING"] = "if.action.waiting";
    IFActions["SLEEPING"] = "if.action.sleeping";
    IFActions["WAKING"] = "if.action.waking";
    IFActions["SAVING"] = "if.action.saving";
    IFActions["RESTORING"] = "if.action.restoring";
    IFActions["RESTARTING"] = "if.action.restarting";
    IFActions["QUITTING"] = "if.action.quitting";
    IFActions["SCORING"] = "if.action.scoring";
    IFActions["VERIFYING"] = "if.action.verifying";
    IFActions["VERSION"] = "if.action.version";
    IFActions["HELP"] = "if.action.help";
    IFActions["HINTS"] = "if.action.hints";
    IFActions["ABOUT"] = "if.action.about";
})(IFActions || (IFActions = {}));
/**
 * Action categories for grouping
 */
export var IFActionCategory;
(function (IFActionCategory) {
    IFActionCategory["MOVEMENT"] = "movement";
    IFActionCategory["OBSERVATION"] = "observation";
    IFActionCategory["MANIPULATION"] = "manipulation";
    IFActionCategory["CONTAINER"] = "container";
    IFActionCategory["DEVICE"] = "device";
    IFActionCategory["CONSUMPTION"] = "consumption";
    IFActionCategory["COMMUNICATION"] = "communication";
    IFActionCategory["COMBAT"] = "combat";
    IFActionCategory["META"] = "meta";
})(IFActionCategory || (IFActionCategory = {}));
/**
 * Map actions to their categories
 */
export const IF_ACTION_CATEGORIES = {
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
//# sourceMappingURL=if-actions.js.map