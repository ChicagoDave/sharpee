// packages/core/src/events/standard-events.ts

/**
 * Standard event types used in the system
 */
export enum StandardEventTypes {
    // Command events
    COMMAND_EXECUTED = 'command:executed',
    COMMAND_FAILED = 'command:failed',
    COMMAND_NOT_UNDERSTOOD = 'command:notUnderstood',
    COMMAND_VALIDATION_FAILED = 'command:validationFailed',
    COMMAND_EXECUTION_ERROR = 'command:executionError',
    
    // Movement events
    PLAYER_MOVED = 'player:moved',
    ENTITY_MOVED = 'entity:moved',
    
    // Interaction events
    ITEM_TAKEN = 'item:taken',
    ITEM_DROPPED = 'item:dropped',
    ITEM_EXAMINED = 'item:examined',
    CONTAINER_OPENED = 'container:opened',
    CONTAINER_CLOSED = 'container:closed',
    DOOR_OPENED = 'door:opened',
    DOOR_CLOSED = 'door:closed',
    
    // State change events
    ENTITY_STATE_CHANGED = 'entity:stateChanged',
    RELATIONSHIP_CREATED = 'relationship:created',
    RELATIONSHIP_REMOVED = 'relationship:removed',
    
    // Discovery events
    LOCATION_DISCOVERED = 'location:discovered',
    ITEM_DISCOVERED = 'item:discovered',
    SECRET_DISCOVERED = 'secret:discovered',
    
    // Game events
    GAME_STARTED = 'game:started',
    GAME_ENDED = 'game:ended',
    GAME_SAVED = 'game:saved',
    GAME_LOADED = 'game:loaded',
    TURN_ADVANCED = 'turn:advanced',
    
    // Narrative events
    NARRATIVE_EVENT = 'narrative:event',
    DIALOGUE_STARTED = 'dialogue:started',
    DIALOGUE_ENDED = 'dialogue:ended',
    QUEST_STARTED = 'quest:started',
    QUEST_UPDATED = 'quest:updated',
    QUEST_COMPLETED = 'quest:completed',
    
    // System events
    SYSTEM_ERROR = 'system:error',
    SYSTEM_WARNING = 'system:warning',
    SYSTEM_INFO = 'system:info',
  
    // Ability-related events (for Reflections)
    MIRROR_CONNECTED = 'mirror:connected',
    MIRROR_TRAVERSED = 'mirror:traversed',
    ABILITY_ACTIVATED = 'ability:activated',
    ABILITY_FAILED = 'ability:failed'
  }
  
  /**
   * Standard event tags used in the system
   */
  export enum StandardEventTags {
    // Visibility tags
    VISIBLE = 'visible',
    HIDDEN = 'hidden',
    
    // Importance tags
    IMPORTANT = 'important',
    CRITICAL = 'critical',
    MINOR = 'minor',
    
    // Content tags
    COMBAT = 'combat',
    PUZZLE = 'puzzle',
    DIALOGUE = 'dialogue',
    NARRATIVE = 'narrative',
    DISCOVERY = 'discovery',
    ACHIEVEMENT = 'achievement',
    
    // Special tags
    PERSISTENT = 'persistent',
    TRANSIENT = 'transient',
    
    // Mirror ability tags (for Reflections)
    MIRROR_ABILITY = 'mirror-ability',
    EARTH_ABILITY = 'earth-ability',
    MOON_ABILITY = 'moon-ability',
    LIGHT_ABILITY = 'light-ability'
  }
  
  /**
   * Event category groupings
   */
  export const EventCategories = {
    COMMAND: [
      StandardEventTypes.COMMAND_EXECUTED,
      StandardEventTypes.COMMAND_FAILED,
      StandardEventTypes.COMMAND_NOT_UNDERSTOOD,
      StandardEventTypes.COMMAND_VALIDATION_FAILED,
      StandardEventTypes.COMMAND_EXECUTION_ERROR,
    ],
    MOVEMENT: [
      StandardEventTypes.PLAYER_MOVED,
      StandardEventTypes.ENTITY_MOVED,
    ],
    INTERACTION: [
      StandardEventTypes.ITEM_TAKEN,
      StandardEventTypes.ITEM_DROPPED,
      StandardEventTypes.ITEM_EXAMINED,
      StandardEventTypes.CONTAINER_OPENED,
      StandardEventTypes.CONTAINER_CLOSED,
      StandardEventTypes.DOOR_OPENED,
      StandardEventTypes.DOOR_CLOSED,
    ],
    STATE_CHANGE: [
      StandardEventTypes.ENTITY_STATE_CHANGED,
      StandardEventTypes.RELATIONSHIP_CREATED,
      StandardEventTypes.RELATIONSHIP_REMOVED,
    ],
    DISCOVERY: [
      StandardEventTypes.LOCATION_DISCOVERED,
      StandardEventTypes.ITEM_DISCOVERED,
      StandardEventTypes.SECRET_DISCOVERED,
    ],
    GAME: [
      StandardEventTypes.GAME_STARTED,
      StandardEventTypes.GAME_ENDED,
      StandardEventTypes.GAME_SAVED,
      StandardEventTypes.GAME_LOADED,
      StandardEventTypes.TURN_ADVANCED,
    ],
    NARRATIVE: [
      StandardEventTypes.NARRATIVE_EVENT,
      StandardEventTypes.DIALOGUE_STARTED,
      StandardEventTypes.DIALOGUE_ENDED,
      StandardEventTypes.QUEST_STARTED,
      StandardEventTypes.QUEST_UPDATED,
      StandardEventTypes.QUEST_COMPLETED,
    ],
    SYSTEM: [
      StandardEventTypes.SYSTEM_ERROR,
      StandardEventTypes.SYSTEM_WARNING,
      StandardEventTypes.SYSTEM_INFO,
    ],
    ABILITIES: [
      StandardEventTypes.MIRROR_CONNECTED,
      StandardEventTypes.MIRROR_TRAVERSED,
      StandardEventTypes.ABILITY_ACTIVATED,
      StandardEventTypes.ABILITY_FAILED,
    ]
  };