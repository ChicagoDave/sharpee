/**
 * @file Core English Grammar Rules
 * @description Standard grammar patterns for English interactive fiction
 */

import { GrammarBuilder, ScopeBuilder } from '@sharpee/if-domain';

/**
 * Define core English grammar rules
 * @param grammar The grammar builder to use
 */
export function defineCoreGrammar(grammar: GrammarBuilder): void {
  // Basic verb patterns
  grammar
    .define('look')
    .mapsTo('if.action.looking')
    .withPriority(100)
    .build();

  grammar
    .define('l')
    .mapsTo('if.action.looking')
    .withPriority(90)
    .build(); // Lower priority for abbreviation

  grammar
    .define('examine :target')
    .where('target', (scope: ScopeBuilder) => scope.visible())
    .mapsTo('if.action.examining')
    .withPriority(100)
    .build();

  grammar
    .define('x :target')
    .where('target', (scope: ScopeBuilder) => scope.visible())
    .mapsTo('if.action.examining')
    .withPriority(90)
    .build();

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

  // Taking and dropping
  grammar
    .define('take :item')
    .where('item', (scope: ScopeBuilder) => scope.visible().matching({ portable: true }))
    .mapsTo('if.action.taking')
    .withPriority(100)
    .build();

  grammar
    .define('get :item')
    .where('item', (scope: ScopeBuilder) => scope.visible().matching({ portable: true }))
    .mapsTo('if.action.taking')
    .withPriority(100)
    .build();

  grammar
    .define('pick up :item')
    .where('item', (scope: ScopeBuilder) => scope.visible().matching({ portable: true }))
    .mapsTo('if.action.taking')
    .withPriority(100)
    .build();

  grammar
    .define('drop :item')
    .where('item', (scope: ScopeBuilder) => scope.carried())
    .mapsTo('if.action.dropping')
    .withPriority(100)
    .build();

  grammar
    .define('put down :item')
    .where('item', (scope: ScopeBuilder) => scope.carried())
    .mapsTo('if.action.dropping')
    .withPriority(100)
    .build();

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

  // Reading
  grammar
    .define('read :target')
    .where('target', (scope: ScopeBuilder) => scope.visible())
    .mapsTo('if.action.reading')
    .withPriority(100)
    .build();

  grammar
    .define('peruse :target')
    .where('target', (scope: ScopeBuilder) => scope.visible())
    .mapsTo('if.action.reading')
    .withPriority(95)
    .build();

  grammar
    .define('study :target')
    .where('target', (scope: ScopeBuilder) => scope.visible())
    .mapsTo('if.action.reading')
    .withPriority(95)
    .build();

  // Inventory
  grammar
    .define('inventory')
    .mapsTo('if.action.inventory')
    .withPriority(100)
    .build();

  grammar
    .define('inv')
    .mapsTo('if.action.inventory')
    .withPriority(90)
    .build();

  grammar
    .define('i')
    .mapsTo('if.action.inventory')
    .withPriority(90)
    .build();

  // Movement
  grammar
    .define('go :direction')
    .where('direction', { type: 'direction' })
    .mapsTo('if.action.going')
    .withPriority(100)
    .build();

  // Bare directions
  grammar
    .define('north')
    .mapsTo('if.action.going')
    .withPriority(100)
    .build();

  grammar
    .define('south')
    .mapsTo('if.action.going')
    .withPriority(100)
    .build();

  grammar
    .define('east')
    .mapsTo('if.action.going')
    .withPriority(100)
    .build();

  grammar
    .define('west')
    .mapsTo('if.action.going')
    .withPriority(100)
    .build();

  grammar
    .define('northeast')
    .mapsTo('if.action.going')
    .withPriority(100)
    .build();

  grammar
    .define('northwest')
    .mapsTo('if.action.going')
    .withPriority(100)
    .build();

  grammar
    .define('southeast')
    .mapsTo('if.action.going')
    .withPriority(100)
    .build();

  grammar
    .define('southwest')
    .mapsTo('if.action.going')
    .withPriority(100)
    .build();

  grammar
    .define('up')
    .mapsTo('if.action.going')
    .withPriority(100)
    .build();

  grammar
    .define('down')
    .mapsTo('if.action.going')
    .withPriority(100)
    .build();

  grammar
    .define('in')
    .mapsTo('if.action.going')
    .withPriority(100)
    .build();

  grammar
    .define('out')
    .mapsTo('if.action.going')
    .withPriority(100)
    .build();

  // Direction abbreviations
  grammar
    .define('n')
    .mapsTo('if.action.going')
    .withPriority(90)
    .build();

  grammar
    .define('s')
    .mapsTo('if.action.going')
    .withPriority(90)
    .build();

  grammar
    .define('e')
    .mapsTo('if.action.going')
    .withPriority(90)
    .build();

  grammar
    .define('w')
    .mapsTo('if.action.going')
    .withPriority(90)
    .build();

  grammar
    .define('ne')
    .mapsTo('if.action.going')
    .withPriority(90)
    .build();

  grammar
    .define('nw')
    .mapsTo('if.action.going')
    .withPriority(90)
    .build();

  grammar
    .define('se')
    .mapsTo('if.action.going')
    .withPriority(90)
    .build();

  grammar
    .define('sw')
    .mapsTo('if.action.going')
    .withPriority(90)
    .build();

  grammar
    .define('u')
    .mapsTo('if.action.going')
    .withPriority(90)
    .build();

  grammar
    .define('d')
    .mapsTo('if.action.going')
    .withPriority(90)
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

  // Switching on/off
  grammar
    .define('turn on :device')
    .where('device', (scope: ScopeBuilder) => scope.touchable().matching({ switchable: true }))
    .mapsTo('if.action.switching_on')
    .withPriority(100)
    .build();

  grammar
    .define('switch on :device')
    .where('device', (scope: ScopeBuilder) => scope.touchable().matching({ switchable: true }))
    .mapsTo('if.action.switching_on')
    .withPriority(100)
    .build();

  grammar
    .define('turn off :device')
    .where('device', (scope: ScopeBuilder) => scope.touchable().matching({ switchable: true }))
    .mapsTo('if.action.switching_off')
    .withPriority(100)
    .build();

  grammar
    .define('switch off :device')
    .where('device', (scope: ScopeBuilder) => scope.touchable().matching({ switchable: true }))
    .mapsTo('if.action.switching_off')
    .withPriority(100)
    .build();

  // Waiting
  grammar
    .define('wait')
    .mapsTo('if.action.waiting')
    .withPriority(100)
    .build();

  grammar
    .define('z')
    .mapsTo('if.action.waiting')
    .withPriority(90)
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

  grammar
    .define('quit')
    .mapsTo('if.action.quitting')
    .withPriority(100)
    .build();

  grammar
    .define('q')
    .mapsTo('if.action.quitting')
    .withPriority(90)
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
}