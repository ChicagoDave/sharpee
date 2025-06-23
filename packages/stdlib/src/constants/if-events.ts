// packages/stdlib/src/constants/if-events.ts

/**
 * Standard Interactive Fiction events
 * These are emitted when things happen in the game world
 */
export enum IFEvents {
  // Action lifecycle events
  ACTION_STARTED = 'if.action.started',
  ACTION_VALIDATED = 'if.action.validated',
  ACTION_PREVENTED = 'if.action.prevented',
  ACTION_EXECUTED = 'if.action.executed',
  ACTION_COMPLETED = 'if.action.completed',
  ACTION_FAILED = 'if.action.failed',
  BATCH_ACTION_COMPLETE = 'if.action.batch_complete',
  
  // Item manipulation events
  ITEM_TAKEN = 'if.item.taken',
  ITEM_DROPPED = 'if.item.dropped',
  ITEM_MOVED = 'if.item.moved',
  ITEM_THROWN = 'if.item.thrown',
  ITEM_GIVEN = 'if.item.given',
  ITEM_SHOWN = 'if.item.shown',
  ITEM_EXAMINED = 'if.item.examined',
  ITEM_DESTROYED = 'if.item.destroyed',
  ITEM_USED = 'if.item.used',
  
  // General open/close events (for any openable)
  OPENED = 'if.opened',
  CLOSED = 'if.closed',
  TAKEN = 'if.taken',
  DROPPED = 'if.dropped',
  
  // Container events
  CONTAINER_OPENED = 'if.container.opened',
  CONTAINER_CLOSED = 'if.container.closed',
  CONTAINER_LOCKED = 'if.container.locked',
  CONTAINER_UNLOCKED = 'if.container.unlocked',
  ITEM_PUT_IN = 'if.container.item_put_in',
  ITEM_PUT_ON = 'if.supporter.item_put_on',
  ITEM_REMOVED_FROM = 'if.container.item_removed_from',
  CONTAINER_EMPTIED = 'if.container.emptied',
  
  // Door events
  DOOR_OPENED = 'if.door.opened',
  DOOR_CLOSED = 'if.door.closed',
  DOOR_LOCKED = 'if.door.locked',
  DOOR_UNLOCKED = 'if.door.unlocked',
  DOOR_KNOCKED = 'if.door.knocked',
  
  // Wearable events
  ITEM_WORN = 'if.wearable.worn',
  ITEM_REMOVED = 'if.wearable.removed',
  
  // Device events
  DEVICE_SWITCHED_ON = 'if.device.switched_on',
  DEVICE_SWITCHED_OFF = 'if.device.switched_off',
  DEVICE_ACTIVATED = 'if.device.activated',
  DEVICE_DEACTIVATED = 'if.device.deactivated',
  DEVICE_USED = 'if.device.used',
  DEVICE_BROKEN = 'if.device.broken',
  DEVICE_FIXED = 'if.device.fixed',
  
  // Consumption events
  ITEM_EATEN = 'if.consumable.eaten',
  ITEM_DRUNK = 'if.consumable.drunk',
  
  // Movement events
  PLAYER_MOVED = 'if.movement.player_moved',
  PLAYER_ENTERED = 'if.movement.player_entered',
  PLAYER_EXITED = 'if.movement.player_exited',
  NPC_MOVED = 'if.movement.npc_moved',
  NPC_ENTERED = 'if.movement.npc_entered',
  NPC_EXITED = 'if.movement.npc_exited',
  MOVEMENT_BLOCKED = 'if.movement.blocked',
  
  // Exit/Entry events (for new traits)
  MOVED = 'if.exit.moved',  // Generic movement through exit
  ENTERED = 'if.entry.entered',  // Entered an enterable object
  EXITED = 'if.entry.exited',  // Exited an enterable object
  EVACUATED = 'if.entry.evacuated',  // Forced exit from enterable
  
  // Reading events
  READ = 'if.readable.read',
  PAGE_TURNED = 'if.readable.page_turned',
  
  // Light source events
  LIGHT_CHANGED = 'if.light.changed',
  FUEL_DEPLETED = 'if.light.fuel_depleted',
  FUEL_LOW = 'if.light.fuel_low',
  REFUELED = 'if.light.refueled',
  
