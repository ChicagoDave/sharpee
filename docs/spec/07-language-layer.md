# Sharpee Language Layer Specification

**Subsystem**: Language Implementation — per-locale contract supplying parser vocabulary and text templates
**Prerequisites**: `01-data-model.md` (semantic event envelope), `06-stdlib.md` (message-ID protocol)
**Consumed by**: `03-parser.md` (vocabulary), `08-text-service.md` (templates + formatters)
**Version**: 1 (derived from code as of 2026-04-16)

---

## Purpose

The language layer is the single per-locale component of the Sharpee platform. Everything else — engine, world model, stdlib, parser internals, text service — is locale-neutral. A `LanguageProvider` supplies a locale's:

1. **Parser vocabulary** — verbs, directions, articles, prepositions, conjunctions, number words, pronouns.
2. **Message templates** — keyed by message ID, rendered by the text service.
3. **Narrative perspective** — first / second / third person configuration.
4. **Formatters** — pluggable transforms for template placeholders (articles, lists, pluralisation).
5. **Word helpers** — lemmatisation, abbreviation expansion, article selection, pluralisation.
6. **Grammar patterns** — locale-specific sentence shapes the parser accepts.
7. **Action help / documentation** — human-readable descriptions, examples.
8. **Ignore words** — words the parser should drop during tokenisation.

Because the language layer straddles parser and text service, it is a core architectural piece. Swapping it (to, say, French or German) replaces all locale-dependent behaviour without changing upstream code. If a language layer is not present, the platform has no verbs, no prose, and no player-facing text.

---

## Invariants

1. **One LanguageProvider per session.** The engine installs exactly one provider at startup. It MAY be re-configured (narrative settings, added story messages) but never replaced mid-session in a conforming implementation.
2. **Stable interface, variable content.** The `LanguageProvider` interface is locale-neutral. The *content* it returns (verbs, templates, articles) is locale-specific.
3. **Message IDs are language-neutral.** A message ID (`if.action.taking.taken`) is the same across all locales. Only the template text differs.
4. **Vocabulary is canonicalised.** Each vocabulary entry carries a canonical form (lowercase, lemmatised) alongside display variants. The parser matches against canonical forms.
5. **Templates are pure data.** A template is a string with placeholders. It MUST NOT execute code. All logic lives in formatters.
6. **Formatters are pure functions.** `(value, context) → string`. Idempotent. No side effects.
7. **Narrative perspective is global.** The provider's `NarrativeContext` applies to every template expansion during the session. Placeholders (`{You}`, `{take}`) resolve uniformly.
8. **Entity name resolution uses the world model.** The language provider resolves entity display names via `setEntityLookup(fn)` — the language layer does not own entity data.
9. **Story extensions are additive.** `addMessage / addActionHelp / registerFormatter` add to the provider; they do not replace core-locale data silently.
10. **Unknown message IDs produce errors visible to the player.** `getMessage(unknown)` returns a sentinel (e.g., the ID itself in brackets) that the text service surfaces as an error block. Silent empty returns are forbidden.

---

## Architectural Role

```
                      ┌──────────────────────────┐
                      │     LanguageProvider     │
                      │  (per-locale data stack) │
                      └──────────┬───────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
                 ▼                               ▼
          ┌───────────┐                  ┌───────────────┐
          │  Parser   │                  │ Text Service  │
          │  (locale) │                  │  (neutral)    │
          └─────┬─────┘                  └───────┬───────┘
                │                                │
     consumes:                         consumes:
     - getVerbs()                      - getMessage()
     - getDirections()                 - getNarrativeContext()
     - getSpecialVocabulary()          - formatters
     - getPrepositions()               - getAllMessages()
     - getDeterminers()                - getActionHelp()
     - getConjunctions()
     - getNumbers()
     - getGrammarPatterns()
     - getCommonAdjectives()
     - getCommonNouns()
     - lemmatize()
     - expandAbbreviation()
     - isIgnoreWord()
     - getEntityName()
```

The parser's `setWorldContext` lets the parser contribute entity names/aliases back, but the vocabulary structure (verb tables, direction mappings, article rules) is the language provider's responsibility.

---

## Public Contract

