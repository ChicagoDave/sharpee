# Sharpee Platform-Agnostic Specification

**A language-neutral description of the Sharpee interactive-fiction platform.**

These seven documents describe the platform sufficiently for a competent engineer to re-implement it in any language. Where the current TypeScript source diverges from an ADR, the spec follows the code and flags the divergence.

- **Derived from code as of**: 2026-04-16
- **Implementation reference**: `packages/*/src/` in this repository
- **Policy**: code is the source of truth; ADRs provide context and rationale

---

## Documents

| # | Document | Subsystem | Depends on |
|---|----------|-----------|------------|
| 1 | [Data Model & Storage](01-data-model.md) | Entity / trait / save envelope / event shapes | — |
| 2 | [World Model](02-world-model.md) | Entity lifecycle, trait catalog, capability dispatch, scope, darkness | 1 |
| 3 | [Parser](03-parser.md) | Tokenisation, scope resolution, pronouns, disambiguation | 2, 7 |
| 4 | [Grammar DSL](04-grammar.md) | Pattern definition API, slot constraints, priority | 3 |
| 5 | [Engine](05-engine.md) | Turn cycle, command pipeline, scheduler, plugins, save/restore | 1–4 |
| 6 | [Standard Library](06-stdlib.md) | Four-phase action contract, 49-action catalog, message IDs | 1–5, 7 |
| 7 | [Language Layer](07-language-layer.md) | LanguageProvider: vocabulary, templates, narrative, formatters | 1, 6 |
| 8 | [Text Service](08-text-service.md) | Event → TextBlock rendering pipeline | 1, 5, 6, 7 |
| — | [Glossary](glossary.md) | Domain terms used across specs | — |

The language layer (7) is a peer subsystem consumed by both the parser (3) and the text service (8). Everything else is locale-neutral.

---

## Reading Orders

### For a re-implementor (porting to a new language)

Read roughly in order 1 → 8. Each document establishes primitives the next one uses. Focus first on:

1. **Data Model** — the fixed shapes that cross every boundary.
2. **World Model** — the operations every other subsystem needs.
3. **Engine turn cycle** (5, skim) — the overall flow.
4. **Standard Library contract** (6, first half) — the four-phase pattern.
5. **Language Layer** (7) — the peer contract that parser and text-service both consume.

Then fill in the rest as you build each subsystem.

### For a language-port author (new locale)

Focus on:

1. **Language Layer** (7) — the primary target. Your `lang-<locale>` package implements the `LanguageProvider` / `ParserLanguageProvider` interface. This is where most of the work lives.
2. **Parser** (3) — especially the Locale Boundary section. Your `parser-<locale>` package implements the same `Parser` interface using your language provider's vocabulary.
3. **Grammar DSL** (4) — write locale grammar patterns using the same builder.
4. **Text Service** (8) — especially the Decoration syntax and block-key conventions. You do NOT write a new text service; you supply the templates the existing service consumes through your language provider.
5. **Standard Library** (6) — the message-ID catalog. Every `if.action.*.<suffix>` ID needs a template in your language provider.

You do **not** need to touch the engine, world model, stdlib, or text service. The locale boundary is airtight: action IDs, event types, block keys, message IDs, trait type IDs are all language-neutral.

### For an extension / story author

Focus on:

1. **World Model** (2) — especially the Capability Dispatch section and the Trait Catalog.
2. **Grammar DSL** (4) — for story-specific commands.
3. **Standard Library** (6) — especially Extension Points and the four-phase action contract.
4. **Engine** (5) — especially Plugins, Before-action hook, and InputModeHandler.
5. **Language Layer** (7) — `story.extendLanguage()`, custom messages, custom formatters.
6. **Text Service** (8) — custom block keys and decoration types for story-specific UI routing.

Skip the parser internals; you interact with it only via grammar definitions.

---

## Conformance Summaries

Minimum viable implementation per subsystem. A conforming implementation MUST provide these; everything else is recommended or optional.

### 1. Data Model

- Entity shape (`id`, `type`, `attributes`, `relationships`)
- Trait composition with trait-type uniqueness per entity
- Spatial index with single-parent invariant
- Typed relationships beyond containment
- Capability store (keyed off-entity state)
- Semantic event envelope (`id`, `type`, `timestamp`, `entities`, `data?`)
- Append-only event log
- Deterministic replay (seeded RNG captured in save)
- Save envelope round-trip
- Client-provided save/restore hooks
- Platform events for save/restore/quit/restart/undo
- Story metadata with IFID (Treaty of Babel)

### 2. World Model

- Entity lifecycle (`createEntity`, `getEntity`, `removeEntity`)
- Spatial move with containment-loop prevention
- Trait add/get/has/remove
- Name resolution (displayName > identity > attributes.name > id)
- Core traits (at minimum): Room, Container, Supporter, LightSource, Actor, Identity
- Scope levels UNAWARE..CARRIED
- Scope rules (conditional scope extension)
- Capability dispatch (ADR-090)
- AuthorModel (or equivalent setup bypass)

