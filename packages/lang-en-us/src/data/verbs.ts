/**
 * @file English Verb Definitions
 * @description Verb mappings for English language
 */

/**
 * Standard Interactive Fiction action identifiers
 * These match the action IDs used in the IF system
 */
export const IFActions = {
  // Movement actions
  GOING: 'if.action.going',
  ENTERING: 'if.action.entering',
  EXITING: 'if.action.exiting',
  CLIMBING: 'if.action.climbing',
  
  // Observation actions
  LOOKING: 'if.action.looking',
  EXAMINING: 'if.action.examining',
  READING: 'if.action.reading',
  SEARCHING: 'if.action.searching',
  LISTENING: 'if.action.listening',
  SMELLING: 'if.action.smelling',
  TOUCHING: 'if.action.touching',
  
  // Object manipulation
  TAKING: 'if.action.taking',
  DROPPING: 'if.action.dropping',
  PUTTING: 'if.action.putting',
  INSERTING: 'if.action.inserting',
  OPENING: 'if.action.opening',
  CLOSING: 'if.action.closing',
  LOCKING: 'if.action.locking',
  UNLOCKING: 'if.action.unlocking',
  
  // Device actions
  SWITCHING_ON: 'if.action.switching_on',
  SWITCHING_OFF: 'if.action.switching_off',
  PUSHING: 'if.action.pushing',
  PULLING: 'if.action.pulling',
  TURNING: 'if.action.turning',
  USING: 'if.action.using',
  
  // Social actions
  GIVING: 'if.action.giving',
  SHOWING: 'if.action.showing',
  THROWING: 'if.action.throwing',
  ATTACKING: 'if.action.attacking',
  TALKING: 'if.action.talking',
  ASKING: 'if.action.asking',
  TELLING: 'if.action.telling',
  ANSWERING: 'if.action.answering',
  
  // Wearable actions
  WEARING: 'if.action.wearing',
  TAKING_OFF: 'if.action.taking_off',
  
  // Consumption actions
  EATING: 'if.action.eating',
  DRINKING: 'if.action.drinking',
  
  // Manipulation (capability dispatch, ADR-090)
  LOWERING: 'if.action.lowering',
  RAISING: 'if.action.raising',
  CUTTING: 'if.action.cutting',
  DIGGING: 'if.action.digging',
  REMOVING: 'if.action.removing',

  // Concealment (ADR-148)
  HIDING: 'if.action.hiding',
  REVEALING: 'if.action.revealing',

  // Meta actions
  INVENTORY: 'if.action.inventory',
  WAITING: 'if.action.waiting',
  SLEEPING: 'if.action.sleeping',
  SAVING: 'if.action.saving',
  RESTORING: 'if.action.restoring',
  RESTARTING: 'if.action.restarting',
  QUITTING: 'if.action.quitting',
  HELP: 'if.action.help',
  ABOUT: 'if.action.about',
  SCORING: 'if.action.scoring',
  AGAIN: 'if.action.again',
  UNDOING: 'if.action.undoing',
  VERSION: 'if.action.version',
  
  // Author/Debug actions
  TRACE: 'author.trace'
} as const;

export interface VerbDefinition {
  action: string;
  verbs: string[];
  requiresObject: boolean;
  allowsIndirectObject?: boolean;
}

/**
 * English verb definitions mapping verbs to IF actions
 */
