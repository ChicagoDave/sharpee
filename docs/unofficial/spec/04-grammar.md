# Sharpee Grammar DSL Specification

**Subsystem**: Grammar — pattern definition DSL, slot constraints, priority
**Prerequisite**: `03-parser.md` (Parser pipeline; `ParsedCommand` shape)
**Version**: 1 (derived from code as of 2026-04-16)

---

## Purpose

The grammar DSL is the surface authors use to teach the parser how to recognise commands. It produces compiled patterns consumed by the parser's pattern engine. The DSL is **language-neutral** in its *types*: the same builder interface lives in `if-domain` and is used by every locale parser. Actual patterns (verbs, word order) live in the locale package (`parser-en-us`, etc.) or in the story.

Responsibilities:

1. Express patterns compactly (`'put :item in|into :container'`).
2. Constrain slots to entities that satisfy runtime predicates (scope, traits, properties).
3. Map patterns to action IDs (`if.action.putting`).
4. Resolve priority conflicts between patterns that could match the same input.
5. Carry semantic hints (manner, spatial relation, direction) from grammar to action.
6. Emit compiled patterns that the grammar engine can match efficiently.

---

## Invariants

1. **One action ID per pattern.** A compiled grammar rule maps to exactly one action. Multiple patterns MAY map to the same action.
2. **Slot names are unique within a pattern.** A pattern MAY NOT contain two `:target` slots.
3. **Patterns are compiled once.** A `GrammarRule` carries a `CompiledPattern` that is computed at build time, not per input.
4. **Pattern priority is totally ordered.** When multiple rules match, priority is the first sort key. Ties are broken by confidence, then by pattern length (longer patterns beat shorter ones on the same priority/confidence).
5. **Slot types are exclusive.** A slot is an `ENTITY` slot, or a `TEXT`/`TEXT_GREEDY` slot, or a typed-value slot (`NUMBER`, `DIRECTION`, etc.), or a `VOCABULARY` slot — never more than one.
6. **Scope constraints run at parse time.** `.where()` and `.hasTrait()` are evaluated during slot resolution, with the current world context. They MUST NOT mutate the world.
7. **Story patterns supersede stdlib.** When a story registers a pattern whose priority exceeds the stdlib default for the same input, the story pattern wins. There is no hidden namespacing.

---

## Public Contract

### Top-level builder

```
interface GrammarBuilder {
    define(pattern: String) -> PatternBuilder             // literal pattern
    forAction(actionId: String) -> ActionGrammarBuilder   // action-centric (ADR-087)
    getRules() -> List<GrammarRule>
    clear() -> Void
}
```

Two ways to define patterns:

- **`.define(pattern)`** — Write the literal text. Best for phrasal verbs (`"pick up :item"`), complex patterns (`"unlock :door with :key"`), and story-specific one-offs.
- **`.forAction(actionId)`** — Action-centric. Declare an action ID, then attach verb aliases and pattern templates. Each (verb, pattern) combination expands to a separate compiled rule. Best for standard verbs with synonyms.

### Pattern syntax

Patterns are strings tokenised by whitespace. Token types:

| Token form         | Meaning                                                         |
|--------------------|-----------------------------------------------------------------|
| `word`             | **Literal** — must appear verbatim                              |
| `word1\|word2`     | **Alternates** — any of the listed words matches                |
| `:slotname`        | **Slot** — captures a noun phrase / typed value                 |
| `:slotname...`     | **Greedy slot** — consumes tokens until end or next literal     |
| `[word]`           | **Optional literal** — may be present or absent (confidence penalty when absent) |
| `[word1\|word2]`   | **Optional alternates**                                         |

Examples:

```
"look at :target"
"put :item in|into|inside :container"
"unlock :door with :key"
"push :button [gently|firmly]"
"say :text..."                      // greedy text slot
```

Slot names are author-chosen; the action and the `.where()` / `.hasTrait()` calls refer to them.

### PatternBuilder (for `.define()`)

