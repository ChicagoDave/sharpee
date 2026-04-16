# Sharpee Parser Specification

**Subsystem**: Parser — input text → structured command
**Prerequisite**: `02-world-model.md` (scope primitives; entity name resolution)
**Version**: 1 (derived from code as of 2026-04-16)

---

## Purpose

The parser converts a line of natural-language input into a structured command that later phases can validate and execute. It operates in two logically distinct activities (ADR-004):

1. **Parse** — Grammar + vocabulary only. Emits a `ParsedCommand` describing *syntactic* structure. No world lookups except for scope-constrained slot resolution.
2. **Validate** — Resolves parsed object references to concrete entities, checks action availability and preconditions. Emits a `ValidatedCommand` consumed by action execution.

The parser is **locale-scoped**: all grammar patterns, vocabulary, and direction words live in a `parser-<locale>` package. The engine interacts only with the language-neutral `Parser` interface and the structured command types.

---

## Invariants

1. **No side effects.** `parse(input)` MUST NOT mutate the world model. It MAY read world state (for scope constraints) and MAY mutate parser-internal state (pronoun context, last-command cache).
2. **Information preservation (ADR-025).** The parser retains original input, character positions, part-of-speech candidates, and vocabulary alternatives. No information is silently discarded.
3. **Phase separation (ADR-004).** Parsing produces a `ParsedCommand` with *unresolved* references. Entity resolution happens in the validation phase.
4. **Deterministic pattern selection.** Given the same input, vocabulary, world snapshot, and pronoun context, the parser MUST always choose the same pattern.
5. **Pronoun authority is the parser.** "It / them / him / her" are resolved during parse, not during validation or execution. The pronoun context is updated after a *validated* command completes successfully (ADR-089).
6. **Ambiguity produces a failure, not a guess.** When multiple entities match a noun phrase with equal priority, the parser MUST emit `AMBIGUOUS_INPUT`. It MUST NOT silently pick one.
7. **Unknown vocabulary → typed error.** Input containing words not in the vocabulary produces a `ParseError` with a specific error code, not a generic "unknown command" blob.
8. **Command chaining is explicit.** Period-separated and comma-separated multi-commands are parsed into a list; the engine, not the parser, decides how to schedule them.

---

## Public Contract

### Parser interface

```
interface Parser {
    // Lifecycle
    setWorldContext(world, actorId, currentLocation)     // for scope-constrained slots
    setDebugCallback(callback?)                           // SystemEvent emission

    // Vocabulary
    registerVerbs(verbs)
    registerVocabulary(entries)
    addVerb(actionId, verbs, pattern?, prepositions?)
    addNoun(word, canonical)
    addAdjective(word)
    addPreposition(word)

    // Grammar
    getStoryGrammar() -> GrammarBuilder                   // for story-specific patterns

    // Parsing
    parse(input: String) -> Result<ParsedCommand, ParseError>
    parseChain(input: String) -> List<Result<ParsedCommand, ParseError>>

    // Pronoun tracking (ADR-089)
    updatePronounContext(command: ValidatedCommand, turnNumber)
    resetPronounContext()
    getLastCommand() -> ParsedCommand?
    registerPronounEntity(entityId, text, turnNumber)     // for actions that introduce entities

    // Diagnostics
    tokenize(input) -> List<Token>
}
```

A conforming implementation MUST provide `parse`, `tokenize`, `setWorldContext`, and the pronoun lifecycle methods. Vocabulary registration details MAY be implementation-specific.

### Token shape

```
Token {
    word:         String               // original word as typed
    normalized:   String               // lowercase / article-stripped
    position:     Integer              // character offset in input
    length:       Integer
    partOfSpeech: List<PartOfSpeech>   // overlapping candidates
    candidates:   List<TokenCandidate> // vocabulary matches
}

enum PartOfSpeech {
    VERB, NOUN, ADJECTIVE, ARTICLE, PREPOSITION, PRONOUN,
    DETERMINER, CONJUNCTION, UNKNOWN
}

TokenCandidate {
    id:         String                 // vocabulary ID
    type:       String                 // vocabulary category
    confidence: Number                 // [0.0, 1.0]
}
```