### 3. Parser

- `parse(input) -> Result<ParsedCommand, ParseError>`
- Token with position / POS / vocabulary candidates
- Scope-constrained slot resolution
- Partial-match failure analysis → specific error codes
- Pattern priority resolution
- Pronoun context (it / them / him / her)
- Story grammar extension
- Explicit disambiguation failure (`AMBIGUOUS_INPUT`) — never silent-pick

### 4. Grammar DSL

- `.define(pattern)` builder
- `.forAction(actionId)` action-centric builder
- Slot syntax `:slotname`
- Alternates `word1|word2`
- `.hasTrait(slot, traitType)`
- `.where(slot, constraint)` with scope builder
- Priority system
- Story grammar extension
- Compiled-pattern caching

### 5. Engine

- 13-phase turn cycle (parse → validate → before-action → four-phase → plugins → platform ops → text service → pronoun update → counter)
- `executeTurn(input) -> CommandResult` (turn or meta)
- Meta-command path (SAVE, RESTORE, QUIT, UNDO, AGAIN, SCORE, HELP, VERSION, ABOUT)
- Platform-operation dispatch (post-turn, pre-text-service)
- Four-phase action orchestration
- Lifecycle events (game.*, turn.*)
- Save/restore hooks
- Vocabulary manager (sync parser with world scope)
- Pronoun-context update after successful command
- Event source with handlers/validators/chains

### 6. Standard Library

- Four-phase contract (validate / execute / report / blocked) enforced by convention
- `ActionContext` with world / player / command / scope helpers
- `ScopeLevel` + `requireScope`
- `ValidationResult.data` flow between phases
- Message-ID protocol (no prose in events)
- Capability-dispatch check at start of validate
- Core action set: TAKE, DROP, OPEN, CLOSE, EXAMINE, LOOK, INVENTORY, GO, ENTER, EXIT, WAIT, SCORE, HELP, SAVE, RESTORE, QUIT, UNDO

### 7. Language Layer

- `LanguageProvider` with `languageCode`, `getMessage`, `hasMessage`, `addMessage`
- `ParserLanguageProvider` vocabulary (`getVerbs`, `getDirections`, `getSpecialVocabulary`, prepositions/determiners/conjunctions/numbers)
- Simple `{placeholder}` substitution in templates
- Narrative settings (even if only 2nd-person)
- Word helpers (`getIndefiniteArticle`, `pluralize`, `isIgnoreWord`)
- Story-message extension (`addMessage`, `addActionHelp`, `addActionPatterns`)
- Visible sentinel (no silent empty returns) for unknown message IDs

### 8. Text Service

- `processTurn(events) -> List<TextBlock>`
- Core block keys (`room.name`, `room.description`, `room.contents`, `action.result`, `action.blocked`, `error`, `prompt`)
- Decoration parsing (`[type:content]`)
- Specialised handlers (`command.failed`, `client.query`, `if.event.room.description`)
- Visible error block on unresolved message ID
- Locale neutrality (no hard-coded prose)

---

## Cross-Reference Index

Common concepts and where they are defined authoritatively:

| Concept                             | Authoritative location                             |
|-------------------------------------|----------------------------------------------------|
| Entity shape                        | [01 §Public Contract / Entity](01-data-model.md#entity) |
| Trait contract                      | [02 §Trait contract](02-world-model.md#trait-contract) |
| Spatial invariants                  | [02 §Invariants](02-world-model.md#invariants)     |
| Capability dispatch                 | [02 §Capability dispatch (ADR-090)](02-world-model.md#capability-dispatch-adr-090) |
| Scope levels                        | [02 §Scope system](02-world-model.md#scope-system) |
| `ParsedCommand` / `ValidatedCommand`| [03 §Public Contract](03-parser.md#public-contract)|
| Parser/validator separation         | [03 §Invariants](03-parser.md#invariants)          |
| Pattern priority conventions        | [04 §Priority system](04-grammar.md#priority-system) |
| Slot constraint DSL                 | [04 §Slot constraint DSL](04-grammar.md#slot-constraint-dsl) |
| Turn cycle                          | [05 §Turn Cycle](05-engine.md#turn-cycle-normative) |
| `TurnPlugin` contract               | [05 §TurnPlugin (ADR-120)](05-engine.md#turnplugin-adr-120) |
| Scheduler / daemons / fuses         | [05 §SchedulerService (ADR-071)](05-engine.md#schedulerservice-adr-071) |
| Meta-command catalog                | [05 §Meta-Commands](05-engine.md#meta-commands)    |
| Four-phase action contract          | [06 §Invariants / Public Contract](06-stdlib.md)   |
| Standard verb catalog (49 actions)  | [06 §Standard Verb Catalog](06-stdlib.md#standard-verb-catalog) |
| Message-ID protocol                 | [06 §Message-ID Protocol](06-stdlib.md#message-id-protocol) |
| `TextBlock` / decorations           | [08 §Public Contract](08-text-service.md#public-contract) |
| i18n boundary                       | [07 §i18n Boundary](07-language-layer.md#i18n-boundary) |
| `LanguageProvider` interface        | [07 §Public Contract](07-language-layer.md#public-contract) |
| Message template syntax             | [07 §Message template syntax](07-language-layer.md#message-template-syntax) |
| Formatters                          | [07 §Formatters](07-language-layer.md#formatters) |
| Narrative perspective               | [07 §Message template syntax](07-language-layer.md#message-template-syntax) |
| Event envelope                      | [01 §Event envelope](01-data-model.md#event-envelope) |
| Save envelope                       | [01 §Save envelope](01-data-model.md#save-envelope) |
| Platform events                     | [01 §Platform events](01-data-model.md#platform-events-client-action-events) |

---

## Known Gaps and Open Questions

These are areas where the spec is incomplete, inconsistent with code, or explicitly deferred.

### Gaps / divergences flagged in the specs

- **Serialised spatial index shape** (01) — The `ISerializedSpatialIndex` type declares `{ entities, locations, relationships }`, but `WorldSerializer` actually emits `{ parentToChildren, childToParent }`. Either is acceptable for conformance; document which your implementation uses.
- **Entities serialised as list vs record** (01) — `WorldSerializer` emits `entities` as a list of `{id, entity}` pairs, not the `Record<id, SerializedEntity>` the type suggests. Either is acceptable.
- **Event sourcing (ADR-034)** — Proposed, not implemented. Current design is snapshot-based.
- **Trait serialisation form** (01) — On disk, traits are a list; the type system describes them as a map. Each trait carries its own `type` so both forms are equivalent.
- **Legacy `schedulerState` vs plugin-scoped state** (05) — The scheduler was hardcoded; ADR-120 moves it toward the plugin model. Both paths are recognised during restore.

### Proposed ADRs not specified as conformance

- **ADR-017** (disambiguation strategy) — The reference implementation has pragmatic disambiguation; the ADR itself is Proposed. Spec requires the behaviour (never silent-pick) but not the specific rule order.
- **ADR-034** (event-sourced save/restore) — Proposed; marked Future.
- **ADR-104** (implicit inference + implicit take) — Partial; per-story and per-action opt-in.
- **ADR-119** (state-machine plugin) — Proposed.
- **ADR-120** (plugin architecture) — Proposed in the ADR; the reference implementation already uses `TurnPlugin` for scenes and the scheduler. Recommended but not strictly required.
- **ADR-150** (world-model extension) — Proposal.

### Open questions for a re-implementor

- **Determinism under async hooks.** `onSaveRequested` / `onRestoreRequested` are Promises. The current spec does not pin down whether parallel in-flight hooks are allowed (probably not — they should serialise through the engine).
- **Perception filter interaction with chain events.** ADR-069 (perception filter) and ADR-094 (chain events) both sit in the event pipeline. Order of operations is implementation-defined in the reference.
- **Parser state in saves.** `SerializedParserState` is optional and weakly typed. What to save (pronoun context, last command, disambiguation state) is implementation-defined.
- **Multi-PC / `switchPlayer`** (ADR-132) — The spec lists it as optional. Stories that switch PCs need to agree on the ordering with plugins (whose-turn is it after a switch?).
- **Pluggability of the grammar compiler.** `04 §Compiled pattern representation` specifies the data shape but not the matching algorithm. The reference uses a regex-ish engine; alternatives are acceptable.

### Not specified here

- **Client implementations** (CLI, browser, Zifmia). These consume `TextBlock[]` and drive `executeTurn`; they are out of scope.
- **Build tooling, test harness, package layout.** Implementation choices for the TypeScript reference; not part of the platform contract.
- **Specific trait property details.** Every trait is named in `02 §Trait Catalog` with its key properties. Exhaustive field-by-field enumeration lives in the generated API docs (`packages/sharpee/docs/genai-api/`) and was not reproduced.

---

## Versioning and Evolution

This spec describes **version 1** of the Sharpee platform contract as observed on 2026-04-16. Future work:

- **Breaking changes** to the contract (e.g., new required save-envelope fields, renamed core events) require a major version bump of this spec.
- **Additive changes** (new optional features, new trait types, new message IDs) are minor; compatible implementations continue to conform.
- **Clarifications** (rewording, better examples, divergence notes) are patch-level; no behavioural change.

Each document carries its own derivation date in its header. If implementation drifts, the spec should be regenerated from the new source before a re-implementor trusts it.

---

*This index is the entry point to the Sharpee platform specification. Start here, follow the dependencies, and consult the glossary for unfamiliar terms.*