```
interface PatternBuilder {
    // Constraints
    hasTrait(slot, traitType) -> PatternBuilder              // preferred
    where(slot, constraint)   -> PatternBuilder              // advanced

    // Slot typing
    text(slot)          -> PatternBuilder                    // raw text, single token
    instrument(slot)    -> PatternBuilder                    // resolve entity, store as instrument
    number(slot)        -> PatternBuilder                    // typed integer
    ordinal(slot)       -> PatternBuilder                    // 1st, first
    direction(slot)     -> PatternBuilder                    // n / north / up / ...
    time(slot)          -> PatternBuilder                    // HH:MM
    manner(slot)        -> PatternBuilder                    // adverb → command.manner
    quotedText(slot)    -> PatternBuilder                    // text in double quotes
    topic(slot)         -> PatternBuilder                    // conversation topic (multi-word)
    fromVocabulary(slot, category) -> PatternBuilder         // story-defined vocabulary

    // Action and priority
    mapsTo(actionId)    -> PatternBuilder
    withPriority(n)     -> PatternBuilder

    // Semantic mappings
    withSemanticVerbs(verbMap)           -> PatternBuilder
    withSemanticPrepositions(prepMap)    -> PatternBuilder
    withSemanticDirections(directionMap) -> PatternBuilder
    withDefaultSemantics(defaults)       -> PatternBuilder

    build() -> GrammarRule
}
```

### ActionGrammarBuilder (for `.forAction()`)

Action-centric: declare an action once, attach verbs and patterns, let the builder enumerate (verb × pattern) combinations.

```
interface ActionGrammarBuilder {
    verbs(verbList)                     -> ActionGrammarBuilder
    pattern(patternTemplate)            -> ActionGrammarBuilder
    patterns(patternTemplates)          -> ActionGrammarBuilder
    directions(directionMap)            -> ActionGrammarBuilder
    hasTrait(slot, traitType)           -> ActionGrammarBuilder
    where(slot, constraint)             -> ActionGrammarBuilder
    withPriority(n)                     -> ActionGrammarBuilder
    withDefaultSemantics(defaults)      -> ActionGrammarBuilder
    slotType(slot, type)                -> ActionGrammarBuilder
    build() -> Void                     // adds all generated rules
}
```

Expansion rules:

- `.verbs(['push', 'press']).pattern(':target')` → two rules: `"push :target"`, `"press :target"`.
- `.verbs(['push']).patterns([':target', ':target :direction'])` → `"push :target"`, `"push :target :direction"`.
- `.verbs(['push', 'press']).patterns([':target', ':target :direction'])` → 4 rules: cartesian product.
- `.directions({ 'north': ['north', 'n'] })` → `"north"`, `"n"` — standalone direction rules with direction semantics attached. No verb required.

`.directions()` is independent from `.verbs()`. Use it for motion commands (`"north"`, `"n"`) where the direction word is the whole utterance.

### Slot constraint DSL

A slot may carry an **entity constraint** (default), a **typed value type**, or a **vocabulary category**.

#### Trait-based constraint

```
.hasTrait(slot, traitType)
```

Equivalent to "entity must have trait X". This is the preferred API — clear and maps directly to the trait catalogue (`02-world-model.md`).

```
grammar.define('board :target')
    .hasTrait('target', TraitType.ENTERABLE)
    .mapsTo('if.action.entering')
    .build();
```

#### Scope / property / function constraint

```
.where(slot, constraint)
```

`constraint` is one of:

- **PropertyConstraint** — `{ propertyName: expectedValue }`. Compared against entity fields.
- **FunctionConstraint** — `(entity, context) -> Boolean`.
- **ScopeConstraintBuilder** — `scope => scope.touchable().hasTrait(...)`.

```
grammar.define('lower :target')
    .where('target', scope => scope.touchable())
    .mapsTo('if.action.lowering')
    .build();

grammar.define('attack :enemy with :weapon')
    .where('enemy',  scope => scope.visible().hasTrait(TraitType.COMBATANT))
    .where('weapon', scope => scope.carried().hasTrait(TraitType.WEAPON))
    .mapsTo('if.action.attacking')
    .build();
```

