/**
 * @file English Grammar Rules
 * @description Standard grammar patterns for English interactive fiction
 *
 * Rule Priority Guidelines:
 * - 100+: Semantic rules with trait constraints (e.g., .hasTrait(TraitType.ENTERABLE))
 * - 100: Standard patterns
 * - 95: Synonyms/alternatives
 * - 90: Abbreviations
 *
 * Semantic rules should come first to match before fallback patterns.
 */

import { GrammarBuilder } from '@sharpee/if-domain';
import { TraitType } from '@sharpee/world-model';

/**
 * Define English grammar rules
 * @param grammar The grammar builder to use
 */
export function defineGrammar(grammar: GrammarBuilder): void {
  // Looking (ADR-087: using forAction)
  grammar
    .forAction('if.action.looking')
    .verbs(['look', 'l'])
    .build();

  // Examining (ADR-087: using forAction)
  // Scope handled by action validation - tries see/feel/hear/smell cascade
  grammar
    .forAction('if.action.examining')
    .verbs(['examine', 'x', 'inspect'])
    .pattern(':target')
    .build();

  // "look at" is a phrasal pattern - different structure
  grammar
    .define('look at :target')
    .mapsTo('if.action.examining')
    .withPriority(95)
    .build();

  // Looking with optional adverbs
  grammar
    .define('look [carefully] at :target')
    .mapsTo('if.action.examining_carefully')
    .withPriority(96)
    .build(); // Slightly higher priority, but confidence penalty for skipped optionals

  grammar
    .define('look [around]')
    .mapsTo('if.action.looking')
    .withPriority(101)
    .build();

  grammar
    .define('search [carefully]')
    .mapsTo('if.action.searching')
    .withPriority(100)
    .build();

  // Searching with target
  grammar
    .define('search :target')
    .mapsTo('if.action.searching')
    .withPriority(100)
    .build();

  grammar
    .define('look in|inside :target')
    .mapsTo('if.action.searching')
    .withPriority(100)
    .build();

  grammar
    .define('look through :target')
    .mapsTo('if.action.searching')
    .withPriority(100)
    .build();

  grammar
    .define('rummage in|through :target')
    .mapsTo('if.action.searching')
    .withPriority(95)
    .build();

  // Taking and dropping (ADR-087: using forAction)
  // Scope handled by action validation; SceneryTrait blocks non-portable items
  grammar
    .forAction('if.action.taking')
    .verbs(['take', 'get', 'grab'])
    .pattern(':item')
    .build();

  // "pick up" is a phrasal verb - different pattern structure
  grammar
    .define('pick up :item')
    .mapsTo('if.action.taking')
    .withPriority(100)
    .build();

  // Scope (carried) handled by action validation
  grammar
    .forAction('if.action.dropping')
    .verbs(['drop', 'discard'])
    .pattern(':item')
    .build();

  // "put down" is a phrasal verb - different pattern structure
  grammar
    .define('put down :item')
    .mapsTo('if.action.dropping')
    .withPriority(100)
    .build();

  // ADR-080 Phase 2: Multi-object commands
  // Note: The parser detects "all" and "X and Y" patterns automatically in entity slots.
  // No special grammar patterns needed - existing patterns work because:
  // - "take all" matches "take :item", consumeEntitySlot detects "all" keyword
  // - "take knife and lamp" matches "take :item", parser creates list
  // - "take all but sword" matches "take :item", parser detects exclusion

  // Container operations
  // Scope handled by action validation; traits declare semantic constraints only
  grammar
    .define('put :item in|into|inside :container')
    .hasTrait('container', TraitType.CONTAINER)
    .mapsTo('if.action.inserting')
    .withPriority(100)
    .build();

  grammar
    .define('insert :item in|into :container')
    .hasTrait('container', TraitType.CONTAINER)
    .mapsTo('if.action.inserting')
    .withPriority(100)
    .build();

  // Supporter operations (including hanging!)
  grammar
    .define('put :item on|onto :supporter')
    .hasTrait('supporter', TraitType.SUPPORTER)
    .mapsTo('if.action.putting')
    .withPriority(100)
    .build();

  grammar
    .define('hang :item on :hook')
    .mapsTo('if.action.putting')
    .withPriority(110)
    .build(); // Higher priority than generic put

  // Reading (ADR-087: using forAction)
  grammar
    .forAction('if.action.reading')
    .verbs(['read', 'peruse', 'study'])
    .pattern(':target')
    .build();

  // Inventory (ADR-087: using forAction)
  grammar
    .forAction('if.action.inventory')
    .verbs(['inventory', 'inv', 'i'])
    .build();

  // Movement (ADR-087: using forAction with directions)
  grammar
    .define('go :direction')
    .where('direction', { type: 'direction' })
    .mapsTo('if.action.going')
    .withPriority(100)
    .build();

  // Bare direction commands (ADR-087: consolidated with forAction)
  grammar
    .forAction('if.action.going')
    .directions({
      'north': ['north', 'n'],
      'south': ['south', 's'],
      'east': ['east', 'e'],
      'west': ['west', 'w'],
      'northeast': ['northeast', 'ne'],
      'northwest': ['northwest', 'nw'],
      'southeast': ['southeast', 'se'],
      'southwest': ['southwest', 'sw'],
      'up': ['up', 'u'],
      'down': ['down', 'd'],
      'in': ['in'],
      'out': ['out']
    })
    .build();

  // Opening and closing
  // Scope handled by action validation; traits declare semantic constraints only
  grammar
    .define('open :door')
    .hasTrait('door', TraitType.OPENABLE)
    .mapsTo('if.action.opening')
    .withPriority(100)
    .build();

  grammar
    .define('close :door')
    .hasTrait('door', TraitType.OPENABLE)
    .mapsTo('if.action.closing')
    .withPriority(100)
    .build();

  // Switching on/off (ADR-087: using forAction)
  grammar
    .forAction('if.action.switching_on')
    .verbs(['turn', 'switch', 'flip'])
    .pattern('on :device')
    .hasTrait('device', TraitType.SWITCHABLE)
    .build();

  grammar
    .forAction('if.action.switching_off')
    .verbs(['turn', 'switch', 'flip'])
    .pattern('off :device')
    .hasTrait('device', TraitType.SWITCHABLE)
    .build();

  // Alternative phrasal verb order: "turn lamp on" / "turn lamp off"
  grammar
    .define('turn :device on')
    .hasTrait('device', TraitType.SWITCHABLE)
    .mapsTo('if.action.switching_on')
    .build();

  grammar
    .define('turn :device off')
    .hasTrait('device', TraitType.SWITCHABLE)
    .mapsTo('if.action.switching_off')
    .build();

  // Pushing and pulling (ADR-087: using forAction)
  // Scope handled by action validation
  grammar
    .forAction('if.action.pushing')
    .verbs(['push', 'press', 'shove', 'move'])
    .pattern(':target')
    .build();

  grammar
    .forAction('if.action.pulling')
    .verbs(['pull', 'drag', 'yank'])
    .pattern(':target')
    .build();

  // Lowering and raising (ADR-090: capability dispatch)
  grammar
    .forAction('if.action.lowering')
    .verbs(['lower'])
    .pattern(':target')
    .build();

  grammar
    .forAction('if.action.raising')
    .verbs(['raise', 'lift'])
    .pattern(':target')
    .build();

  // Waiting (ADR-087: using forAction)
  grammar
    .forAction('if.action.waiting')
    .verbs(['wait', 'z'])
    .build();

  // Meta commands
  grammar
    .define('save')
    .mapsTo('if.action.saving')
    .withPriority(100)
    .build();

  grammar
    .define('restore')
    .mapsTo('if.action.restoring')
    .withPriority(100)
    .build();

  grammar
    .define('restart')
    .mapsTo('if.action.restarting')
    .withPriority(100)
    .build();

  // Quitting (ADR-087: using forAction)
  grammar
    .forAction('if.action.quitting')
    .verbs(['quit', 'q'])
    .build();

  grammar
    .define('undo')
    .mapsTo('if.action.undoing')
    .withPriority(100)
    .build();

  // Score and version
  grammar
    .define('score')
    .mapsTo('if.action.score')
    .withPriority(100)
    .build();

  grammar
    .define('version')
    .mapsTo('if.action.version')
    .withPriority(100)
    .build();

  // Help
  grammar
    .define('help')
    .mapsTo('if.action.help')
    .withPriority(100)
    .build();

  // Author/debug commands
  // Trace command - enables/disables tracing
  grammar
    .define('trace')
    .mapsTo('author.trace')
    .withPriority(100)
    .build();

  grammar
    .define('trace on')
    .mapsTo('author.trace')
    .withPriority(100)
    .build();

  grammar
    .define('trace off')
    .mapsTo('author.trace')
    .withPriority(100)
    .build();

  grammar
    .define('trace parser on')
    .mapsTo('author.trace')
    .withPriority(100)
    .build();

  grammar
    .define('trace parser off')
    .mapsTo('author.trace')
    .withPriority(100)
    .build();

  grammar
    .define('trace validation on')
    .mapsTo('author.trace')
    .withPriority(100)
    .build();

  grammar
    .define('trace validation off')
    .mapsTo('author.trace')
    .withPriority(100)
    .build();

  grammar
    .define('trace system on')
    .mapsTo('author.trace')
    .withPriority(100)
    .build();

  grammar
    .define('trace system off')
    .mapsTo('author.trace')
    .withPriority(100)
    .build();

  grammar
    .define('trace all on')
    .mapsTo('author.trace')
    .withPriority(100)
    .build();

  grammar
    .define('trace all off')
    .mapsTo('author.trace')
    .withPriority(100)
    .build();

  // VERB_NOUN_NOUN patterns (Phase 2)
  // Scope handled by action validation; traits declare semantic constraints only

  // Giving
  grammar
    .define('give :item to :recipient')
    .hasTrait('recipient', TraitType.ACTOR)
    .mapsTo('if.action.giving')
    .withPriority(100)
    .build();

  grammar
    .define('give :recipient :item')
    .hasTrait('recipient', TraitType.ACTOR)
    .mapsTo('if.action.giving')
    .withPriority(95)
    .build(); // Slightly lower priority than explicit "to"

  grammar
    .define('offer :item to :recipient')
    .hasTrait('recipient', TraitType.ACTOR)
    .mapsTo('if.action.giving')
    .withPriority(100)
    .build();

  // Showing
  grammar
    .define('show :item to :recipient')
    .hasTrait('recipient', TraitType.ACTOR)
    .mapsTo('if.action.showing')
    .withPriority(100)
    .build();

  grammar
    .define('show :recipient :item')
    .hasTrait('recipient', TraitType.ACTOR)
    .mapsTo('if.action.showing')
    .withPriority(95)
    .build();

  // Throwing
  grammar
    .define('throw :item at :target')
    .mapsTo('if.action.throwing')
    .withPriority(100)
    .build();

  grammar
    .define('throw :item to :recipient')
    .mapsTo('if.action.throwing')
    .withPriority(100)
    .build();

  // Multiple preposition patterns (Phase 2.1)
  // Scope handled by action validation; state checks (locked, open) in action validate()

  // Taking from container with tool
  grammar
    .define('take :item from :container with :tool')
    .mapsTo('if.action.taking_with')
    .withPriority(110)
    .build(); // Higher priority than simple take

  // Unlocking with key
  grammar
    .define('unlock :door with :key')
    .mapsTo('if.action.unlocking')
    .withPriority(110)
    .build(); // Higher priority than simple unlock

  // Opening with tool
  grammar
    .define('open :container with :tool')
    .hasTrait('container', TraitType.OPENABLE)
    .mapsTo('if.action.opening_with')
    .withPriority(110)
    .build(); // Higher priority than simple open

  // Cutting with tool
  grammar
    .define('cut :object with :tool')
    .mapsTo('if.action.cutting')
    .withPriority(110)
    .build(); // Higher priority than simple cut

  // Attacking with weapon
  grammar
    .define('attack :target with :weapon')
    .mapsTo('if.action.attacking')
    .withPriority(110)
    .build(); // Higher priority than simple attack

  // Digging with tool
  grammar
    .define('dig :location with :tool')
    .mapsTo('if.action.digging')
    .withPriority(110)
    .build(); // Higher priority than simple dig

  // Communication patterns with quoted strings
  // Scope handled by action validation; traits declare semantic constraints only
  grammar
    .define('say :message')
    .mapsTo('if.action.saying')
    .withPriority(100)
    .build();

  grammar
    .define('say :message to :recipient')
    .hasTrait('recipient', TraitType.ACTOR)
    .mapsTo('if.action.saying_to')
    .withPriority(105)
    .build();

  grammar
    .define('write :message')
    .mapsTo('if.action.writing')
    .withPriority(100)
    .build();

  grammar
    .define('write :message on :surface')
    .mapsTo('if.action.writing_on')
    .withPriority(105)
    .build();

  grammar
    .define('shout :message')
    .mapsTo('if.action.shouting')
    .withPriority(100)
    .build();

  grammar
    .define('whisper :message to :recipient')
    .hasTrait('recipient', TraitType.ACTOR)
    .mapsTo('if.action.whispering')
    .withPriority(100)
    .build();

  grammar
    .define('tell :recipient about :topic')
    .hasTrait('recipient', TraitType.ACTOR)
    .mapsTo('if.action.telling')
    .withPriority(100)
    .build();

  grammar
    .define('ask :recipient about :topic')
    .hasTrait('recipient', TraitType.ACTOR)
    .mapsTo('if.action.asking')
    .withPriority(100)
    .build();

  // Touching/sensory actions (ADR-087: using forAction)
  // Scope handled by action validation
  grammar
    .forAction('if.action.touching')
    .verbs(['touch', 'rub', 'feel', 'pat', 'stroke', 'poke', 'prod'])
    .pattern(':target')
    .build();

  // ============================================================================
  // ENTERING AND EXITING
  // Scope handled by action validation; traits declare semantic constraints only
  // ============================================================================

  // Semantic: enter specific enterable thing (priority 100)
  grammar
    .define('enter :portal')
    .hasTrait('portal', TraitType.ENTERABLE)
    .mapsTo('if.action.entering')
    .withPriority(100)
    .build();

  grammar
    .define('get in :portal')
    .hasTrait('portal', TraitType.ENTERABLE)
    .mapsTo('if.action.entering')
    .withPriority(100)
    .build();

  grammar
    .define('get into :portal')
    .hasTrait('portal', TraitType.ENTERABLE)
    .mapsTo('if.action.entering')
    .withPriority(100)
    .build();

  grammar
    .define('climb in :portal')
    .hasTrait('portal', TraitType.ENTERABLE)
    .mapsTo('if.action.entering')
    .withPriority(100)
    .build();

  grammar
    .define('climb into :portal')
    .hasTrait('portal', TraitType.ENTERABLE)
    .mapsTo('if.action.entering')
    .withPriority(100)
    .build();

  grammar
    .define('go in :portal')
    .hasTrait('portal', TraitType.ENTERABLE)
    .mapsTo('if.action.entering')
    .withPriority(100)
    .build();

  grammar
    .define('go into :portal')
    .hasTrait('portal', TraitType.ENTERABLE)
    .mapsTo('if.action.entering')
    .withPriority(100)
    .build();

  // Exiting (bare command, no target - exits current container/location)
  grammar
    .define('exit')
    .mapsTo('if.action.exiting')
    .withPriority(100)
    .build();

  grammar
    .define('get out')
    .mapsTo('if.action.exiting')
    .withPriority(100)
    .build();

  grammar
    .define('leave')
    .mapsTo('if.action.exiting')
    .withPriority(95)
    .build();

  grammar
    .define('climb out')
    .mapsTo('if.action.exiting')
    .withPriority(100)
    .build();

  // Vehicle-specific synonyms (map to entering/exiting actions)
  grammar
    .define('board :vehicle')
    .hasTrait('vehicle', TraitType.ENTERABLE)
    .mapsTo('if.action.entering')
    .withPriority(100)
    .build();

  grammar
    .define('get on :vehicle')
    .hasTrait('vehicle', TraitType.ENTERABLE)
    .mapsTo('if.action.entering')
    .withPriority(100)
    .build();

  // Exiting with a target (exit specific container/vehicle)
  grammar
    .define('exit :container')
    .hasTrait('container', TraitType.ENTERABLE)
    .mapsTo('if.action.exiting')
    .withPriority(100)
    .build();

  grammar
    .define('disembark')
    .mapsTo('if.action.exiting')
    .withPriority(100)
    .build();

  grammar
    .define('disembark :vehicle')
    .hasTrait('vehicle', TraitType.ENTERABLE)
    .mapsTo('if.action.exiting')
    .withPriority(100)
    .build();

  grammar
    .define('get off :vehicle')
    .hasTrait('vehicle', TraitType.ENTERABLE)
    .mapsTo('if.action.exiting')
    .withPriority(100)
    .build();

  grammar
    .define('alight')
    .mapsTo('if.action.exiting')
    .withPriority(95)
    .build();
}