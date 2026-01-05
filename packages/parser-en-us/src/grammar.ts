/**
 * @file English Grammar Rules
 * @description Standard grammar patterns for English interactive fiction
 *
 * Rule Priority Guidelines:
 * - 100+: Semantic rules with constraints (e.g., .matching({ enterable: true }))
 * - 100: Standard patterns
 * - 95: Synonyms/alternatives
 * - 90: Abbreviations
 *
 * Semantic rules should come first to match before fallback patterns.
 */

import { GrammarBuilder, ScopeBuilder } from '@sharpee/if-domain';

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
  grammar
    .forAction('if.action.examining')
    .verbs(['examine', 'x', 'inspect'])
    .pattern(':target')
    .where('target', (scope: ScopeBuilder) => scope.visible())
    .build();

  // "look at" is a phrasal pattern - different structure
  grammar
    .define('look at :target')
    .where('target', (scope: ScopeBuilder) => scope.visible())
    .mapsTo('if.action.examining')
    .withPriority(95)
    .build();

  // Looking with optional adverbs
  grammar
    .define('look [carefully] at :target')
    .where('target', (scope: ScopeBuilder) => scope.visible())
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
    .where('target', (scope: ScopeBuilder) => scope.visible())
    .mapsTo('if.action.searching')
    .withPriority(100)
    .build();

  grammar
    .define('look in|inside :target')
    .where('target', (scope: ScopeBuilder) => scope.visible())
    .mapsTo('if.action.searching')
    .withPriority(100)
    .build();

  grammar
    .define('look through :target')
    .where('target', (scope: ScopeBuilder) => scope.visible())
    .mapsTo('if.action.searching')
    .withPriority(100)
    .build();

  grammar
    .define('rummage in|through :target')
    .where('target', (scope: ScopeBuilder) => scope.visible())
    .mapsTo('if.action.searching')
    .withPriority(95)
    .build();

  // Taking and dropping (ADR-087: using forAction)
  grammar
    .forAction('if.action.taking')
    .verbs(['take', 'get', 'grab'])
    .pattern(':item')
    .where('item', (scope: ScopeBuilder) => scope.visible().matching({ portable: true }))
    .build();

  // "pick up" is a phrasal verb - different pattern structure
  grammar
    .define('pick up :item')
    .where('item', (scope: ScopeBuilder) => scope.visible().matching({ portable: true }))
    .mapsTo('if.action.taking')
    .withPriority(100)
    .build();

  grammar
    .forAction('if.action.dropping')
    .verbs(['drop', 'discard'])
    .pattern(':item')
    .where('item', (scope: ScopeBuilder) => scope.carried())
    .build();

  // "put down" is a phrasal verb - different pattern structure
  grammar
    .define('put down :item')
    .where('item', (scope: ScopeBuilder) => scope.carried())
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
  grammar
    .define('put :item in|into|inside :container')
    .where('item', (scope: ScopeBuilder) => scope.carried())
    .where('container', (scope: ScopeBuilder) => scope.touchable().matching({ container: true }))
    .mapsTo('if.action.inserting')
    .withPriority(100)
    .build();

  grammar
    .define('insert :item in|into :container')
    .where('item', (scope: ScopeBuilder) => scope.carried())
    .where('container', (scope: ScopeBuilder) => scope.touchable().matching({ container: true }))
    .mapsTo('if.action.inserting')
    .withPriority(100)
    .build();

  // Supporter operations (including hanging!)
  grammar
    .define('put :item on|onto :supporter')
    .where('item', (scope: ScopeBuilder) => scope.carried())
    .where('supporter', (scope: ScopeBuilder) => scope.touchable().matching({ supporter: true }))
    .mapsTo('if.action.putting')
    .withPriority(100)
    .build();

  grammar
    .define('hang :item on :hook')
    .where('item', (scope: ScopeBuilder) => scope.carried())
    .where('hook', (scope: ScopeBuilder) => scope.touchable())
    .mapsTo('if.action.putting')
    .withPriority(110)
    .build(); // Higher priority than generic put

  // Reading (ADR-087: using forAction)
  grammar
    .forAction('if.action.reading')
    .verbs(['read', 'peruse', 'study'])
    .pattern(':target')
    .where('target', (scope: ScopeBuilder) => scope.visible())
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
  grammar
    .define('open :door')
    .where('door', (scope: ScopeBuilder) => scope.touchable().matching({ openable: true }))
    .mapsTo('if.action.opening')
    .withPriority(100)
    .build();

  grammar
    .define('close :door')
    .where('door', (scope: ScopeBuilder) => scope.touchable().matching({ openable: true }))
    .mapsTo('if.action.closing')
    .withPriority(100)
    .build();

  // Switching on/off (ADR-087: using forAction)
  grammar
    .forAction('if.action.switching_on')
    .verbs(['turn', 'switch', 'flip'])
    .pattern('on :device')
    .where('device', (scope: ScopeBuilder) => scope.touchable().matching({ switchable: true }))
    .build();

  grammar
    .forAction('if.action.switching_off')
    .verbs(['turn', 'switch', 'flip'])
    .pattern('off :device')
    .where('device', (scope: ScopeBuilder) => scope.touchable().matching({ switchable: true }))
    .build();

  // Pushing and pulling (ADR-087: using forAction)
  grammar
    .forAction('if.action.pushing')
    .verbs(['push', 'press', 'shove', 'move'])
    .pattern(':target')
    .where('target', (scope: ScopeBuilder) => scope.touchable())
    .build();

  grammar
    .forAction('if.action.pulling')
    .verbs(['pull', 'drag', 'yank'])
    .pattern(':target')
    .where('target', (scope: ScopeBuilder) => scope.touchable())
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
  // Giving
  grammar
    .define('give :item to :recipient')
    .where('item', (scope: ScopeBuilder) => scope.carried())
    .where('recipient', (scope: ScopeBuilder) => scope.visible().matching({ animate: true }))
    .mapsTo('if.action.giving')
    .withPriority(100)
    .build();

  grammar
    .define('give :recipient :item')
    .where('item', (scope: ScopeBuilder) => scope.carried())
    .where('recipient', (scope: ScopeBuilder) => scope.visible().matching({ animate: true }))
    .mapsTo('if.action.giving')
    .withPriority(95)
    .build(); // Slightly lower priority than explicit "to"

  grammar
    .define('offer :item to :recipient')
    .where('item', (scope: ScopeBuilder) => scope.carried())
    .where('recipient', (scope: ScopeBuilder) => scope.visible().matching({ animate: true }))
    .mapsTo('if.action.giving')
    .withPriority(100)
    .build();

  // Showing
  grammar
    .define('show :item to :recipient')
    .where('item', (scope: ScopeBuilder) => scope.carried())
    .where('recipient', (scope: ScopeBuilder) => scope.visible().matching({ animate: true }))
    .mapsTo('if.action.showing')
    .withPriority(100)
    .build();

  grammar
    .define('show :recipient :item')
    .where('item', (scope: ScopeBuilder) => scope.carried())
    .where('recipient', (scope: ScopeBuilder) => scope.visible().matching({ animate: true }))
    .mapsTo('if.action.showing')
    .withPriority(95)
    .build();

  // Throwing
  grammar
    .define('throw :item at :target')
    .where('item', (scope: ScopeBuilder) => scope.carried())
    .where('target', (scope: ScopeBuilder) => scope.visible())
    .mapsTo('if.action.throwing')
    .withPriority(100)
    .build();

  grammar
    .define('throw :item to :recipient')
    .where('item', (scope: ScopeBuilder) => scope.carried())
    .where('recipient', (scope: ScopeBuilder) => scope.visible())
    .mapsTo('if.action.throwing')
    .withPriority(100)
    .build();

  // Multiple preposition patterns (Phase 2.1)
  // Taking from container with tool
  grammar
    .define('take :item from :container with :tool')
    .where('item', (scope: ScopeBuilder) => scope.visible().matching({ portable: true }))
    .where('container', (scope: ScopeBuilder) => scope.visible())
    .where('tool', (scope: ScopeBuilder) => scope.carried())
    .mapsTo('if.action.taking_with')
    .withPriority(110)
    .build(); // Higher priority than simple take

  // Unlocking with key
  grammar
    .define('unlock :door with :key')
    .where('door', (scope: ScopeBuilder) => scope.touchable().matching({ locked: true }))
    .where('key', (scope: ScopeBuilder) => scope.carried())
    .mapsTo('if.action.unlocking')
    .withPriority(110)
    .build(); // Higher priority than simple unlock

  // Opening with tool
  grammar
    .define('open :container with :tool')
    .where('container', (scope: ScopeBuilder) => scope.touchable().matching({ openable: true, open: false }))
    .where('tool', (scope: ScopeBuilder) => scope.carried())
    .mapsTo('if.action.opening_with')
    .withPriority(110)
    .build(); // Higher priority than simple open

  // Cutting with tool
  grammar
    .define('cut :object with :tool')
    .where('object', (scope: ScopeBuilder) => scope.visible())
    .where('tool', (scope: ScopeBuilder) => scope.carried())
    .mapsTo('if.action.cutting')
    .withPriority(110)
    .build(); // Higher priority than simple cut

  // Attacking with weapon
  grammar
    .define('attack :target with :weapon')
    .where('target', (scope: ScopeBuilder) => scope.visible())
    .where('weapon', (scope: ScopeBuilder) => scope.carried())
    .mapsTo('if.action.attacking')
    .withPriority(110)
    .build(); // Higher priority than simple attack

  // Digging with tool
  grammar
    .define('dig :location with :tool')
    .where('location', (scope: ScopeBuilder) => scope.visible())
    .where('tool', (scope: ScopeBuilder) => scope.carried())
    .mapsTo('if.action.digging')
    .withPriority(110)
    .build(); // Higher priority than simple dig

  // Communication patterns with quoted strings
  grammar
    .define('say :message')
    .mapsTo('if.action.saying')
    .withPriority(100)
    .build();

  grammar
    .define('say :message to :recipient')
    .where('recipient', (scope: ScopeBuilder) => scope.visible().matching({ animate: true }))
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
    .where('surface', (scope: ScopeBuilder) => scope.visible())
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
    .where('recipient', (scope: ScopeBuilder) => scope.visible().matching({ animate: true }))
    .mapsTo('if.action.whispering')
    .withPriority(100)
    .build();

  grammar
    .define('tell :recipient about :topic')
    .where('recipient', (scope: ScopeBuilder) => scope.visible().matching({ animate: true }))
    .mapsTo('if.action.telling')
    .withPriority(100)
    .build();

  grammar
    .define('ask :recipient about :topic')
    .where('recipient', (scope: ScopeBuilder) => scope.visible().matching({ animate: true }))
    .mapsTo('if.action.asking')
    .withPriority(100)
    .build();

  // Touching/sensory actions (ADR-087: using forAction)
  grammar
    .forAction('if.action.touching')
    .verbs(['touch', 'rub', 'feel', 'pat', 'stroke', 'poke', 'prod'])
    .pattern(':target')
    .where('target', (scope: ScopeBuilder) => scope.touchable())
    .build();

  // ============================================================================
  // ENTERING AND EXITING
  // Semantic rules (with constraints) have higher priority than simple fallbacks
  // ============================================================================

  // Semantic: enter specific enterable thing (priority 100)
  grammar
    .define('enter :portal')
    .where('portal', (scope: ScopeBuilder) => scope.visible().matching({ enterable: true }))
    .mapsTo('if.action.entering')
    .withPriority(100)
    .build();

  grammar
    .define('get in :portal')
    .where('portal', (scope: ScopeBuilder) => scope.visible().matching({ enterable: true }))
    .mapsTo('if.action.entering')
    .withPriority(100)
    .build();

  grammar
    .define('get into :portal')
    .where('portal', (scope: ScopeBuilder) => scope.visible().matching({ enterable: true }))
    .mapsTo('if.action.entering')
    .withPriority(100)
    .build();

  grammar
    .define('climb in :portal')
    .where('portal', (scope: ScopeBuilder) => scope.visible().matching({ enterable: true }))
    .mapsTo('if.action.entering')
    .withPriority(100)
    .build();

  grammar
    .define('climb into :portal')
    .where('portal', (scope: ScopeBuilder) => scope.visible().matching({ enterable: true }))
    .mapsTo('if.action.entering')
    .withPriority(100)
    .build();

  grammar
    .define('go in :portal')
    .where('portal', (scope: ScopeBuilder) => scope.visible().matching({ enterable: true }))
    .mapsTo('if.action.entering')
    .withPriority(100)
    .build();

  grammar
    .define('go into :portal')
    .where('portal', (scope: ScopeBuilder) => scope.visible().matching({ enterable: true }))
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
    .where('vehicle', (scope: ScopeBuilder) => scope.visible().matching({ enterable: true }))
    .mapsTo('if.action.entering')
    .withPriority(100)
    .build();

  grammar
    .define('get on :vehicle')
    .where('vehicle', (scope: ScopeBuilder) => scope.visible().matching({ enterable: true }))
    .mapsTo('if.action.entering')
    .withPriority(100)
    .build();

  // Exiting with a target (exit specific container/vehicle)
  grammar
    .define('exit :container')
    .where('container', (scope: ScopeBuilder) => scope.visible().matching({ enterable: true }))
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
    .where('vehicle', (scope: ScopeBuilder) => scope.visible().matching({ enterable: true }))
    .mapsTo('if.action.exiting')
    .withPriority(100)
    .build();

  grammar
    .define('get off :vehicle')
    .where('vehicle', (scope: ScopeBuilder) => scope.visible().matching({ enterable: true }))
    .mapsTo('if.action.exiting')
    .withPriority(100)
    .build();

  grammar
    .define('alight')
    .mapsTo('if.action.exiting')
    .withPriority(95)
    .build();
}