#### Scope builder

```
interface ScopeBuilder {
    visible()    -> ScopeBuilder         // entity is visible to actor
    touchable()  -> ScopeBuilder         // visible AND reachable
    carried()    -> ScopeBuilder         // in actor's inventory
    nearby()     -> ScopeBuilder         // visible + adjacent rooms
    matching(constraint)  -> ScopeBuilder   // add property/function filter
    kind(kindName)        -> ScopeBuilder   // shorthand for matching({ kind })
    hasTrait(traitType)   -> ScopeBuilder   // require trait
    orExplicitly(ids)     -> ScopeBuilder   // whitelist specific entity IDs
    orRule(ruleId)        -> ScopeBuilder   // pull in a registered scope rule
    build() -> ScopeConstraint
}
```

The builder starts with `base: 'all'`; the first call among `.visible()/.touchable()/.carried()/.nearby()` narrows the base scope.

#### Typed value slots (ADR-082)

```
.number('count')        // digits or number words (1, 29, one, twenty)
.ordinal('rank')        // 1st, first, 2nd, second
.direction('dir')       // n, north, up, down, etc.
.time('clock')          // HH:MM
.manner('how')          // adverb → command.manner
.quotedText('phrase')   // "text in quotes"
.topic('subject')       // one or more words
```

Typed slots contribute `TypedSlotValue` records to `ParsedCommand.typedSlots`:

```
TypedSlotValue =
    | { type: 'direction', direction, canonical }
    | { type: 'number', value, word }
    | { type: 'ordinal', value, word }
    | { type: 'time', hours, minutes, text }
    | { type: 'manner', word }
    | { type: 'quoted_text', text }
    | { type: 'topic', words: List<String> }
    | { type: 'vocabulary', word, category }
```

#### Text slots

```
.text('message')        // single-token raw text
```

Use `:slotname...` in the pattern for greedy (multi-token) text capture:

```
grammar.define('say :text...')
    .mapsTo('story.action.say')
    .build();
```

Text slots land in `ParsedCommand.textSlots` (a map of slot name → captured string).

#### Vocabulary slots

```
.fromVocabulary(slot, categoryName)
```

Used with `VocabularyProvider.define(categoryName, { words, when? })` to scope a slot to a curated word list. Useful for puzzle-specific vocabulary:

```
// Register the category
vocab.define('panel-colors', {
    words: ['red', 'yellow', 'mahogany', 'pine'],
    when: (ctx) => ctx.currentLocation === insideMirrorId
});

// Use in grammar
grammar.define('push :color panel')
    .fromVocabulary('color', 'panel-colors')
    .mapsTo('story.action.push_panel')
    .build();
```

A vocabulary category's `when` predicate scopes availability (e.g., only inside a specific room). Vocabulary slots contribute `GrammarVocabularyMatch` records to `ParsedCommand.vocabularySlots`.

#### Instrument slot

```
.instrument(slot)
```

Same as an entity slot, but the resolved entity is stored in `ParsedCommand.instrument` (rather than `directObject` / `indirectObject`). Used for `"with X"` / `"using X"` clauses.

```
grammar.define('attack :enemy with :weapon')
    .instrument('weapon')
    .hasTrait('enemy', TraitType.COMBATANT)
    .hasTrait('weapon', TraitType.WEAPON)
    .mapsTo('if.action.attacking')
    .build();
```

### Priority system

Default priorities (stdlib conventions):

| Range     | Meaning                                                     |
|-----------|-------------------------------------------------------------|
| 90        | Abbreviations (`l` → look)                                  |
| 95        | Synonyms / alternatives                                     |
| 100       | **Default**: standard stdlib patterns                       |
| 100+      | Semantic rules with trait constraints (match before fallback) |
| 150+      | Story-specific patterns (override stdlib for the same input)|
| 200+      | Story overrides that must beat typed patterns               |