### ParsedCommand

```
ParsedCommand {
    rawInput:    String                      // exact input as typed
    tokens:      List<Token>
    structure: {
        verb:           VerbPhrase
        directObject?:  NounPhrase
        preposition?:   PrepPhrase
        indirectObject?: NounPhrase
    }
    pattern:     String                      // e.g., "VERB_NOUN_PREP_NOUN"
    confidence:  Number
    action:      String                      // action ID this pattern maps to

    // ADR-080: multi-object and text slots
    textSlots?:       Map<SlotName, String>
    excluded?:        List<NounPhrase>       // "all but X"
    instrument?:      NounPhrase             // "with/using/through X"

    // ADR-082: typed slots
    typedSlots?:      Map<SlotName, TypedSlotValue>
    vocabularySlots?: Map<SlotName, GrammarVocabularyMatch>
    manner?:          String                  // adverb from .manner() patterns

    extras?:     Map<String, Any>
}

VerbPhrase {
    tokens:     List<Integer>                // indices into ParsedCommand.tokens
    text:       String                        // original text, e.g., "look at"
    head:       String                        // main verb, "look"
    particles?: List<String>                  // ["at"]
}

NounPhrase {
    tokens:     List<Integer>
    text:       String                        // "the small red ball"
    head:       String                        // "ball"
    modifiers:  List<String>                  // ["small", "red"]
    articles:   List<String>                  // ["the"]
    determiners: List<String>                 // ["all", "every", "some"]
    candidates: List<EntityId>                // vocabulary matches for head noun

    // ADR-080: list / all / exclusion
    isAll?:     Boolean                       // true when "all" was the head
    isList?:    Boolean                       // true for "X and Y"
    items?:     List<NounPhrase>              // list members

    // ADR-089: resolved pronoun
    entityId?:  EntityId                      // when a pronoun resolved at parse-time
    wasPronoun?: Boolean

    // ADR-104: implicit inference
    // (reserved; optional)
}

PrepPhrase {
    tokens: List<Integer>
    text:   String                            // "in", "at", "with"
}
```

### ValidatedCommand

```
ValidatedCommand {
    parsed:          ParsedCommand
    actionId:        String                    // resolved action
    directObject?:   ValidatedObjectReference
    indirectObject?: ValidatedObjectReference
    instrument?:     ValidatedObjectReference
    metadata?: {
        validationTime?: Number
        warnings?:       List<String>
    }
}

ValidatedObjectReference {
    entity: IFEntity
    parsed: NounPhrase | ParsedObjectReference   // pre-resolution form
}
```

Entity resolution is the validator's responsibility, not the parser's. The parser MAY pre-resolve pronouns (setting `NounPhrase.entityId`), but validation completes the resolution against current scope.

### ParseError

```
ParseError {
    type:       "PARSE_ERROR"
    code:       ParseErrorCode
    messageId:  String              // for language-layer lookup
    message:    String              // fallback text
    input:      String
    position?:  Integer             // character offset of failure

    // Contextual
    verb?:          String
    failedWord?:    String
    slot?:          String          // which slot failed
    suggestion?:    String
    candidates?:    List<{ entityId: String, label: String }>  // for AMBIGUOUS_INPUT
}

enum ParseErrorCode {
    NO_VERB          // empty input or first token not a verb
    UNKNOWN_VERB     // first word not in vocabulary
    MISSING_OBJECT   // verb requires direct object
    MISSING_INDIRECT // verb requires indirect object
    ENTITY_NOT_FOUND // noun doesn't resolve to anything in scope
    SCOPE_VIOLATION  // noun resolves, but entity is out of scope
    AMBIGUOUS_INPUT  // multiple valid interpretations
    UNKNOWN_COMMAND  // legacy generic
    INVALID_SYNTAX   // legacy generic
}
```

### ValidationError

