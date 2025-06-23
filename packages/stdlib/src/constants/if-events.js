// packages/stdlib/src/constants/if-events.ts
/**
 * Standard Interactive Fiction events
 * These are emitted when things happen in the game world
 */
export var IFEvents;
(function (IFEvents) {
    // Action lifecycle events
    IFEvents["ACTION_STARTED"] = "if.action.started";
    IFEvents["ACTION_VALIDATED"] = "if.action.validated";
    IFEvents["ACTION_PREVENTED"] = "if.action.prevented";
    IFEvents["ACTION_EXECUTED"] = "if.action.executed";
    IFEvents["ACTION_COMPLETED"] = "if.action.completed";
    IFEvents["ACTION_FAILED"] = "if.action.failed";
    IFEvents["BATCH_ACTION_COMPLETE"] = "if.action.batch_complete";
    // Item manipulation events
    IFEvents["ITEM_TAKEN"] = "if.item.taken";
    IFEvents["ITEM_DROPPED"] = "if.item.dropped";
    IFEvents["ITEM_MOVED"] = "if.item.moved";
    IFEvents["ITEM_THROWN"] = "if.item.thrown";
    IFEvents["ITEM_GIVEN"] = "if.item.given";
    IFEvents["ITEM_SHOWN"] = "if.item.shown";
    IFEvents["ITEM_EXAMINED"] = "if.item.examined";
    IFEvents["ITEM_DESTROYED"] = "if.item.destroyed";
    IFEvents["ITEM_USED"] = "if.item.used";
    // General open/close events (for any openable)
    IFEvents["OPENED"] = "if.opened";
    IFEvents["CLOSED"] = "if.closed";
    IFEvents["TAKEN"] = "if.taken";
    IFEvents["DROPPED"] = "if.dropped";
    // Container events
    IFEvents["CONTAINER_OPENED"] = "if.container.opened";
    IFEvents["CONTAINER_CLOSED"] = "if.container.closed";
    IFEvents["CONTAINER_LOCKED"] = "if.container.locked";
    IFEvents["CONTAINER_UNLOCKED"] = "if.container.unlocked";
    IFEvents["ITEM_PUT_IN"] = "if.container.item_put_in";
    IFEvents["ITEM_PUT_ON"] = "if.supporter.item_put_on";
    IFEvents["ITEM_REMOVED_FROM"] = "if.container.item_removed_from";
    IFEvents["CONTAINER_EMPTIED"] = "if.container.emptied";
    // Door events
    IFEvents["DOOR_OPENED"] = "if.door.opened";
    IFEvents["DOOR_CLOSED"] = "if.door.closed";
    IFEvents["DOOR_LOCKED"] = "if.door.locked";
    IFEvents["DOOR_UNLOCKED"] = "if.door.unlocked";
    IFEvents["DOOR_KNOCKED"] = "if.door.knocked";
    // Wearable events
    IFEvents["ITEM_WORN"] = "if.wearable.worn";
    IFEvents["ITEM_REMOVED"] = "if.wearable.removed";
    // Device events
    IFEvents["DEVICE_SWITCHED_ON"] = "if.device.switched_on";
    IFEvents["DEVICE_SWITCHED_OFF"] = "if.device.switched_off";
    IFEvents["DEVICE_ACTIVATED"] = "if.device.activated";
    IFEvents["DEVICE_DEACTIVATED"] = "if.device.deactivated";
    IFEvents["DEVICE_USED"] = "if.device.used";
    IFEvents["DEVICE_BROKEN"] = "if.device.broken";
    IFEvents["DEVICE_FIXED"] = "if.device.fixed";
    // Consumption events
    IFEvents["ITEM_EATEN"] = "if.consumable.eaten";
    IFEvents["ITEM_DRUNK"] = "if.consumable.drunk";
    // Movement events
    IFEvents["PLAYER_MOVED"] = "if.movement.player_moved";
    IFEvents["PLAYER_ENTERED"] = "if.movement.player_entered";
    IFEvents["PLAYER_EXITED"] = "if.movement.player_exited";
    IFEvents["NPC_MOVED"] = "if.movement.npc_moved";
    IFEvents["NPC_ENTERED"] = "if.movement.npc_entered";
    IFEvents["NPC_EXITED"] = "if.movement.npc_exited";
    IFEvents["MOVEMENT_BLOCKED"] = "if.movement.blocked";
    // Exit/Entry events (for new traits)
    IFEvents["MOVED"] = "if.exit.moved";
    IFEvents["ENTERED"] = "if.entry.entered";
    IFEvents["EXITED"] = "if.entry.exited";
    IFEvents["EVACUATED"] = "if.entry.evacuated";
    // Reading events
    IFEvents["READ"] = "if.readable.read";
    IFEvents["PAGE_TURNED"] = "if.readable.page_turned";
    // Light source events
    IFEvents["LIGHT_CHANGED"] = "if.light.changed";
    IFEvents["FUEL_DEPLETED"] = "if.light.fuel_depleted";
    IFEvents["FUEL_LOW"] = "if.light.fuel_low";
    IFEvents["REFUELED"] = "if.light.refueled";
    // Room/location events
    IFEvents["ROOM_DESCRIBED"] = "if.room.described";
    IFEvents["ROOM_FIRST_ENTERED"] = "if.room.first_entered";
    IFEvents["ROOM_ENTERED"] = "if.room.entered";
    IFEvents["ROOM_EXITED"] = "if.room.exited";
    IFEvents["ROOM_ILLUMINATED"] = "if.room.illuminated";
    IFEvents["ROOM_DARKENED"] = "if.room.darkened";
    IFEvents["LOCATION_ILLUMINATED"] = "if.location.illuminated";
    IFEvents["LOCATION_DARKENED"] = "if.location.darkened";
    // Character interaction events
    IFEvents["NPC_TALKED_TO"] = "if.npc.talked_to";
    IFEvents["NPC_ASKED_ABOUT"] = "if.npc.asked_about";
    IFEvents["NPC_TOLD_ABOUT"] = "if.npc.told_about";
    IFEvents["NPC_GIVEN_ITEM"] = "if.npc.given_item";
    IFEvents["NPC_SHOWN_ITEM"] = "if.npc.shown_item";
    IFEvents["NPC_ATTACKED"] = "if.npc.attacked";
    IFEvents["NPC_KISSED"] = "if.npc.kissed";
    IFEvents["NPC_DIED"] = "if.npc.died";
    // Discovery events
    IFEvents["SECRET_DISCOVERED"] = "if.discovery.secret";
    IFEvents["HIDDEN_ITEM_REVEALED"] = "if.discovery.hidden_item";
    IFEvents["NEW_EXIT_REVEALED"] = "if.discovery.new_exit";
    // Inventory events
    IFEvents["INVENTORY_CHECKED"] = "if.inventory.checked";
    IFEvents["INVENTORY_FULL"] = "if.inventory.full";
    IFEvents["ITEM_TOO_HEAVY"] = "if.inventory.too_heavy";
    // Time/turn events
    IFEvents["TURN_PASSED"] = "if.time.turn_passed";
    IFEvents["TIME_PASSED"] = "if.time.time_passed";
    IFEvents["WAITED"] = "if.time.waited";
    // Scene events
    IFEvents["SCENE_STARTED"] = "if.scene.started";
    IFEvents["SCENE_ENDED"] = "if.scene.ended";
    IFEvents["SCENE_CHANGED"] = "if.scene.changed";
    // Score/achievement events
    IFEvents["SCORE_INCREASED"] = "if.score.increased";
    IFEvents["ACHIEVEMENT_UNLOCKED"] = "if.achievement.unlocked";
    IFEvents["PUZZLE_SOLVED"] = "if.puzzle.solved";
    // Game state events
    IFEvents["GAME_STARTED"] = "if.game.started";
    IFEvents["GAME_ENDED"] = "if.game.ended";
    IFEvents["GAME_WON"] = "if.game.won";
    IFEvents["GAME_LOST"] = "if.game.lost";
    IFEvents["GAME_SAVED"] = "if.game.saved";
    IFEvents["GAME_RESTORED"] = "if.game.restored";
    IFEvents["GAME_RESTARTED"] = "if.game.restarted";
    // Parser/command events
    IFEvents["COMMAND_AMBIGUOUS"] = "if.command.ambiguous";
    IFEvents["COMMAND_INCOMPLETE"] = "if.command.incomplete";
    IFEvents["OBJECT_NOT_FOUND"] = "if.command.object_not_found";
    IFEvents["VERB_NOT_UNDERSTOOD"] = "if.command.verb_not_understood";
    // Custom messages
    IFEvents["CUSTOM_MESSAGE"] = "if.message.custom";
})(IFEvents || (IFEvents = {}));
/**
 * Event tags for categorization and filtering
 */