export const englishVerbs: VerbDefinition[] = [
  // Movement
  {
    action: IFActions.GOING,
    // `move` removed (ADR-230 Phase 1 ruling): move is manipulation-only —
    // `move :target :direction` → pushing, `move :item to :dest` → putting.
    verbs: ['go', 'walk', 'run', 'head', 'travel'],
    requiresObject: true
  },
  {
    action: IFActions.ENTERING,
    verbs: ['enter', 'go in', 'go into'],
    requiresObject: true
  },
  {
    action: IFActions.EXITING,
    verbs: ['exit', 'leave', 'go out', 'get out'],
    requiresObject: false
  },
  {
    action: IFActions.CLIMBING,
    verbs: ['climb', 'scale', 'ascend'],
    requiresObject: true
  },
  
  // Observation
  {
    action: IFActions.LOOKING,
    verbs: ['look', 'l'],
    requiresObject: false
  },
  {
    action: IFActions.EXAMINING,
    verbs: ['examine', 'x', 'inspect', 'check', 'view', 'observe', 'look at'],
    requiresObject: true
  },
  {
    action: IFActions.READING,
    verbs: ['read', 'peruse', 'study'],
    requiresObject: true
  },
  {
    action: IFActions.SEARCHING,
    // find/locate removed (ADR-230 Phase 1 ruling): searching is the wrong
    // semantics for them; a "recall/remind me of" meta action is parked in
    // docs/work/grammar-reachability/pins.md as a future design.
    verbs: ['search'],
    requiresObject: true
  },
  {
    action: IFActions.LISTENING,
    verbs: ['listen', 'hear'],
    requiresObject: false
  },
  {
    action: IFActions.SMELLING,
    verbs: ['smell', 'sniff'],
    requiresObject: false
  },
  {
    action: IFActions.TOUCHING,
    verbs: ['touch', 'feel'],
    requiresObject: true
  },
  
  // Manipulation
  {
    action: IFActions.TAKING,
    verbs: ['take', 'get', 'pick', 'grab', 'acquire', 'pick up', 'take up'],
    requiresObject: true
  },
  {
    action: IFActions.DROPPING,
    verbs: ['drop', 'put down', 'discard', 'throw away'],
    requiresObject: true
  },
  {
    action: IFActions.PUTTING,
    verbs: ['put', 'place', 'put in', 'put on'],
    requiresObject: true,
    allowsIndirectObject: true
  },
  {
    action: IFActions.INSERTING,
    verbs: ['insert', 'insert into'],
    requiresObject: true,
    allowsIndirectObject: true
  },
  {
    action: IFActions.OPENING,
    verbs: ['open', 'unwrap', 'uncover'],
    requiresObject: true
  },
  {
    action: IFActions.CLOSING,
    verbs: ['close', 'shut', 'cover'],
    requiresObject: true
  },
  {
    action: IFActions.LOCKING,
    verbs: ['lock', 'secure'],
    requiresObject: true
  },
  {
    action: IFActions.UNLOCKING,
    verbs: ['unlock', 'unsecure'],
    requiresObject: true
  },
  {
    action: IFActions.SWITCHING_ON,
    verbs: ['switch on', 'turn on', 'activate', 'start'],
    requiresObject: true
  },
  {
    action: IFActions.SWITCHING_OFF,
    verbs: ['switch off', 'turn off', 'deactivate', 'stop'],
    requiresObject: true
  },
  {
    action: IFActions.PUSHING,
    verbs: ['push', 'press', 'shove'],
    requiresObject: true
  },
  {
    action: IFActions.PULLING,
    verbs: ['pull', 'tug', 'drag'],
    requiresObject: true
  },
  {
    action: IFActions.TURNING,
    verbs: ['turn', 'rotate', 'twist'],
    requiresObject: true
  },
  // USING entry removed (ADR-230 Phase 6 sketch ruling 2): a generic USE
  // has no semantics — better absent than advertised. Constant retained
  // for reference only.
  {
    action: IFActions.GIVING,
    verbs: ['give', 'hand', 'offer'],
    requiresObject: true,
    allowsIndirectObject: true
  },
  {
    action: IFActions.SHOWING,
    verbs: ['show', 'display', 'present'],
    requiresObject: true,
    allowsIndirectObject: true
  },
  {
    action: IFActions.THROWING,
    verbs: ['throw', 'toss', 'hurl'],
    requiresObject: true,
    allowsIndirectObject: true
  },
  {
    action: IFActions.ATTACKING,
    verbs: ['attack', 'hit', 'strike', 'fight', 'kill'],
    requiresObject: true
  },
  {
    action: IFActions.WEARING,
    verbs: ['wear', 'put on', 'don', 'equip'],
    requiresObject: true
  },
  {
    action: IFActions.TAKING_OFF,
    verbs: ['remove', 'take off', 'doff', 'unequip'],
    requiresObject: true
  },
  {
    action: IFActions.EATING,
    verbs: ['eat', 'consume', 'devour'],
    requiresObject: true
  },
  {
    action: IFActions.DRINKING,
    verbs: ['drink', 'sip', 'swallow', 'quaff'],
    requiresObject: true
  },
  
  // Communication
  {
    action: IFActions.TALKING,
    verbs: ['talk', 'speak', 'converse', 'chat', 'talk to'],
    requiresObject: true
  },
  {
    action: IFActions.ASKING,
    verbs: ['ask', 'inquire', 'question'],
    requiresObject: true,
    allowsIndirectObject: true
  },
  {
    action: IFActions.TELLING,
    // `say` removed (ADR-230 Phase 6): saying's grammar left with the
    // conversation-family ruling, and say was never a telling synonym —
    // stories provide SAY as a story verb (e.g. dungeo).
    verbs: ['tell', 'inform'],
    requiresObject: true,
    allowsIndirectObject: true
  },
  // ANSWERING entry removed (ADR-230 Phase 6 sketch ruling 3): no question
  // system to answer into; revisit with the conversation system.
  
  // Meta commands
  {
    action: IFActions.INVENTORY,
    verbs: ['inventory', 'i', 'inv'],
    requiresObject: false
  },
  {
    action: IFActions.WAITING,
    verbs: ['wait', 'z'],
    requiresObject: false
  },
  {
    action: IFActions.SLEEPING,
    verbs: ['sleep', 'nap', 'doze', 'rest', 'slumber'],
    requiresObject: false
  },
  {
    action: IFActions.SAVING,
    verbs: ['save', 'save game'],
    requiresObject: false
  },
  {
    action: IFActions.RESTORING,
    verbs: ['restore', 'load', 'load game', 'restore game'],
    requiresObject: false
  },
  {
    // Added platform-issue-sweep Phase 6. NOTE: vocabulary is not what makes
    // grammar literals parse (`restart` parsed without it) — entries here
    // feed verb CLASSIFICATION: comma-chained command splitting and word
    // lookup. The grammar-vocabulary-sync test (parser-en-us) keeps every
    // grammar action id represented here.
    action: IFActions.RESTARTING,
    // 'restart' only — the reverse gate (stdlib lifecycle-registry test)
    // requires every verb phrase here to lead a core grammar pattern, and
    // the grammar defines the bare form only (unlike save/restore, whose
    // `<verb> game` forms have their own patterns).
    verbs: ['restart'],
    requiresObject: false
  },
  {
    action: IFActions.AGAIN,
    verbs: ['again', 'g'],
    requiresObject: false
  },
  {
    action: IFActions.UNDOING,
    verbs: ['undo'],
    requiresObject: false
  },
  {
    action: IFActions.VERSION,
    verbs: ['version'],
    requiresObject: false
  },
  // Manipulation verbs (capability dispatch / tools) — mirror the core
  // grammar's verb sets (grammar-vocabulary-sync test enforces presence)
  {
    action: IFActions.LOWERING,
    verbs: ['lower'],
    requiresObject: true
  },
  {
    action: IFActions.RAISING,
    verbs: ['raise', 'lift'],
    requiresObject: true
  },
  {
    action: IFActions.CUTTING,
    verbs: ['cut', 'slice', 'chop'],
    requiresObject: true
  },
  {
    action: IFActions.DIGGING,
    verbs: ['dig'],
    requiresObject: true
  },
  {
    action: IFActions.REMOVING,
    verbs: ['remove', 'extract'],
    requiresObject: true,
    allowsIndirectObject: true
  },
  // Concealment (ADR-148) — hide/duck/crouch are phrasal in the grammar
  // (hide behind :target); the bare verbs here serve classification
  {
    action: IFActions.HIDING,
    verbs: ['hide', 'duck', 'crouch'],
    requiresObject: true
  },
  {
    action: IFActions.REVEALING,
    verbs: ['unhide', 'stand up', 'come out', 'stop hiding'],
    requiresObject: false
  },
  {
    action: IFActions.QUITTING,
    verbs: ['quit', 'q', 'exit game'],
    requiresObject: false
  },
  {
    action: IFActions.HELP,
    verbs: ['help', '?', 'commands'],
    requiresObject: false
  },
  {
    action: IFActions.ABOUT,
    verbs: ['about', 'info', 'credits'],
    requiresObject: false
  },
  {
    action: IFActions.SCORING,
    verbs: ['score', 'points'],
    requiresObject: false
  },
  
  // Author/Debug commands
  {
    action: IFActions.TRACE,
    verbs: ['trace'],
    requiresObject: false  // "trace" or "trace [target] on/off"
  }
];