```
ValidationError {
    type:    "VALIDATION_ERROR"
    code:    "ENTITY_NOT_FOUND" | "ENTITY_NOT_VISIBLE" | "ACTION_NOT_AVAILABLE"
           | "PRECONDITION_FAILED" | "AMBIGUOUS_ENTITY"
    parsed:  ParsedCommand
    details?: Map<String, Any>
}
```

The distinction matters: `ParseError` means the parser couldn't extract a command structure; `ValidationError` means the command structure is well-formed but can't be resolved or executed in the current world.

---

## Processing Pipeline

```
input:String
   │
   ▼ (1) Split on periods/commas (optional chaining)
List<segment:String>
   │
   ▼ (2) Tokenize each segment
List<Token>
   │
   ▼ (3) Classify tokens against vocabulary
annotated tokens (POS candidates, vocab candidates)
   │
   ▼ (4) Find matching grammar patterns
List<PatternMatch>         ← best candidate selected by confidence + priority
   │
   ▼ (5) Resolve each slot against its scope constraint
   │     (may yield entity candidates for NounPhrase.candidates)
   │
   ▼ (6) Resolve pronouns ("it", "them", "him", "her")
   │     → NounPhrase.entityId (pre-resolved) when unambiguous
   │
   ▼ (7) Select best candidate
   │     (priority, confidence, disambiguation rules)
   │
   ▼
ParsedCommand   OR   ParseError (with best-failure analysis)
```

Partial match failures produced during step 4 are tracked and fed through `analyzeBestFailure(failures, input, hasVerb)` to emit a specific error code rather than a generic "unknown command" response (ADR-025).

### Step 1 — Command chaining

`parseChain(input)` splits input on periods and (conditionally) commas:

- **Period**: `"take sword. go north."` → `["take sword", "go north"]`. Periods inside quoted strings are preserved.
- **Comma**: split only if a recognised verb follows the comma.
  - `"take knife, drop lamp"` → `["take knife", "drop lamp"]` — verb detected after comma.
  - `"take knife, lamp"` → `["take knife, lamp"]` — no verb; a single command treats the comma as a list separator.

The single-command `parse(input)` is equivalent to `parseChain(input)[0]` when there is exactly one segment.

### Step 2 — Tokenization

Tokenisation splits on whitespace, preserves original casing in `word`, produces a normalised `normalized`, and records character position and length. Contractions and punctuation are locale-specific and handled by the locale parser.

### Step 3 — Classification

Each token is assigned all plausible parts of speech and all matching vocabulary entries. Tokens MAY have multiple interpretations (e.g., `"light"` as verb or noun); disambiguation happens during pattern matching.

### Step 4 — Pattern matching

The grammar engine tries compiled patterns against the token stream. Each attempt may succeed or produce a `PartialMatchFailure`:

```
PartialMatchFailure {
    pattern:         String              // e.g., "VERB :target"
    action:          String              // action ID the pattern mapped to
    progress:        Number              // 0.0..1.0
    tokensConsumed:  Integer
    reason:          "NO_TOKENS" | "VERB_MISMATCH" | "LITERAL_MISMATCH"
                   | "SLOT_FAILED" | "LEFTOVER_TOKENS" | "NOT_ENOUGH_TOKENS"
    matchedVerb?:    String
    slotFailure?:    SlotFailure
    failedAtToken?:  String
    expected?:       String
}

SlotFailure {
    slotName:            String
    attemptedText:       String
    reason:              "NO_MATCH" | "SCOPE_VIOLATION" | "AMBIGUOUS"
    unknownWord?:        String
    outOfScopeEntities?: List<EntityId>
    candidates?:         List<EntityId>
}
```

When no pattern fully matches, the parser calls `analyzeBestFailure(failures, input, hasVerb)` to choose which failure best explains the error, producing a typed `ParseError`.

### Step 5 — Slot resolution (scope evaluation)

Each pattern slot has a scope constraint (defined in the grammar DSL; see `04-grammar.md`). During parsing, the parser's **grammar scope resolver** evaluates the constraint against the current world context:

```
ScopeConstraint {
    base:             "all" | "visible" | "touchable" | "carried" | "nearby"
    filters:          List<PropertyConstraint | FunctionConstraint>
    traitFilters?:    List<TraitTypeId>
    explicitEntities: List<EntityId>
}

PropertyConstraint = Map<PropertyName, ExpectedValue>   // e.g., { isOpen: true }
FunctionConstraint = (entity, context) -> Boolean
```

The resolver produces a candidate list for each slot. A noun phrase's `candidates` field collects the entity IDs whose names or aliases match the head noun within the scope, filtered by modifiers.

### Step 6 — Pronoun resolution (ADR-089)

Pronouns are resolved during parsing against a `PronounContext`:

```
PronounContext {
    it:                EntityReference?         // last inanimate direct object
    them:              List<EntityReference>?   // last list / all / plural
    animateByPronoun:  Map<Pronoun, EntityReference>   // "him" / "her" / neopronouns
    lastCommand:       ParsedCommand?            // for "again" / "g"
}

EntityReference {
    entityId:   String
    text:       String
    turnNumber: Integer
}

RECOGNIZED_PRONOUNS = ["it", "them", "him", "her", "xem", "zir", "hir", "em", "faer"]
```

Resolution rules:

1. **"it"** — resolves to the most recent direct object that is *inanimate* (does not have an ActorTrait and whose `IdentityTrait` does not indicate animate grammatical number).
2. **"them"** — resolves to the most recent list (multi-object command), "all"-result, or plural-grammatical-number entity.
3. **"him" / "her" / neopronouns** — resolves to the most recent entity whose `ActorTrait.pronouns` matches the object-pronoun form used. `"her"` matches an entity whose pronouns are `she/her`; `"him"` matches `he/him`; neopronouns match the corresponding PronounSet.

When resolution is unambiguous the resolved entity ID is stored on `NounPhrase.entityId` and the validator accepts it without re-resolving. When a pronoun cannot resolve, the parser returns `ENTITY_NOT_FOUND` with `failedWord: "it"` (or the pronoun used).

**Context update timing**: The engine calls `parser.updatePronounContext(validatedCommand, turnNumber)` *after* a successful command. An action that fails (validation error, action rejection) does NOT update the pronoun context.

### Step 7 — Candidate selection & disambiguation

When a slot yields multiple entity candidates, the parser applies disambiguation rules (ADR-017 Proposed; current code implements the below):

1. **Exact match** beats partial match.
2. **Held items** (in actor inventory) beat items in the room for verbs that typically operate on held items (drop, examine, read).
3. **Proximity**: same container as actor > same room > other containers.
4. **Visibility**: directly visible > inside transparent closed container > inside opaque closed container.
5. **Recent interaction**: the entity most recently referenced wins ties.
6. **Scope priority** (per-action): `IFEntity.getScopePriority(actionId)` — higher wins. Default 100.

If disambiguation cannot settle on a single candidate, the parser emits `AMBIGUOUS_INPUT` with the candidate list and a suggestion prompt ("Which torch do you mean?"). The engine is responsible for turning this into a player query (ADR-018).

### Step 8 — Pattern priority resolution

When multiple patterns match with the same base confidence, priority determines which wins:

- **Story patterns** register with priority 150+.
- **Stdlib patterns** default to priority 100.
- Higher priority wins.

See `04-grammar.md` for the grammar builder's priority controls.

---

## Validation Phase

Validation is logically separate from parsing (ADR-004) but often executed in the same engine step. The validator:

1. Takes a `ParsedCommand`.
2. For each object reference with `candidates`, resolves to a single `IFEntity` using current world state and the disambiguation rules above. If `NounPhrase.entityId` is already set (pronoun pre-resolution), that entity is used directly.
3. Checks that the target action is available: the entity has the required trait, or a capability-dispatched trait is present, or the action is a meta-action that does not depend on a target.
4. Performs action-level preconditions that do NOT mutate state (e.g., "is this entity visible to the actor?").
5. Emits `ValidatedCommand` or `ValidationError`.