A pattern with higher priority wins over a lower-priority pattern that matches the same input. Priority is set with `.withPriority(n)` on the pattern builder, or on the action builder for `.forAction()` (applies to every generated rule).

### Semantic mappings

Grammar can carry semantic hints into the action:

```
.withSemanticVerbs({ 'push': { manner: 'normal' },
                     'shove': { manner: 'forceful' },
                     'nudge': { manner: 'careful' } })

.withSemanticPrepositions({ 'in': 'in', 'into': 'in',
                            'on': 'on', 'onto': 'on' })

.withSemanticDirections({ 'n': 'north', 'ne': 'northeast', ... })

.withDefaultSemantics({ manner: 'normal' })
```

Semantic hints flow into `PatternMatch.semantics` and may be exposed to actions via `ActionContext.command.semantics` (see `05-engine.md`).

`SemanticProperties` includes `manner`, `spatialRelation`, `direction`, `implicitPreposition`, `implicitDirection`, plus arbitrary custom properties.

---

## Compiled pattern representation

After `build()`, each rule compiles to:

```
GrammarRule {
    id:               String                           // auto-generated
    pattern:          String                           // source text
    compiledPattern:  CompiledPattern
    slots:            Map<SlotName, SlotConstraint>
    action:           ActionId
    priority:         Integer
    semantics?:       SemanticMapping
    defaultSemantics?: SemanticProperties
    experimentalConfidence?: Number                    // multiplier on match confidence
}

CompiledPattern {
    tokens:     List<PatternToken>
    slots:      Map<SlotName, TokenIndex>              // which token position is which slot
    minTokens:  Integer
    maxTokens:  Integer
}

PatternToken {
    type:       "literal" | "slot" | "alternates"
    value:      String
    alternates?: List<String>
    optional?:  Boolean
    slotType?:  SlotType
    greedy?:    Boolean
    vocabularyCategory?: String
}

SlotConstraint {
    name:               String
    constraints:        List<Constraint>
    traitFilters?:      List<TraitTypeId>
    slotType?:          SlotType                       // default ENTITY
    vocabularyCategory?: String
}
```

The compiled form is what the grammar engine consumes. A conforming implementation MAY choose a different compiled representation (regex, finite-state matcher, etc.) provided it handles alternates, optionals, greedy slots, and typed slots correctly.

---

## When to use each API

Decision tree:

```
Is it a new verb that needs multi-word phrasing (e.g., "pick up", "look at")?
    YES → .define(pattern) — phrasal verbs require explicit patterns
    NO  ↓

Does the verb have synonyms that share the same pattern(s)?
    YES → .forAction(actionId).verbs([...]).pattern(...) — action-centric
    NO  ↓

Is this a complex pattern with multiple slots (e.g., "unlock X with Y")?
    YES → .define(pattern) — explicit pattern is clearer
    NO  ↓

Is this a story-specific one-off?
    YES → .define(pattern) with .withPriority(150+)
    NO  → .forAction(actionId).pattern(:target).build()
```

Rule of thumb:

- `.forAction()` is preferred for standard verbs with `N` synonyms mapping to 1 or few pattern shapes.
- `.define()` is preferred for phrasal verbs, complex multi-slot patterns, and story-specific vocabulary.

---

## Event / Command Catalog

The grammar subsystem emits no semantic events. It produces `PatternMatch` records internally and feeds the parser. Debug events (if enabled) MAY be emitted per `pattern_match` system event (subsystem: `"parser"`).

---

## Extension Points

