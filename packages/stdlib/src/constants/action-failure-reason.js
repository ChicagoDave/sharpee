/**
 * Enum for common action failure reasons in the IF system.
 *
 * These are used by actions to indicate why an action failed,
 * allowing the text service to map them to appropriate messages
 * in the current language.
 */
export var ActionFailureReason;
(function (ActionFailureReason) {
    // Scope and reachability
    ActionFailureReason["NOT_VISIBLE"] = "NOT_VISIBLE";
    ActionFailureReason["NOT_REACHABLE"] = "NOT_REACHABLE";
    ActionFailureReason["NOT_IN_SCOPE"] = "NOT_IN_SCOPE";
    // Object state
    ActionFailureReason["FIXED_IN_PLACE"] = "FIXED_IN_PLACE";
    ActionFailureReason["ALREADY_OPEN"] = "ALREADY_OPEN";
    ActionFailureReason["ALREADY_CLOSED"] = "ALREADY_CLOSED";
    ActionFailureReason["NOT_OPENABLE"] = "NOT_OPENABLE";
    ActionFailureReason["LOCKED"] = "LOCKED";
    ActionFailureReason["NOT_LOCKABLE"] = "NOT_LOCKABLE";
    ActionFailureReason["ALREADY_LOCKED"] = "ALREADY_LOCKED";
    ActionFailureReason["ALREADY_UNLOCKED"] = "ALREADY_UNLOCKED";
    // Container and supporter
    ActionFailureReason["CONTAINER_FULL"] = "CONTAINER_FULL";
    ActionFailureReason["CONTAINER_CLOSED"] = "CONTAINER_CLOSED";
    ActionFailureReason["NOT_A_CONTAINER"] = "NOT_A_CONTAINER";
    ActionFailureReason["NOT_A_SUPPORTER"] = "NOT_A_SUPPORTER";
    ActionFailureReason["ALREADY_IN_CONTAINER"] = "ALREADY_IN_CONTAINER";
    // Wearable
    ActionFailureReason["NOT_WEARABLE"] = "NOT_WEARABLE";
    ActionFailureReason["ALREADY_WEARING"] = "ALREADY_WEARING";
    ActionFailureReason["NOT_WEARING"] = "NOT_WEARING";
    ActionFailureReason["WORN_BY_OTHER"] = "WORN_BY_OTHER";
    // Portable/weight
    ActionFailureReason["TOO_HEAVY"] = "TOO_HEAVY";
    ActionFailureReason["CARRYING_TOO_MUCH"] = "CARRYING_TOO_MUCH";
    // Keys and unlocking
    ActionFailureReason["WRONG_KEY"] = "WRONG_KEY";
    ActionFailureReason["NO_KEY_SPECIFIED"] = "NO_KEY_SPECIFIED";
    ActionFailureReason["NOT_A_KEY"] = "NOT_A_KEY";
    // Device/switchable
    ActionFailureReason["ALREADY_ON"] = "ALREADY_ON";
    ActionFailureReason["ALREADY_OFF"] = "ALREADY_OFF";
    ActionFailureReason["NOT_SWITCHABLE"] = "NOT_SWITCHABLE";
    // Movement
    ActionFailureReason["NO_EXIT_THAT_WAY"] = "NO_EXIT_THAT_WAY";
    ActionFailureReason["CANT_GO_THAT_WAY"] = "CANT_GO_THAT_WAY";
    ActionFailureReason["DOOR_CLOSED"] = "DOOR_CLOSED";
    ActionFailureReason["DOOR_LOCKED"] = "DOOR_LOCKED";
    // Dialogue and NPCs
    ActionFailureReason["CANT_TALK_TO_THAT"] = "CANT_TALK_TO_THAT";
    ActionFailureReason["NO_RESPONSE"] = "NO_RESPONSE";
    ActionFailureReason["NOT_A_PERSON"] = "NOT_A_PERSON";
    // General
    ActionFailureReason["CANT_DO_THAT"] = "CANT_DO_THAT";
    ActionFailureReason["NOT_IMPLEMENTED"] = "NOT_IMPLEMENTED";
    ActionFailureReason["INVALID_TARGET"] = "INVALID_TARGET";
    ActionFailureReason["AMBIGUOUS_TARGET"] = "AMBIGUOUS_TARGET";
    ActionFailureReason["NOTHING_HAPPENS"] = "NOTHING_HAPPENS";
    // Actor state
    ActionFailureReason["ACTOR_CANT_SEE"] = "ACTOR_CANT_SEE";
    ActionFailureReason["ACTOR_CANT_REACH"] = "ACTOR_CANT_REACH";
    ActionFailureReason["ACTOR_BUSY"] = "ACTOR_BUSY";
    // Edible
    ActionFailureReason["NOT_EDIBLE"] = "NOT_EDIBLE";
    // Readable
    ActionFailureReason["NOT_READABLE"] = "NOT_READABLE";
    ActionFailureReason["NOTHING_WRITTEN"] = "NOTHING_WRITTEN";
    // Giving/receiving
    ActionFailureReason["WONT_ACCEPT"] = "WONT_ACCEPT";
    ActionFailureReason["CANT_GIVE_TO_SELF"] = "CANT_GIVE_TO_SELF";
    // Using/manipulation
    ActionFailureReason["CANT_USE_THAT"] = "CANT_USE_THAT";
    ActionFailureReason["CANT_USE_TOGETHER"] = "CANT_USE_TOGETHER";
    ActionFailureReason["NOTHING_TO_USE_WITH"] = "NOTHING_TO_USE_WITH";
})(ActionFailureReason || (ActionFailureReason = {}));
/**
 * Type guard to check if a value is an ActionFailureReason
 */
export function isActionFailureReason(value) {
    return Object.values(ActionFailureReason).includes(value);
}
//# sourceMappingURL=action-failure-reason.js.map