The reference implementation places validation in `CommandValidator` (stdlib). Details of validator behaviour are specified in `05-engine.md` (turn cycle) and `06-stdlib.md` (action four-phase contract).

---

## Vocabulary

The parser consumes vocabulary from two sources:

- **Language provider** (from `lang-<locale>`) supplies core verbs, articles, directions, prepositions, pronouns, special words.
- **World model** contributes entity names and aliases through a `GrammarVocabularyProvider` (ADR-082).

Vocabulary registration is incremental: new verbs, nouns, and adjectives MAY be added after parser initialisation (for story-specific vocabulary).

```
VocabularyEntry {
    word:       String
    partOfSpeech: PartOfSpeech
    canonical?: String          // canonicalised form for lookup
    metadata?:  Map<String, Any>
}

VerbVocabulary {
    actionId:      String
    verbs:         List<String>
    pattern?:      String       // e.g., "VERB_OBJ"
    prepositions?: List<String>
}
```

Abbreviation expansion is enabled by default (`expandAbbreviations: true`). Articles are preserved in token metadata but do not count as slot-heads.

---

## Event / Command Catalog

The parser does not emit game-visible events directly. It does emit *system* events (debug / diagnostic) via the callback installed with `setDebugCallback`. Typical system event types:

| Subsystem `"parser"` type   | Meaning                                    |
|-----------------------------|--------------------------------------------|
| `token_analysis`            | Token classification complete              |
| `pattern_match`             | A pattern was tried (success or failure)   |
| `candidate_scoring`         | Candidate disambiguation scoring           |

Platform debug events MAY also be emitted via a `platformEventEmitter` installed on the parser.

---

## Extension Points

1. **Story grammar** — `parser.getStoryGrammar().define(pattern).mapsTo(actionId).build()` adds patterns beyond stdlib. See `04-grammar.md`.
2. **Story vocabulary** — `addVerb / addNoun / addAdjective / addPreposition` for ad-hoc additions.
3. **Slot-consumer subclassing** — Custom slot consumers (e.g., for compound structures specific to a story) are registered through the grammar DSL's `.fromVocabulary()` hook.
4. **Scope constraints** — The `.where(slot, fn)` hook lets stories plug in arbitrary scope predicates. See `04-grammar.md`.
5. **Locale swap** — A non-English locale substitutes a different `parser-<locale>` package. The `Parser` interface is locale-neutral.
6. **Pronoun system** — The `PronounContextManager` MAY be replaced; neopronouns are supported via the `ActorTrait.pronouns` property.

---

## Locale Boundary

What is **locale-specific**:

- Grammar patterns (`parser-en-us/src/grammar.ts` for English)
- Verb conjugations and synonyms
- Direction words ("north", "n", "nord", "norte")
- Article handling ("the", "a", "an" vs "le", "la", "les")
- Pronoun lists
- Contraction handling

What is **locale-neutral**:

- `Parser` interface
- `ParsedCommand` / `ValidatedCommand` / `ParseError` / `ValidationError` shapes
- `Token`, `NounPhrase`, `VerbPhrase`, `PrepPhrase` shapes
- Scope constraint system
- Pattern matcher algorithm (input is compiled pattern + token stream)
- Pronoun context manager shape
- Action IDs (`if.action.taking`, `if.action.opening`, etc.)
- Message IDs emitted on parse failure

A conforming non-English locale MUST:

- Provide its own grammar patterns (in its grammar package).
- Provide verb/article/direction vocabulary.
- Implement any language-specific tokenisation rules.
- Continue to emit the same language-neutral `ParsedCommand` shape.

It MAY alter pronoun resolution if the target language's pronoun system is not covered by the `PronounSet` abstraction.

---

## Mandatory vs Optional