export var IFEventTag;
(function (IFEventTag) {
    // Visibility
    IFEventTag["VISIBLE"] = "visible";
    IFEventTag["HIDDEN"] = "hidden";
    IFEventTag["BACKGROUND"] = "background";
    // Priority
    IFEventTag["CRITICAL"] = "critical";
    IFEventTag["IMPORTANT"] = "important";
    IFEventTag["NORMAL"] = "normal";
    IFEventTag["MINOR"] = "minor";
    // Channels
    IFEventTag["MAIN"] = "main";
    IFEventTag["INVENTORY"] = "inventory";
    IFEventTag["LOCATION"] = "location";
    IFEventTag["STATUS"] = "status";
    IFEventTag["NPC_ACTIVITY"] = "npc-activity";
    IFEventTag["AMBIENT"] = "ambient";
    // Content type
    IFEventTag["NARRATIVE"] = "narrative";
    IFEventTag["MECHANICAL"] = "mechanical";
    IFEventTag["DIALOGUE"] = "dialogue";
    IFEventTag["DESCRIPTION"] = "description";
    IFEventTag["ERROR"] = "error";
    IFEventTag["WARNING"] = "warning";
    IFEventTag["INFO"] = "info";
    // Special flags
    IFEventTag["UNIQUE"] = "unique";
    IFEventTag["PERSISTENT"] = "persistent";
    IFEventTag["TRANSIENT"] = "transient";
    IFEventTag["QUEUED"] = "queued"; // Delayed output
})(IFEventTag || (IFEventTag = {}));
/**
 * Map events to their default tags
 */