### LanguageProvider interface (base)

Every locale MUST provide:

```
interface LanguageProvider {
    languageCode:   String              // BCP-47 tag ("en-US", "fr-FR", "de-DE")
    languageName?:  String              // human-readable
    textDirection?: "ltr" | "rtl"

    // Messages (consumed by text service)
    getMessage(messageId, params?) -> String
    hasMessage(messageId) -> Boolean
    getAllMessages?() -> Map<String, String>

    // Action documentation
    getActionPatterns(actionId) -> List<String>?
    getActionHelp?(actionId) -> ActionHelp?
    getSupportedActions?() -> List<String>
}

ActionHelp {
    description: String
    verbs:       List<String>
    examples:    List<String>
    summary?:    String              // "VERB/VERB - Description. Example: COMMAND"
}
```

### ParserLanguageProvider interface (extends LanguageProvider)

Locales that drive a parser (practically every real locale) extend the base interface:

```
interface ParserLanguageProvider : LanguageProvider {
    // Vocabulary
    getVerbs()            -> List<VerbVocabulary>
    getDirections()       -> List<DirectionVocabulary>
    getSpecialVocabulary() -> SpecialVocabulary
    getPrepositions()     -> List<String>
    getDeterminers()      -> List<String>
    getConjunctions()     -> List<String>
    getNumbers()          -> List<String>
    getCommonAdjectives() -> List<String>
    getCommonNouns()      -> List<String>
    getGrammarPatterns()  -> List<LanguageGrammarPattern>

    // Word helpers
    lemmatize(word)                     -> String
    expandAbbreviation(abbrev)          -> String?
    formatList(items, conjunction)      -> String      // "a, b, and c"
    getIndefiniteArticle(noun)          -> String      // "a" | "an"
    pluralize(noun)                     -> String
    isIgnoreWord(word)                  -> Boolean

    // Entity
    getEntityName(entity) -> String

    // Fallback adapters (optional)
    getVerbMappings?()         -> Map<ActionId, List<String>>
    getVerbPattern?(actionId)  -> String?
    getDirectionMappings?()    -> Map<String, List<String>>
    getPronouns?()             -> List<String>
    getAllWords?()             -> List<String>
    getExceptWords?()          -> List<String>
    getArticles?()             -> List<String>
}
```

### Vocabulary shapes

```
VerbVocabulary {
    actionId:      ActionId              // "if.action.taking"
    verbs:         List<String>          // ["take", "get", "grab"]
    pattern?:      String                 // grammar hint (e.g., "VERB_OBJ")
    prepositions?: List<String>           // verb-specific prepositions
}

DirectionVocabulary {
    canonical: String                    // "north"
    aliases:   List<String>              // ["n", "north", "N"]
    reverse?:  String                    // "south" (opposite direction)
}

SpecialVocabulary {
    pronouns:   List<String>             // ["it", "them", "him", "her", ...]
    articles:   List<String>             // ["a", "an", "the"]
    allWords:   List<String>             // ["all", "every", "everything"]
    exceptWords: List<String>            // ["except", "but"]
    // Other special categories MAY be added per locale
}

LanguageGrammarPattern {
    name:     String                     // e.g., "VERB_OBJ_PREP_OBJ"
    pattern:  String                     // template shape
    example:  String                     // "put lamp on table"
    priority: Integer
}
```

### Message template syntax

Templates are strings with three kinds of placeholders:

#### 1. Simple placeholders

```
"You take the {item}."
```

Resolved from `params.item`. No transformation.

#### 2. Formatted placeholders (ADR-095)

```
"{a:item}"             → "a brass lantern" / "an apple" / "Excalibur"
"{items:list}"         → "a sword, a shield, and an axe"
"{item:capitalize}"    → "Lantern"
"{item:capitalize:a}"  → chained formatters
```

Syntax: `{formatter:key}` or `{formatter:subformatter:key}`. Formatter chains run left-to-right.

#### 3. Perspective placeholders (ADR-089)

```
"{You} take {the:item}."       → "You take the lantern." (2nd)
                                → "I take the lantern." (1st)
                                → "She takes the lantern." (3rd)

"{You} {take} {the:item}."     → verb-conjugated form
```