| Feature                              | Required | Notes |
|--------------------------------------|----------|-------|
| `parse(input) -> Result<ParsedCommand, ParseError>` | **Required** |       |
| Token with position / POS / candidates | **Required** | Information preservation (ADR-025) |
| Scope-constrained slot resolution    | **Required** |       |
| Partial-match failure analysis       | **Required** | So errors aren't generic |
| Pattern priority resolution          | **Required** |       |
| Pronoun context (it / them / him / her) | **Required** |       |
| Neopronoun support                   | Optional | Omit only if the locale doesn't support them |
| Command chaining (periods)           | **Required** |       |
| Comma chaining                       | Recommended |       |
| Story grammar extension              | **Required** | For custom verbs |
| Abbreviation expansion               | Recommended |       |
| Debug-event emission                 | Optional |       |
| Multi-object slots (ADR-080)         | Recommended | Needed for "take all", "X and Y" |
| Typed slots (numbers, directions; ADR-082) | Recommended |       |
| `parseChain` returning multiple commands | Recommended |       |
| Disambiguation rules                 | **Required** | Specific rule set is recommended; behaviour (never silent-pick) is required |

---

## Implementation Notes

**ADR-004 (Accepted)** — Parse / Validate / Execute separation is implemented. The parser sits in `parser-en-us`; validation is in stdlib (`CommandValidator`); execution is in engine + stdlib actions.

**ADR-017 (Proposed)** — Disambiguation strategy. The ADR itself is Proposed, but the reference implementation implements a pragmatic subset (exact match, held items, proximity, visibility, recency, scope priority). A conforming implementation MUST never silently pick among equal candidates; the specific rule order is a recommendation.

**ADR-025 (Accepted)** — Rich information preservation. `ParsedCommand.tokens` and `ParsedCommand.rawInput` retain full source fidelity. Error messages consume this to produce specific, position-aware diagnostics.

**ADR-027 (Accepted)** — Parser package architecture. The parser lives in its own package (`parser-en-us`) with no dependency on stdlib. It depends only on `if-domain` (grammar types), `core`, and `world-model` (for scope + entity access).

**ADR-036 (Accepted)** — Parser contracts live in `if-domain`. The `Parser` interface, grammar builder types, vocabulary adapters, and compiled-pattern shapes are all defined there; locale parsers implement them.

**ADR-065 (Accepted)** — Grammatical-semantic translation. The parser produces purely grammatical output (`ParsedCommand`); the validator converts grammar to semantics (action + resolved entities). This separation is what makes multi-locale support tractable.

**ADR-080 (Accepted)** — Multi-object patterns (`all`, `X and Y`, `all but X`) are represented in `NounPhrase` via `isAll`, `isList`, `items`, `excluded`. Instrument extraction (`with/using/through`) is separate from indirectObject.

**ADR-082 (Accepted)** — Typed slots (numbers, ordinals, directions, vocabulary matches). `ParsedCommand.typedSlots` and `ParsedCommand.vocabularySlots` carry these through to validation/execution.

**ADR-087 (Accepted)** — Action-centric grammar builder. See `04-grammar.md`.

**ADR-089 (Accepted)** — Pronoun / identity system. Pronoun resolution happens in the parser; the validator receives pre-resolved entity IDs on `NounPhrase.entityId`. `updatePronounContext(validatedCommand, turnNumber)` is called by the engine after successful execution.

**ADR-104** — Implicit inference. Reserved slot on `NounPhrase` for pronouns that resolved via inference (e.g., "light" → "light the lamp because you're holding one lamp and it's unlit"). Not broadly implemented.

---

## Glossary (local)

- **ParsedCommand** — Output of the parse phase; structural but entity-unresolved (in general).
- **ValidatedCommand** — Output of the validation phase; has resolved entity references and an actionId.
- **Slot** — A placeholder in a grammar pattern, e.g., `:target` in `push :target`.
- **Scope constraint** — A predicate attached to a slot that filters which entities are valid fills.
- **Pronoun context** — Parser-local memory of recent entity references, used for "it / them / him / her" resolution.
- **Partial-match failure** — Diagnostic record produced when a pattern fails mid-match; used to generate precise error messages.

A full glossary will be produced in Phase 8.

---

*End of 03-parser.md*