  // Room/location events
  ROOM_DESCRIBED = 'if.room.described',
  ROOM_FIRST_ENTERED = 'if.room.first_entered',
  ROOM_ENTERED = 'if.room.entered',
  ROOM_EXITED = 'if.room.exited',
  ROOM_ILLUMINATED = 'if.room.illuminated',
  ROOM_DARKENED = 'if.room.darkened',
  LOCATION_ILLUMINATED = 'if.location.illuminated',
  LOCATION_DARKENED = 'if.location.darkened',
  
  // Character interaction events
  NPC_TALKED_TO = 'if.npc.talked_to',
  NPC_ASKED_ABOUT = 'if.npc.asked_about',
  NPC_TOLD_ABOUT = 'if.npc.told_about',
  NPC_GIVEN_ITEM = 'if.npc.given_item',
  NPC_SHOWN_ITEM = 'if.npc.shown_item',
  NPC_ATTACKED = 'if.npc.attacked',
  NPC_KISSED = 'if.npc.kissed',
  NPC_DIED = 'if.npc.died',
  
  // Discovery events
  SECRET_DISCOVERED = 'if.discovery.secret',
  HIDDEN_ITEM_REVEALED = 'if.discovery.hidden_item',
  NEW_EXIT_REVEALED = 'if.discovery.new_exit',
  
  // Inventory events
  INVENTORY_CHECKED = 'if.inventory.checked',
  INVENTORY_FULL = 'if.inventory.full',
  ITEM_TOO_HEAVY = 'if.inventory.too_heavy',
  
  // Time/turn events
  TURN_PASSED = 'if.time.turn_passed',
  TIME_PASSED = 'if.time.time_passed',
  WAITED = 'if.time.waited',
  
  // Scene events
  SCENE_STARTED = 'if.scene.started',
  SCENE_ENDED = 'if.scene.ended',
  SCENE_CHANGED = 'if.scene.changed',
  
  // Score/achievement events
  SCORE_INCREASED = 'if.score.increased',
  ACHIEVEMENT_UNLOCKED = 'if.achievement.unlocked',
  PUZZLE_SOLVED = 'if.puzzle.solved',
  
  // Game state events
  GAME_STARTED = 'if.game.started',
  GAME_ENDED = 'if.game.ended',
  GAME_WON = 'if.game.won',
  GAME_LOST = 'if.game.lost',
  GAME_SAVED = 'if.game.saved',
  GAME_RESTORED = 'if.game.restored',
  GAME_RESTARTED = 'if.game.restarted',
  
  // Parser/command events
  COMMAND_AMBIGUOUS = 'if.command.ambiguous',
  COMMAND_INCOMPLETE = 'if.command.incomplete',
  OBJECT_NOT_FOUND = 'if.command.object_not_found',
  VERB_NOT_UNDERSTOOD = 'if.command.verb_not_understood',
  
  // Custom messages
  CUSTOM_MESSAGE = 'if.message.custom'
}

/**
 * Event tags for categorization and filtering
 */
export enum IFEventTag {
  // Visibility
  VISIBLE = 'visible',
  HIDDEN = 'hidden',
  BACKGROUND = 'background',
  
  // Priority
  CRITICAL = 'critical',
  IMPORTANT = 'important',
  NORMAL = 'normal',
  MINOR = 'minor',
  
  // Channels
  MAIN = 'main',
  INVENTORY = 'inventory',
  LOCATION = 'location',
  STATUS = 'status',
  NPC_ACTIVITY = 'npc-activity',
  AMBIENT = 'ambient',
  
  // Content type
  NARRATIVE = 'narrative',
  MECHANICAL = 'mechanical',
  DIALOGUE = 'dialogue',
  DESCRIPTION = 'description',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  
  // Special flags
  UNIQUE = 'unique',           // Only show once
  PERSISTENT = 'persistent',   // Survives across turns
  TRANSIENT = 'transient',     // Disappears quickly
  QUEUED = 'queued'           // Delayed output
}

/**
 * Map events to their default tags
 */
export function getDefaultTagsForEvent(event: IFEvents): IFEventTag[] {
  // Define default tags for common events
  const defaultTags: Partial<Record<IFEvents, IFEventTag[]>> = {
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