The language provider resolves perspective placeholders using its current `NarrativeContext`:

```
NarrativeContext {
    perspective:     "1st" | "2nd" | "3rd"     // default "2nd"
    playerPronouns?: PronounSet                 // used for 3rd-person
    tense?:          "present" | "past"         // default "present"
}
```

Core perspective placeholders:

| Placeholder         | 1st person   | 2nd person   | 3rd person (she/her)  |
|---------------------|--------------|--------------|------------------------|
| `{You}` / `{you}`   | I / i        | You / you    | She / she              |
| `{Your}` / `{your}` | My / my      | Your / your  | Her / her              |
| `{Yourself}`        | myself       | yourself     | herself                |
| `{take}` (verb conj)| take         | take         | takes                  |

Verb conjugation for 3rd-person uses the player's `ActorTrait.pronouns`. An implementation MAY hard-code common English verb forms; richer conjugation engines are optional.

### Formatters

Formatters are pluggable `(value, context) → String` functions registered under a name and invoked via `{name:key}` in templates. Core formatters a conforming English implementation SHOULD provide:

| Formatter    | Input                | Output                                    |
|--------------|----------------------|-------------------------------------------|
| `a`          | noun / entity        | indefinite article + name ("a sword")     |
| `an`         | noun / entity        | "an" form where required                  |
| `the`        | noun / entity        | definite article + name                   |
| `list`       | `List<String>`       | "a, b, and c"                             |
| `or`         | `List<String>`       | "a, b, or c"                              |
| `count`      | `List<Any>`          | "2 items" / "one item"                    |
| `capitalize` | `String`             | first letter uppercase                    |
| `upper`      | `String`             | all uppercase                             |
| `lower`      | `String`             | all lowercase                             |
| `plural`     | `String`, count      | pluralised form if count ≠ 1              |

Registration:

```
language.registerFormatter(name, (value, context) -> String)
```

The `FormatterContext` includes the full parameter map (so a formatter can consult other params), the narrative context, and an optional `EntityInfo` lookup for article-selection logic:

```
FormatterContext {
    params:        Map<String, Any>
    narrative:     NarrativeContext
    entityLookup?: (entityId) -> EntityInfo?
}

EntityInfo {
    name:         String
    nounType?:    "count" | "mass" | "proper"
    startsWithVowel?: Boolean
    pluralName?:  String
}
```

### Word helpers

| Method                              | Purpose                                       |
|-------------------------------------|-----------------------------------------------|
| `lemmatize(word)`                   | Reduce to base form ("running" → "run")       |
| `expandAbbreviation("x")`           | "x" → "examine"                               |
| `formatList(items, "and"/"or")`      | Oxford-comma list                             |
| `getIndefiniteArticle(noun)`        | "a" vs "an" selection                         |
| `pluralize(noun)`                   | Pluralisation (language-specific rules)       |
| `isIgnoreWord(word)`                | Parser filler ("the", "please") filter        |
| `getEntityName(entity)`             | Resolve display name (delegates to world)     |

A conforming implementation MUST provide these; trivial implementations (identity `lemmatize`, no abbreviations, empty ignore list) are acceptable for simple locales.

### Vocabulary adapters

Some locales expose vocabulary through simpler maps rather than the structured types above. Optional adapter methods:

```
getVerbMappings()         -> Map<ActionId, List<String>>
getDirectionMappings()    -> Map<DirectionName, List<String>>
getVerbPattern(actionId)  -> String?
getPronouns()             -> List<String>
getAllWords()             -> List<String>
getExceptWords()          -> List<String>
getArticles()             -> List<String>
```

The parser MAY call these as fallbacks when the structured accessors return empty.

---

## Message Organisation

Message IDs follow the namespace convention from `06-stdlib.md`:

```
<namespace>.<category>.<specific>

Examples:
    if.action.taking.taken
    if.action.opening.already_open
    scope.not_reachable
    scheduler.lantern.dies
    dungeo.thief.appears
```

Core namespaces:

| Namespace          | Contents                                      |
|--------------------|-----------------------------------------------|
| `if.action.*`      | Per-action success/failure messages           |
| `if.event.*`       | Event-level messages (rare)                   |
| `scope.*`          | Scope failure messages                         |
| `parser.error.*`   | Parser failure messages                        |
| `scheduler.*`      | Scheduler / daemon / fuse messages (ADR-071)  |
| `game.*`           | Lifecycle messages (banner, ending, etc.)     |
| `message.*`        | Generic message event text                    |

Stories add their own namespaces (`<story-id>.*`, e.g., `dungeo.*`).

### Story extensions

Stories register their own messages, help, and patterns after engine initialisation:

```
story.extendLanguage(language)
    → language.addMessage('dungeo.thief.appears', 'The thief slips in from the shadows.')
    → language.addActionHelp('dungeo.action.say', { description, verbs, examples })
    → language.addActionPatterns('dungeo.action.say', ['say', 'speak', 'utter'])
    → language.registerFormatter('currency', (zorkmids, ctx) => `${zorkmids} zorkmids`)
```

Extensions MAY NOT mutate core messages — they can only add. Overrides for existing message IDs are explicit: `addMessage` with an existing ID replaces the template; this is permitted but the platform SHOULD warn.

---

## i18n Boundary

This is the authoritative list of what is **locale-specific** vs **locale-neutral** across the platform.

### Locale-neutral (never changes between locales)

- Action IDs (`if.action.taking`)
- Event types (`if.event.taken`, `game.started`, `platform.save_requested`)
- Message IDs (`if.action.opening.opened`, `scope.not_reachable`)
- Event payload schema (field names, types, semantics)
- Block keys (`room.name`, `action.result`, `status.score`)
- Decoration type names (`item`, `room`, `em`, `strong`)
- Trait type IDs (`if.trait.openable`, `if.trait.lockable`)
- Capability IDs
- Scope levels (UNAWARE..CARRIED)
- Turn cycle phases
- ValidationResult shape
- ActionContext helpers
- Save envelope shape

### Locale-specific (varies per locale)

- Verb vocabulary and synonyms (`take / get / grab` in English)
- Direction words and abbreviations (`north / n` vs `nord / n` vs `北 / n`)
- Article selection rules (a / an / the; le / la / les; der / die / das)
- Pluralisation rules
- Lemmatisation
- Abbreviation expansion
- Common adjectives, nouns, prepositions, conjunctions
- Number words
- Grammar patterns (verb-object order, particle placement, adjective placement)
- Ignore words / filler words
- Message templates (the prose)
- Pronoun sets and conjugation
- Narrative perspective rendering

### Contract for a new locale

A new-locale implementation provides:

1. A `LanguageProvider` package (`lang-<locale>`) implementing the interface above with locale-specific content.
2. A `parser-<locale>` package (see `03-parser.md`) implementing the `Parser` interface with locale grammar patterns.
3. Grammar patterns defined using the language-neutral `GrammarBuilder` DSL (see `04-grammar.md`) but authored in the locale's word order.

It does NOT touch:
- `core`, `world-model`, `if-domain` (schema)
- `engine` (turn cycle)
- `stdlib` (actions, message-ID definitions)
- `text-service` (rendering pipeline)

This is the architectural promise of the language layer.

---

## Extension Points

1. **Story messages** — `language.addMessage(id, template)`.
2. **Story action help** — `language.addActionHelp(actionId, help)`.
3. **Story action patterns** — `language.addActionPatterns(actionId, patterns)`.
4. **Story formatters** — `language.registerFormatter(name, fn)` for domain-specific formatting (currencies, units, proper nouns with article exceptions).
5. **Entity lookup** — `language.setEntityLookup(fn)` so formatters can consult entity metadata for article selection, proper-noun handling, etc.
6. **Narrative settings override** — `language.setNarrativeSettings(...)` — the engine typically calls this once at startup, but a story MAY override for a cutscene or chapter.
7. **Custom vocabulary extensions** — Stories and extensions MAY call `parser.addVerb / addNoun / addAdjective / addPreposition` (see `03-parser.md`); these contribute additional vocabulary atop the language provider's base set.

---

## Mandatory vs Optional