1. **Story grammar extension** — `parser.getStoryGrammar()` returns a `GrammarBuilder` scoped to story-specific rules. Stories MAY register patterns at any priority.
2. **Custom vocabulary categories** — `vocabulary.define(category, { words, when })` + `.fromVocabulary(slot, category)`.
3. **Custom slot types** — Extension authors MAY add new `SlotType` values and implement the slot consumer (requires a change to the parser's slot-consumer set in a locale package).
4. **Custom semantic property keys** — `SemanticProperties` has `[key: string]: any` open map; stories MAY attach arbitrary keys.
5. **Experimental confidence multipliers** — `experimentalConfidence` on a rule nudges match confidence up or down; useful for A/B testing grammar changes without removing the old patterns.

---

## Mandatory vs Optional

| Feature                                      | Required | Notes |
|----------------------------------------------|----------|-------|
| `.define(pattern)` builder                   | **Required** |       |
| `.forAction(actionId)` builder (ADR-087)     | **Required** |       |
| Slot syntax `:slotname`                      | **Required** |       |
| Alternates `word1\|word2`                    | **Required** |       |
| Optional elements `[word]`                   | Recommended |       |
| Greedy slot `:slotname...`                   | Recommended |       |
| Trait-based constraint (`.hasTrait`)         | **Required** |       |
| Function constraint (`.where` with function) | **Required** |       |
| Scope builder (`.visible/.touchable/…`)       | **Required** |       |
| Typed slots (number, ordinal, direction, time) | Recommended | Needed if the game uses numbers or time |
| Manner slot                                   | Optional |       |
| Vocabulary slots (`.fromVocabulary`)          | Optional | Needed for curated puzzle vocabulary |
| Quoted-text / topic slots                     | Optional | Needed for say / tell patterns |
| Priority system                               | **Required** | Arbitration when multiple rules match |
| Semantic mappings (verb/preposition/direction) | Recommended | Enables semantic-aware actions (ADR-054) |
| Story grammar extension                       | **Required** |       |
| Compiled-pattern caching                      | **Required** | Don't recompile per input |

---

## Implementation Notes

**ADR-054 (Accepted)** — Semantic grammar. Grammar can carry semantic properties (manner, spatial relation, direction) alongside structural match data. Actions consume these via `ActionContext.command.semantics`.

**ADR-080 (Accepted)** — Raw text / multi-object slots. `text()`, `:slot...` greedy, multi-object handling (`all`, `X and Y`, `all but X`), and the `instrument()` slot marker are all from this ADR.

**ADR-087 (Accepted)** — Action-centric grammar. The preferred API for standard verbs. Replaces the earlier pattern of calling `.define('push :target').mapsTo(…)` N times for N synonyms.

**ADR-088 (Accepted)** — Grammar engine refactor. The engine compiles patterns once and matches them against token streams with confidence scoring and partial-match tracking. A conforming implementation MAY use a different matcher (regex, NFA) if it preserves the observable behaviour.

**Priority conventions** — Stdlib patterns use 90 (abbreviations), 95 (synonyms), 100 (standard). Stories override with 150+. The exact numbers are a recommendation; what matters is (a) the total ordering works, and (b) stories can cleanly override stdlib.

**Deprecated slot types** — `adjective(slot)` and `noun(slot)` are deprecated in favour of `.fromVocabulary(slot, category)`. New grammar SHOULD use the vocabulary category mechanism.

**Pattern compilation** — The reference implementation uses `english-pattern-compiler.ts`. The language-neutral `PatternCompiler` interface is in `if-domain`. A locale package MAY provide its own compiler if it needs language-specific parsing (e.g., inflection handling).

---

## Glossary (local)

- **Pattern** — The text template an author writes (`"push :target"`).
- **Compiled pattern** — The internal representation of a pattern after `build()`.
- **Slot** — A placeholder in a pattern (`:target`).
- **Slot type** — The kind of value a slot captures: entity (default), text, typed value, or vocabulary word.
- **Constraint** — A predicate attached to a slot (scope, trait, property, function).
- **Priority** — Integer ordering used when multiple patterns match the same input.
- **Semantic mapping** — Grammar hints carried through to the action (verb→manner, prep→relation, etc.).

A full glossary will be produced in Phase 8.

---

*End of 04-grammar.md*
