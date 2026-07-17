/**
 * @file English Grammar Rules
 * @description Standard grammar patterns for English interactive fiction
 *
 * Rule Priority Guidelines:
 * - 100+: Specific/phrasal patterns that must outrank broader ones
 * - 100: Standard patterns
 * - 95: Synonyms/alternatives
 * - 90: Abbreviations
 *
 * Parse-time gating: `.where()` scope constraints are the one parse-time
 * gating mechanism. Trait-based refusal ("that's not something you can
 * enter/climb/open") lives in each action's validate(), never in grammar —
 * the former rule-level `.hasTrait()` API was a parse-time no-op and was
 * deleted (ADR-231 D2a, 2026-07-17).
 */

import { GrammarBuilder } from '@sharpee/if-domain';

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
    .verbs(['examine', 'x', 'inspect', 'check', 'view', 'observe']) // +check/view/observe (ADR-230 D4)
    .pattern(':target')
    .build();

  // "look at" is a phrasal pattern - different structure
  grammar
    .define('look at :target')
    .mapsTo('if.action.examining')
    .withPriority(95)
    .build();

  // Looking with optional adverbs (ADR-230 D3a: the adverb form is just
  // examining — if.action.examining_carefully had no action behind it)
  grammar
    .define('look [carefully] at :target')
    .mapsTo('if.action.examining')
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
    .verbs(['take', 'get', 'grab', 'acquire', 'collect']) // +acquire/collect (ADR-230 D4; bare `pick` deliberately absent — it would outmatch the `pick up :item` compound)
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
    .verbs(['drop', 'discard', 'release']) // +release (ADR-230 D4 patterns reconciliation)
    .pattern(':item')
    .build();

  // "put down" is a phrasal verb - different pattern structure
  grammar
    .define('put down :item')
    .mapsTo('if.action.dropping')
    .withPriority(100)
    .build();

  // Wearing and taking off (wearables). The actions, messages, and verb
  // data (lang-en-us verbs.ts) predate these rules; the grammar was the
  // missing piece — "remove cloak" was unparseable and "take off :item"
  // fell through to taking.
  grammar
    .forAction('if.action.wearing')
    .verbs(['wear', 'don', 'equip'])
    .pattern(':item')
    .build();

  // "put on" is a phrasal verb - higher priority than generic put
  grammar
    .define('put on :item')
    .mapsTo('if.action.wearing')
    .withPriority(105)
    .build();

  grammar
    .forAction('if.action.taking_off')
    .verbs(['remove', 'doff', 'unequip'])
    .pattern(':item')
    .build();

  // "take off" / "take :item off" are phrasal - higher priority than "take :item"
  grammar
    .define('take off :item')
    .mapsTo('if.action.taking_off')
    .withPriority(105)
    .build();

  grammar
    .define('take :item off')
    .mapsTo('if.action.taking_off')
    .withPriority(105)
    .build();

  // Eating (ADR-087: using forAction)
  grammar
    .forAction('if.action.eating')
    .verbs(['eat', 'consume', 'devour', 'munch', 'nibble']) // +munch/nibble (ADR-230 D4 patterns reconciliation)
    .pattern(':item')
    .build();

  // Drinking (ADR-087: using forAction)
  grammar
    .forAction('if.action.drinking')
    .verbs(['drink', 'sip', 'quaff', 'swallow', 'imbibe']) // +swallow/imbibe (ADR-230 D4)
    .pattern(':item')
    .build();

  // ADR-080 Phase 2: Multi-object commands
  // Note: The parser detects "all" and "X and Y" patterns automatically in entity slots.
  // No special grammar patterns needed - existing patterns work because:
  // - "take all" matches "take :item", consumeEntitySlot detects "all" keyword
  // - "take knife and lamp" matches "take :item", parser creates list
  // - "take all but sword" matches "take :item", parser detects exclusion

  // Container operations
  // Scope and trait-based refusal handled by action validation
  grammar
    .define('put :item in|into|inside :container')
    .mapsTo('if.action.inserting')
    .withPriority(100)
    .build();

  grammar
    .define('insert :item in|into :container')
    .mapsTo('if.action.inserting')
    .withPriority(100)
    .build();

  // Supporter operations (including hanging!)
  grammar
    .define('put :item on|onto :supporter')
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

  // Movement (ADR-087). The old `go :direction` define was DELETED in
  // ADR-230 Phase 6: a `:direction` slot with a `{ type: 'direction' }`
  // constraint always failed at runtime ("PropertyConstraint in slot
  // constraints not yet supported"), so `go north` never worked — the
  // verb+direction literals in the D4 block below replace it.

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
      'in': ['in', 'inside'],
      'out': ['out', 'outside'],
    })
    .build();

  // Opening and closing
  // Scope and trait-based refusal handled by action validation
  grammar
    .define('open :door')
    .mapsTo('if.action.opening')
    .withPriority(100)
    .build();

  grammar
    .define('close :door')
    .mapsTo('if.action.closing')
    .withPriority(100)
    .build();

  // Switching on/off (ADR-087: using forAction)
  grammar
    .forAction('if.action.switching_on')
    .verbs(['turn', 'switch', 'flip'])
    .pattern('on :device')
    .build();

  grammar
    .forAction('if.action.switching_off')
    .verbs(['turn', 'switch', 'flip'])
    .pattern('off :device')
    .build();

  // Alternative phrasal verb order: "turn lamp on" / "turn lamp off"
  grammar
    .define('turn :device on')
    .mapsTo('if.action.switching_on')
    .build();

  grammar
    .define('turn :device off')
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
    .verbs(['pull', 'drag', 'yank', 'tug']) // +tug (ADR-230 D4)
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

  // Sleeping (ADR-230 D2; +nap/doze/rest/slumber D4)
  grammar
    .forAction('if.action.sleeping')
    .verbs(['sleep', 'nap', 'doze', 'rest', 'slumber'])
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
    .mapsTo('if.action.scoring')
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

  // About / Info / Credits
  grammar
    .define('about')
    .mapsTo('if.action.about')
    .withPriority(100)
    .build();

  grammar
    .define('info')
    .mapsTo('if.action.about')
    .withPriority(100)
    .build();

  grammar
    .define('credits')
    .mapsTo('if.action.about')
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
  // Scope and trait-based refusal handled by action validation

  // Giving
  grammar
    .define('give :item to :recipient')
    .mapsTo('if.action.giving')
    .withPriority(100)
    .build();

  grammar
    .define('give :recipient :item')
    .mapsTo('if.action.giving')
    .withPriority(95)
    .build(); // Slightly lower priority than explicit "to"

  grammar
    .define('offer :item to :recipient')
    .mapsTo('if.action.giving')
    .withPriority(100)
    .build();

  // Showing
  grammar
    .define('show :item to :recipient')
    .mapsTo('if.action.showing')
    .withPriority(100)
    .build();

  grammar
    .define('show :recipient :item')
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

  // Taking from container with tool (ADR-230 Phase 6: remapped from the
  // orphan if.action.taking_with onto removing — the tool rides the
  // instrument slot and is interceptor-consultable)
  grammar
    .define('take :item from :container with|using :tool')
    .instrument('tool')
    .mapsTo('if.action.removing')
    .withPriority(110)
    .build();

  // Removing from a container (ADR-230 D2). Priority 110 like the other
  // multi-preposition patterns here, so the from-form outranks taking_off's
  // bare `remove :target` when the command names a source.
  grammar
    .define('remove :item from :container')
    .mapsTo('if.action.removing')
    .withPriority(110)
    .build();

  // Unlocking with key
  grammar
    .define('unlock :door with|using :key')
    .instrument('key')
    .mapsTo('if.action.unlocking')
    .withPriority(110)
    .build();

  // Locking and keyless unlocking (ADR-230 D2). No trait constraint,
  // mirroring the keyed unlock pattern: the action's validate owns
  // not-lockable/no-key messaging (validateKeyRequirements refuses with
  // no_key when the lockable requires a key).
  grammar
    .forAction('if.action.locking')
    .verbs(['lock'])
    .pattern(':target')
    .build();

  grammar
    .define('lock :target with|using :key')
    .instrument('key')
    .mapsTo('if.action.locking')
    .withPriority(110)
    .build();

  grammar
    .forAction('if.action.unlocking')
    .verbs(['unlock'])
    .pattern(':target')
    .build();

  // Opening with tool (ADR-230 D3b: a tool slot on the standard opening
  // action, not a separate id — if.action.opening_with had no action)
  grammar
    .define('open :container with|using :tool')
    .instrument('tool')
    .mapsTo('if.action.opening')
    .withPriority(110)
    .build();

  // Cutting with tool
  grammar
    .define('cut :object with|using :tool')
    .instrument('tool')
    .mapsTo('if.action.cutting')
    .withPriority(110)
    .build();

  // Attacking - simple patterns (ADR-087: using forAction)
  grammar
    .forAction('if.action.attacking')
    .verbs(['attack', 'kill', 'fight', 'slay', 'murder', 'hit', 'strike', 'break', 'smash', 'destroy']) // +break/smash/destroy (ADR-230 D4)
    .pattern(':target')
    .build();

  // Attacking with weapon (higher priority than simple attack)
  grammar
    .define('attack :target with|using :weapon')
    .instrument('weapon')
    .mapsTo('if.action.attacking')
    .withPriority(110)
    .build();

  grammar
    .define('kill :target with|using :weapon')
    .instrument('weapon')
    .mapsTo('if.action.attacking')
    .withPriority(110)
    .build();

  grammar
    .define('hit :target with|using :weapon')
    .instrument('weapon')
    .mapsTo('if.action.attacking')
    .withPriority(110)
    .build();

  grammar
    .define('strike :target with|using :weapon')
    .instrument('weapon')
    .mapsTo('if.action.attacking')
    .withPriority(110)
    .build();

  // Digging with tool
  grammar
    .define('dig :location with|using :tool')
    .instrument('tool')
    .mapsTo('if.action.digging')
    .withPriority(110)
    .build();

  // Communication patterns (saying/saying_to/writing/writing_on/shouting/
  // whispering) DELETED in ADR-230 Phase 6 (sketch ruling 4/5): the ids had
  // no actions — they parsed and runtime-failed in every story. Grammar
  // returns with the conversation/writing systems; stories (e.g. dungeo's
  // SAY) keep their own story-grammar verbs meanwhile.

  grammar
    .define('tell :recipient about :topic')
    .mapsTo('if.action.telling')
    .withPriority(100)
    .build();

  grammar
    .define('ask :recipient about :topic')
    .mapsTo('if.action.asking')
    .withPriority(100)
    .build();

  // asking/telling aliases (ADR-230 Phase 6 — actions revived as minimal
  // interceptable stubs)
  grammar
    .define('question :recipient about :topic')
    .mapsTo('if.action.asking')
    .withPriority(100)
    .build();

  grammar
    .define('inquire of :recipient about :topic')
    .mapsTo('if.action.asking')
    .withPriority(100)
    .build();

  grammar
    .define('inform :recipient about :topic')
    .mapsTo('if.action.telling')
    .withPriority(100)
    .build();

  // Talking (ADR-229 R3): the core route to if.action.talking — the action
  // was wired for interceptors (ADR-228 Phase 5) but previously reachable
  // only via story grammar. No parse-time actor gate (the pattern all
  // trait-gated verbs now follow, ADR-231 D2a): talking's validate owns
  // not_actor/too_far, so those refusals flow through blocked() →
  // onBlocked (interceptor-visible) instead of dying as a parse failure.
  // Story grammar outranks these on priority as usual.
  grammar
    .define('talk to|with :target')
    .mapsTo('if.action.talking')
    .withPriority(100)
    .build();

  grammar
    .define('speak to|with :target')
    .mapsTo('if.action.talking')
    .withPriority(100)
    .build();

  grammar
    .define('chat with :target')
    .mapsTo('if.action.talking')
    .withPriority(100)
    .build();

  grammar
    .define('converse with :target')
    .mapsTo('if.action.talking')
    .withPriority(100)
    .build();

  // ==========================================================================
  // D4 SYNONYM PROMOTION (ADR-230): every verbs.ts synonym parses.
  // Mechanical aliases of existing actions; phrasal/complex forms use
  // .define() per the ADR-087 convention.
  // ==========================================================================

  // going aliases (verbs.ts: walk/run/head/travel; `move` LEFT the going
  // list — Phase 1 ruling, move is manipulation-only).
  // Literal expansion per direction alias, exactly like the bare-direction
  // block below: a `:direction` slot inside .define() does NOT match
  // direction words (the `go :direction` rule above yields
  // "PropertyConstraint not yet supported" — pre-existing; bare directions
  // are what players actually use). These literals also make `go north`
  // work for the first time.
  {
    const directionAliases: Record<string, string[]> = {
      north: ['north', 'n'],
      south: ['south', 's'],
      east: ['east', 'e'],
      west: ['west', 'w'],
      northeast: ['northeast', 'ne'],
      northwest: ['northwest', 'nw'],
      southeast: ['southeast', 'se'],
      southwest: ['southwest', 'sw'],
      up: ['up', 'u'],
      down: ['down', 'd'],
      in: ['in', 'inside'],
      out: ['out', 'outside'],
    };
    for (const verb of ['go', 'walk', 'run', 'head', 'travel']) {
      for (const [canonical, aliases] of Object.entries(directionAliases)) {
        for (const alias of aliases) {
          grammar
            .define(`${verb} ${alias}`)
            .mapsTo('if.action.going')
            .withPriority(alias.length === 1 ? 90 : 100)
            .withDefaultSemantics({ direction: canonical as never })
            .build();
        }
      }
    }
    // `move :target <direction>` → pushing (Phase 1 move ruling), same
    // literal expansion.
    for (const aliases of Object.values(directionAliases)) {
      for (const alias of aliases) {
        grammar
          .define(`move :target ${alias}`)
          .mapsTo('if.action.pushing')
          .withPriority(105)
          .build();
      }
    }
  }

  // exiting alias
  grammar.define('go out').mapsTo('if.action.exiting').withPriority(100).build();

  // listening alias (hear)
  grammar.define('hear').mapsTo('if.action.listening').withPriority(100).build();
  grammar.define('hear :target').mapsTo('if.action.listening').withPriority(100).build();

  // taking/dropping phrasal aliases
  grammar.define('take up :item').mapsTo('if.action.taking').withPriority(100).build();
  grammar.define('throw away :item').mapsTo('if.action.dropping').withPriority(100).build();

  // putting aliases (place; move-to per the Phase 1 move ruling — putting
  // resolves in/on by destination type when the preposition is `to`)
  grammar.define('place :item in|into|inside :container').mapsTo('if.action.putting').withPriority(100).build();
  grammar.define('place :item on|onto :supporter').mapsTo('if.action.putting').withPriority(100).build();
  // 110 so the to-form outranks pushing's bare `move :target`
  grammar.define('move :item to :destination').mapsTo('if.action.putting').withPriority(110).build();

  // opening/closing aliases
  grammar.define('unwrap :door').mapsTo('if.action.opening').withPriority(100).build();
  grammar.define('uncover :door').mapsTo('if.action.opening').withPriority(100).build();
  grammar.define('shut :door').mapsTo('if.action.closing').withPriority(100).build();
  grammar.define('cover :door').mapsTo('if.action.closing').withPriority(100).build();

  // turning (ADR-230 Phase 6 sketch ruling 1: capability dispatch like
  // lowering/raising). Priority 95 so the switching phrasal forms
  // (`turn :device on`, `turn on :device`) always win.
  grammar.define('turn :target').mapsTo('if.action.turning').withPriority(95).build();
  grammar.define('rotate :target').mapsTo('if.action.turning').withPriority(95).build();
  grammar.define('twist :target').mapsTo('if.action.turning').withPriority(95).build();

  // locking/unlocking aliases
  grammar.define('secure :target').mapsTo('if.action.locking').withPriority(100).build();
  grammar.define('unsecure :target').mapsTo('if.action.unlocking').withPriority(100).build();

  // switching aliases (bare transitive forms — activate/start/deactivate/stop)
  grammar.define('activate :device').mapsTo('if.action.switching_on').withPriority(100).build();
  grammar.define('start :device').mapsTo('if.action.switching_on').withPriority(100).build();
  grammar.define('deactivate :device').mapsTo('if.action.switching_off').withPriority(100).build();
  grammar.define('stop :device').mapsTo('if.action.switching_off').withPriority(100).build();

  // giving/showing aliases
  grammar.define('hand :item to :recipient').mapsTo('if.action.giving').withPriority(100).build();
  grammar.define('hand :recipient :item').mapsTo('if.action.giving').withPriority(100).build();
  grammar.define('display :item to :recipient').mapsTo('if.action.showing').withPriority(100).build();
  grammar.define('present :item to :recipient').mapsTo('if.action.showing').withPriority(100).build();

  // throwing aliases
  grammar.define('toss :item at :target').mapsTo('if.action.throwing').withPriority(100).build();
  grammar.define('toss :item to :recipient').mapsTo('if.action.throwing').withPriority(100).build();
  grammar.define('hurl :item at :target').mapsTo('if.action.throwing').withPriority(100).build();
  grammar.define('hurl :item to :recipient').mapsTo('if.action.throwing').withPriority(100).build();

  // patterns-array reconciliation promotions (PIN 4b): phrasal forms the
  // lang help surface advertises
  grammar.define('munch on :item').mapsTo('if.action.eating').withPriority(100).build();
  grammar.define('nibble on :item').mapsTo('if.action.eating').withPriority(100).build();
  grammar.define('drink from :target').mapsTo('if.action.drinking').withPriority(100).build();
  grammar.define('sip from :target').mapsTo('if.action.drinking').withPriority(100).build();
  grammar.define('let go of :item').mapsTo('if.action.dropping').withPriority(100).build();
  grammar.define('open up :door').mapsTo('if.action.opening').withPriority(100).build();
  grammar.define('power on :device').mapsTo('if.action.switching_on').withPriority(100).build();
  grammar.define('power off :device').mapsTo('if.action.switching_off').withPriority(100).build();
  grammar.define('extract :item from :container').mapsTo('if.action.removing').withPriority(110).build();

  // meta aliases
  grammar.define('save game').mapsTo('if.action.saving').withPriority(100).build();
  grammar.define('load').mapsTo('if.action.restoring').withPriority(100).build();
  grammar.define('load game').mapsTo('if.action.restoring').withPriority(100).build();
  grammar.define('restore game').mapsTo('if.action.restoring').withPriority(100).build();
  grammar.define('exit game').mapsTo('if.action.quitting').withPriority(105).build(); // outranks `exit :container`
  grammar.define('?').mapsTo('if.action.help').withPriority(100).build();
  grammar.define('commands').mapsTo('if.action.help').withPriority(100).build();
  grammar.define('points').mapsTo('if.action.scoring').withPriority(100).build();

  // Touching/sensory actions (ADR-087: using forAction)
  // Scope handled by action validation
  grammar
    .forAction('if.action.touching')
    .verbs(['touch', 'rub', 'feel', 'pat', 'stroke', 'poke', 'prod'])
    .pattern(':target')
    .build();

  // Listening and smelling (ADR-230 D2) — bare and targeted forms; both
  // actions support the bare shape (ambient sound / room smell).
  grammar
    .define('listen')
    .mapsTo('if.action.listening')
    .withPriority(100)
    .build();

  grammar
    .define('listen to :target')
    .mapsTo('if.action.listening')
    .withPriority(100)
    .build();

  grammar
    .forAction('if.action.smelling')
    .verbs(['smell', 'sniff'])
    .build();

  grammar
    .forAction('if.action.smelling')
    .verbs(['smell', 'sniff'])
    .pattern(':target')
    .build();

  // ============================================================================
  // ENTERING AND EXITING
  // Scope and trait-based refusal handled by action validation
  // ============================================================================

  // Semantic: enter specific enterable thing (priority 100)
  grammar
    .define('enter :portal')
    .mapsTo('if.action.entering')
    .withPriority(100)
    .build();

  grammar
    .define('get in :portal')
    .mapsTo('if.action.entering')
    .withPriority(100)
    .build();

  grammar
    .define('get into :portal')
    .mapsTo('if.action.entering')
    .withPriority(100)
    .build();

  grammar
    .define('climb in :portal')
    .mapsTo('if.action.entering')
    .withPriority(100)
    .build();

  grammar
    .define('climb into :portal')
    .mapsTo('if.action.entering')
    .withPriority(100)
    .build();

  // Climb a climbable object (priority 100) — ADR-218 §1a (ratchet F2).
  // Routes `climb <thing>` and its synonyms to the climbing action's object-climb
  // path. [2026-07-17, ADR-231 D2a] This block originally claimed parse-time
  // CLIMBABLE gating via .hasTrait(); that call was a no-op and has been
  // deleted — climbing's validate() owns the not_climbable refusal.
  // The prepositional `climb in/into :portal` (entering) and `climb out` (exiting)
  // forms are unaffected — they carry a preposition token these bare forms do not.
  grammar
    .define('climb :target')
    .mapsTo('if.action.climbing')
    .withPriority(100)
    .build();

  grammar
    .define('climb up :target')
    .mapsTo('if.action.climbing')
    .withPriority(100)
    .build();

  grammar
    .define('climb down :target')
    .mapsTo('if.action.climbing')
    .withPriority(100)
    .build();

  grammar
    .define('scale :target')
    .mapsTo('if.action.climbing')
    .withPriority(100)
    .build();

  grammar
    .define('ascend :target')
    .mapsTo('if.action.climbing')
    .withPriority(100)
    .build();

  grammar
    .define('descend :target')
    .mapsTo('if.action.climbing')
    .withPriority(100)
    .build();

  grammar
    .define('go in :portal')
    .mapsTo('if.action.entering')
    .withPriority(100)
    .build();

  grammar
    .define('go into :portal')
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
    .mapsTo('if.action.entering')
    .withPriority(100)
    .build();

  grammar
    .define('get on :vehicle')
    .mapsTo('if.action.entering')
    .withPriority(100)
    .build();

  // Exiting with a target (exit specific container/vehicle)
  grammar
    .define('exit :container')
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
    .mapsTo('if.action.exiting')
    .withPriority(100)
    .build();

  grammar
    .define('get off :vehicle')
    .mapsTo('if.action.exiting')
    .withPriority(100)
    .build();

  grammar
    .define('alight')
    .mapsTo('if.action.exiting')
    .withPriority(95)
    .build();

  // =========================================================================
  // Meta commands - AGAIN (repeat last command)
  // =========================================================================

  // Full word "again"
  grammar
    .define('again')
    .mapsTo('if.action.again')
    .withPriority(100)
    .build();

  // Abbreviation "g"
  grammar
    .define('g')
    .mapsTo('if.action.again')
    .withPriority(90)
    .build();

  // =========================================================================
  // Concealment (ADR-148)
  // =========================================================================

  // Each pattern uses withDefaultSemantics({ position }) to deliver
  // the concealment position to the hiding action via extras.

  const concealmentPositions: Record<string, string[]> = {
    behind: ['hide behind', 'duck behind', 'crouch behind'],
    under:  ['hide under', 'duck under', 'crouch under'],
    on:     ['hide on'],
    inside: ['hide in', 'hide inside', 'duck inside'],
  };

  for (const [position, verbs] of Object.entries(concealmentPositions)) {
    for (const verb of verbs) {
      grammar
        .define(`${verb} :target`)
        .mapsTo('if.action.hiding')
        .withPriority(100)
        .withDefaultSemantics({ position })
        .build();
    }
  }

  // Revealing patterns — no target needed
  const revealPatterns = ['stand up', 'come out', 'reveal myself', 'unhide', 'stop hiding'];
  for (const pattern of revealPatterns) {
    grammar
      .define(pattern)
      .mapsTo('if.action.revealing')
      .withPriority(100)
      .build();
  }
}