export function getDefaultTagsForEvent(event) {
    // Define default tags for common events
    const defaultTags = {
        [IFEvents.ITEM_TAKEN]: [IFEventTag.MAIN, IFEventTag.VISIBLE],
        [IFEvents.ITEM_DROPPED]: [IFEventTag.MAIN, IFEventTag.VISIBLE],
        [IFEvents.PLAYER_MOVED]: [IFEventTag.LOCATION, IFEventTag.IMPORTANT],
        [IFEvents.ROOM_DESCRIBED]: [IFEventTag.LOCATION, IFEventTag.DESCRIPTION],
        [IFEvents.NPC_TALKED_TO]: [IFEventTag.MAIN, IFEventTag.DIALOGUE],
        [IFEvents.COMMAND_AMBIGUOUS]: [IFEventTag.MAIN, IFEventTag.ERROR],
        [IFEvents.INVENTORY_CHECKED]: [IFEventTag.INVENTORY, IFEventTag.MECHANICAL],
        [IFEvents.SECRET_DISCOVERED]: [IFEventTag.MAIN, IFEventTag.CRITICAL, IFEventTag.UNIQUE]
    };
    return defaultTags[event] || [IFEventTag.MAIN, IFEventTag.NORMAL];
}
//# sourceMappingURL=if-events.js.map