| Feature                                         | Required | Notes |
|-------------------------------------------------|----------|-------|
| `languageCode` + `getMessage / hasMessage`      | **Required** |       |
| `getVerbs` / `getDirections` / `getSpecialVocabulary` | **Required** | Parser depends |
| `getPrepositions / getDeterminers / getConjunctions / getNumbers` | **Required** |  |
| Simple placeholder substitution                 | **Required** |       |
| Formatter registry with `{name:key}` syntax    | Recommended | Needed for clean article handling |
| `getIndefiniteArticle`                          | Recommended | May be trivial in some locales |
| `pluralize`                                     | Recommended |       |
| `lemmatize`                                     | Recommended | MAY be identity |
| `expandAbbreviation`                            | Recommended | MAY return null |
| `formatList`                                    | Recommended |       |
| `isIgnoreWord`                                  | Recommended |       |
| Narrative perspective placeholders (ADR-089)    | Recommended | Only if the locale supports 1st/3rd |
| `setNarrativeSettings`                          | **Required** | Even if only "2nd" is supported |
| Entity lookup for formatters (ADR-093)          | Recommended | Required for correct articles in most locales |
| Story message extension (`addMessage` etc.)     | **Required** |       |
| Visible sentinel on unknown message ID          | **Required** | No silent empty returns |
| `getAllMessages` for tooling                    | Optional |       |
| `getActionHelp`                                 | Recommended | Needed for HELP command |
| Vocabulary adapter methods (`getVerbMappings` etc.) | Optional |       |

---

## Implementation Notes

**ADR-023 (Accepted)** — Message system integration. All prose flows through messages with IDs. The `LanguageProvider.getMessage` interface is the canonical resolution point.

**ADR-028 (Accepted)** — Simplified language management. The reference implementation stores messages in a flat map keyed by full message ID; action messages are loaded from per-action language files at provider construction.

**ADR-066 (Accepted)** — Text snippets. Templates MAY compose reusable snippets; partially implemented.

**ADR-089 (Accepted)** — Pronoun and identity system. The language provider holds `NarrativeContext`; perspective placeholders resolve through it.

**ADR-091 (Accepted)** — Text decorations. Decoration syntax `[type:content]` and `*em*` / `**strong**` live in templates; parsing happens in the text service (see `08-text-service.md`).

**ADR-093 (Accepted)** — i18n entity vocabulary. Formatters use `entityLookup` to fetch entity metadata for correct article selection.

**ADR-095 (Accepted)** — Message templates with formatters. `{formatter:key}` syntax + `FormatterRegistry`.

**Divergence**. The reference English implementation (`lang-en-us`) uses a `FormatterRegistry` and supports chained formatters (`{a:item}`). Simpler locale implementations MAY omit the registry and hand-roll article selection in templates.

**ParserLanguageProvider vs LanguageProvider.** The base `LanguageProvider` is what the text service strictly needs; `ParserLanguageProvider` adds vocabulary methods the parser needs. A conforming locale MUST implement `ParserLanguageProvider` if the locale drives a parser. Locales used only for rendering (e.g., a hypothetical audio-only version with no parser) could provide the base interface only.

**Vocabulary contribution from the world.** Entity names and aliases flow into the parser via the `GrammarVocabularyProvider` (ADR-082) on the world model, NOT through the language provider. The language provider owns verbs and direction words; entity names come from entities.

**Message ID conventions** are defined in `06-stdlib.md`. Each action's `requiredMessages` array names the suffix IDs it emits; the language provider's per-action file supplies those templates. Tooling (engine introspection) can verify coverage.

---

## Glossary (local)

- **LanguageProvider** — Per-locale object supplying vocabulary + templates + formatters + narrative settings.
- **Message template** — String with placeholders, looked up by message ID.
- **Placeholder** — Simple `{item}`, formatted `{a:item}`, or perspective `{You}` / `{take}`.
- **Formatter** — Named pluggable function invoked in a template via `{name:key}`.
- **NarrativeContext** — Session-wide perspective + tense configuration.
- **Vocabulary** — Locale-specific word lists the parser uses (verbs, directions, prepositions, etc.).
- **EntityInfo** — Structured metadata about an entity used by formatters for article selection.

A full glossary is in `glossary.md`.

---

*End of 07-language-layer.md*
