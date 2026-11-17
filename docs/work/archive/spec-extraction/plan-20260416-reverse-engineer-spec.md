# Session Plan: Reverse-Engineer Platform-Agnostic Specification

**Created**: 2026-04-16
**Overall scope**: Read-only analysis of the Sharpee TypeScript codebase to produce nine
specification documents in `docs/spec/` — one per subsystem plus an index and a glossary.
The deliverable must be detailed enough that a competent engineer could re-implement
Sharpee in Rust, C#, Python, or any other language without consulting the TypeScript source.
**Bounded contexts touched**: N/A — read-only analysis and documentation work
**Key domain language**: entity, trait, action, event, scope, daemon/fuse, message-ID

---

## Open Questions Resolved Upfront

These were the user's stated questions. Answers are embedded here so each phase can
proceed without re-litigating them.

**Q1 — Subsystem order?**
Adopt a dependency-first sequence: Data Model → World Model → Parser → Grammar →
Engine → Standard Library → Text Service. Each spec document's "Public Contract" section
can reference concepts already defined in earlier docs without circular ambiguity.

**Q2 — Granularity (exhaustive catalog vs. contract + examples)?**
Contract + representative examples. Every trait that exists in
`packages/world-model/src/traits/` must be named and its key properties listed. Every
standard action must appear in the verb catalog. But full field-by-field enumeration
of every TypeScript property belongs in the genai-api docs, not the spec. The spec
states *what a conforming implementation must provide*, not how the TypeScript
source chose to spell it.

**Q3 — ADR-vs-code conflicts?**
**Code is the source of truth.** The spec describes what the running code does.
ADRs are used as secondary context — they explain the *why* and can disambiguate
unclear code, but where code and ADR disagree, the spec follows the code.
Divergences are noted as "ADR intent: X — current code does Y" so a re-implementor
can choose. ADRs marked **Superseded** are used only for historical context.
Proposal/Draft ADRs that have not shipped are not specified as conformance requirements.

---

## Source Map (key files per phase)

These are the primary read targets for each phase. Each phase lists its own sources
in its entry-state, but this map is the single reference.

| Phase | Primary sources |
|-------|----------------|
| 1 Data Model | `packages/core/src/`, `adr-011`, `adr-033`, `adr-034`, genai-api/core.md |
| 2 World Model | `packages/world-model/src/traits/`, `packages/world-model/src/`, genai-api/world-model.md, `adr-013`, `adr-068`, `adr-069`, `adr-124`, `adr-150` |
| 3 Parser | `packages/parser-en-us/src/`, genai-api/parser.md, `adr-004`, `adr-017`, `adr-025`, `adr-027`, `adr-036`, `adr-065`, `adr-089` |
| 4 Grammar DSL | `packages/if-domain/src/grammar/`, genai-api/if-domain.md, `adr-054`, `adr-080`, `adr-087`, `adr-088` |
| 5 Engine | `packages/engine/src/`, genai-api/engine.md, `adr-060`, `adr-071`, `adr-082`, `adr-086`, `adr-106`, `adr-120`, `adr-121` |
| 6 Standard Library | `packages/stdlib/src/actions/standard/`, genai-api/stdlib.md, `adr-051` (superseded), `adr-052`, `adr-057`, `adr-058`, `adr-059`, `adr-063`, `adr-076`, `adr-085`, `adr-090`, `adr-094`, `adr-117`, `adr-118` |
| 7 Text Service | `packages/text-service/src/`, `packages/lang-en-us/src/`, `packages/text-blocks/src/`, genai-api/text.md, genai-api/lang.md, `adr-023`, `adr-028`, `adr-029`, `adr-066`, `adr-091`, `adr-093`, `adr-095`, `adr-096` |

---

## Phases

### Phase 1: Data Model and Storage Specification

- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: Core entity shape, trait serialization format, and save/restore wire format
- **Entry state**: `docs/work/spec-extraction/` folder exists (created during planning)
- **Deliverable**: `docs/spec/01-data-model.md` covering:
  - Entity shape: id, type enum, trait bag, location pointer
  - Trait shape: typed discriminated union, property layout
  - Spatial index: how containment/location relationships are stored (flat map vs. tree)
  - Save/restore JSON envelope (`SaveData`, `engineState`, `spatialIndex` fields from ADR-033)
  - Event-sourcing layer (`SerializedEvent` structure, ADR-034)
  - Mandatory vs. optional fields for a conforming implementation
  - Extension points: custom trait namespacing (`story.trait.*`), extra metadata fields
- **Exit state**: `docs/spec/01-data-model.md` exists. A conforming implementation
  could define its entity/trait/save-file types from this doc alone.
- **Status**: CURRENT

---

### Phase 2: World Model Specification

- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: Entity system, trait catalog, containment/spatial semantics, capability dispatch (ADR-090)
- **Entry state**: Phase 1 complete; `docs/spec/01-data-model.md` defines base entity shape
- **Deliverable**: `docs/spec/02-world-model.md` covering:
  - WorldModel interface: core query/mutation operations (createEntity, moveEntity,
    getLocation, getContents, findEntity, deleteEntity)
  - IFEntity interface: add/get/has/remove trait; name/aliases accessor
  - Full trait catalog: one row per trait from `packages/world-model/src/traits/`, with
    the trait's key properties and the behaviors it enables. Roughly 35 traits.
  - Capability dispatch contract: `Trait.capabilities[]`, `findTraitWithCapability()`,
    `registerCapabilityBehavior()`, `CapabilityBehavior` interface (ADR-090)
  - Spatial index invariants: single-parent rule, containment chain, darkness propagation
  - Scope resolution primitives: touchable / visible / carried / held / accessible
    — what each means and how the world model supports computing them
  - AuthorModel bypass semantics (needed for world initialization)
  - Extension points: custom traits, custom relation types
- **Exit state**: `docs/spec/02-world-model.md` exists. The trait catalog is complete
  and cross-references the Data Model spec. Capability dispatch contract is fully
  specified including the 4-phase behavior interface.
- **Status**: PENDING

---

### Phase 3: Parser Specification

- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: Tokenization pipeline, entity resolution, scope matching, disambiguation,
  pronoun tracking (ADR-089)
- **Entry state**: Phase 2 complete; World Model spec defines scope primitives
- **Deliverable**: `docs/spec/03-parser.md` covering:
  - Parser contract: input string → ParsedCommand (or parse failure)
  - ParsedCommand shape: verb, directObject, indirectObject, preposition, modifiers,
    direction; resolved entity references
  - Tokenization: whitespace splitting, article stripping, abbreviation expansion
  - Pattern matching: how compiled patterns are tried against token streams
  - Slot resolution: converting noun phrases to entity candidates using scope math
  - Scope ranking: proximity tiers (held > room > visible-not-touchable), recency weighting
  - Disambiguation: multi-candidate handling, partial-text matching, interactive
    disambiguation prompt protocol (ADR-017)
  - Pronoun tracking: `it`, `them`, `him`, `her` — binding rules and update timing (ADR-089)
  - Parse failure shape: failure types, what data is preserved for error messages
  - Locale boundary: what is language-specific (grammar patterns, direction words) vs.
    engine-agnostic (slot resolution, scope math)
  - Extension points: story grammar extension hook, custom slot constraint types
- **Exit state**: `docs/spec/03-parser.md` exists. Parse failure modes, success shape,
  and disambiguation protocol are fully specified. A non-English parser implementor
  can understand exactly what the engine expects to receive.
- **Status**: PENDING

---

### Phase 4: Grammar DSL Specification

- **Tier**: Small
- **Budget**: 100 tool calls
- **Domain focus**: Pattern definition DSL, action-centric builder (ADR-087), slot constraints, priority system
- **Entry state**: Phase 3 complete; Parser spec establishes the ParsedCommand the grammar produces
- **Deliverable**: `docs/spec/04-grammar.md` covering:
  - Two definition APIs: `.forAction()` (action-centric) and `.define()` (literal pattern)
  - Pattern syntax: `:slot` placeholders, `|` alternates in literals, multi-word patterns
  - `.verbs([])` expansion: how a verb list generates N patterns sharing the same
    constraints and action mapping
  - `.directions({})` expansion: how a direction map generates directional patterns
    with semantic direction values attached
  - Slot constraint DSL: `scope.touchable()`, `scope.visible()`, `scope.carried()`,
    `scope.matching({})`, chaining rules, constraint evaluation order
  - Priority system: default value, story override range, conflict resolution
  - When to use each API (decision tree from CLAUDE.md reproduced in spec form)
  - Compiled pattern representation: what the grammar produces at build time vs.
    what the parser consumes at runtime
  - Mandatory vs. optional grammar features for a conforming implementation
  - Extension points: story grammar, raw text slots (ADR-080)
  - Known drift between grammar and lang-en-us verb lists (documented, not a blocker)
- **Exit state**: `docs/spec/04-grammar.md` exists. The DSL is fully specified in
  language-agnostic pseudocode. A grammar builder implementor can reproduce the full
  API from this doc.
- **Status**: PENDING

---

### Phase 5: Engine Specification

- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: Turn cycle, command pipeline, SchedulerService (ADR-071), save/restore
  service, plugin architecture (ADR-120)
- **Entry state**: Phases 1–4 complete; World Model and Parser specs define the inputs
  the engine receives; Data Model spec defines the save format the engine writes
- **Deliverable**: `docs/spec/05-engine.md` covering:
  - Full turn cycle sequence (numbered steps, 7–8 phases): parse → validate → execute →
    report → NPC phase → scheduler tick → text service → turn end
  - Command pipeline: how ParsedCommand flows through ActionContext into action phases;
    ValidationResult.data threading between validate/execute/report
  - ActionContext shape: world, player, command, turn number, sharedData, validationResult
  - Meta-command handling: commands that don't enter the standard action pipeline
    (UNDO, SAVE, RESTORE, QUIT, AGAIN, RESTART) — their special processing paths
  - SchedulerService contract: Daemon and Fuse interfaces, tick protocol,
    pause/resume/cancel/adjust semantics, serialization contract (ADR-071)
  - Save/restore service: SaveData envelope, hook protocol for client storage,
    event-source replay on restore (ADR-033, ADR-034)
  - Plugin architecture: TurnPlugin lifecycle hooks (ADR-120), SceneEvaluationPlugin
    as the canonical example
  - GameEngine lifecycle events: initializing, initialized, loading, loaded, starting,
    started, ending, ended, won, lost, quit
  - VocabularyManager: how entity names/aliases are registered and looked up at parse time
  - Mandatory vs. optional engine features for a conforming implementation
  - Extension points: custom plugins, before-action interceptors (ADR-118),
    input mode handlers (ADR-137)
- **Exit state**: `docs/spec/05-engine.md` exists. The turn cycle is fully sequenced
  with precise phase boundaries. SchedulerService interface is fully specified. A
  re-implementor can build the engine independently of the parser and world model.
- **Status**: PENDING

---

### Phase 6: Standard Library Specification

- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: Four-phase action contract (ADR-051/052/090), standard verb catalog
  (43 actions), event/message-ID catalog, scoring, NPC support
- **Entry state**: Phase 5 complete; Engine spec defines ActionContext and the
  four-phase protocol the stdlib actions must satisfy
- **Deliverable**: `docs/spec/06-stdlib.md` covering:
  - Four-phase action contract: `validate → execute → report → blocked`; what each
    phase must and must not do; the no-side-effects rule in validate; execute
    performs mutations; report returns Effects; blocked returns Effects for failures
  - ValidationResult contract: `valid`, `error`, `params`, `data` (threading to execute/report)
  - Effect type: `emit(eventId, data)` shape; how effects become events in the event log
  - Full standard verb catalog: table of all 43 actions with their action ID, slot
    schema (directObject / indirectObject), key invariants, and the events each emits
    on success and on each failure mode
  - Standard trait prerequisites: which trait an entity needs to support each action
    (e.g., opening requires OpenableTrait; inserting requires ContainerTrait on target)
  - Capability dispatch verbs vs. fixed-semantics verbs: the two-column table from ADR-090
  - Event handler registration: `world.registerEventHandler(eventId, fn)` contract (ADR-052)
  - Before/after action hooks and action interceptors (ADR-057, ADR-118)
  - Action chains and sub-actions (ADR-063, ADR-094)
  - Scoring system: score/maxScore, `scoringAction()` helper, trophy-case scoring
    pattern (ADR-076, ADR-085, ADR-129)
  - Mandatory vs. optional stdlib features for a conforming implementation
  - Extension points: story-specific actions, custom message IDs, capability behaviors
- **Exit state**: `docs/spec/06-stdlib.md` exists. Any engineer can implement a
  standard action by reading this doc: they know the contract, the events to emit, the
  trait prerequisites, and how failures are reported.
- **Status**: PENDING

---

### Phase 7: Text Service and Language Layer Specification

- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: Message-ID → text binding, TextService rendering contract, i18n
  boundary, text block structure (ADR-029, ADR-096)
- **Entry state**: Phase 6 complete; stdlib spec defines every message-ID that actions
  emit, giving the text service spec its full input domain
- **Deliverable**: `docs/spec/07-text-service.md` covering:
  - Message-ID naming convention: `namespace.noun.verb` pattern; core namespace `if.*`,
    story namespace `{story}.*`; required vs. fallback message IDs
  - LanguageProvider contract: `getMessage(id, params?) → string | TextTemplate`;
    `getVerbs(actionId) → string[]`; locale tag
  - TextTemplate: parameterized strings; interpolation protocol (`{target}`, `{actor}`)
  - TextService contract (ADR-029): `initialize(context)`, `processTurn() → TextOutput`,
    `setLanguageProvider()` — and what each method's invariants are
  - TextServiceContext: how the text service queries turn events and world state
  - TextBlock structure: block keys, channel model, ordered block list (ADR-133,
    `packages/text-blocks/`)
  - Rendering pipeline: event list → block list → formatted output; which events
    produce room descriptions vs. action responses vs. ambient text
  - Text decorations (ADR-091): bold, italic, color, link — mandatory and optional
  - i18n boundary: what must be language-neutral in the engine (event IDs, message IDs)
    vs. what is language-specific (verb synonyms, templates, articles)
  - Mandatory vs. optional text-service features for a conforming implementation
  - Extension points: `story.extendLanguage()`, custom block keys, alternative renderers
- **Exit state**: `docs/spec/07-text-service.md` exists. The i18n boundary is
  explicitly stated. A French or German language provider implementor knows exactly
  what interface they must satisfy.
- **Status**: PENDING

---

### Phase 8: Index, Glossary, and Cross-Reference Pass

- **Tier**: Small
- **Budget**: 100 tool calls
- **Domain focus**: Documentation coherence — forward/back references, glossary of
  domain terms, conformance checklist
- **Entry state**: All seven subsystem specs exist in `docs/spec/`
- **Deliverable**:
  - `docs/spec/index.md`: navigation table; reading order for three audiences
    (re-implementor, language-port author, extension author); known gaps and open questions
  - `docs/spec/glossary.md`: ~50 domain terms defined in implementation-neutral language
    (entity, trait, action, event, message-ID, scope, daemon, fuse, effect, bounded-context
    equivalent terms, etc.)
  - Light cross-reference pass on all seven spec docs: ensure terms used in later docs
    appear in the glossary; ensure mandatory/optional sections are consistent across docs
  - One-paragraph "conformance summary" per spec: minimum viable implementation checklist
- **Exit state**: `docs/spec/` contains 9 files (7 subsystem specs + index + glossary).
  The index accurately links all files. The glossary covers all domain terms that appear
  across multiple specs.
- **Status**: PENDING

---

## Phase Dependency Graph

```
Phase 1 (Data Model)
    └── Phase 2 (World Model)
            └── Phase 3 (Parser)
                    └── Phase 4 (Grammar DSL)
                            └── Phase 5 (Engine)
                                    └── Phase 6 (Stdlib)
                                            └── Phase 7 (Text Service)
                                                        └── Phase 8 (Index + Glossary)
```

This is a strict linear chain. Each spec references types or contracts defined in the
prior spec(s). Phases cannot be reordered without introducing forward references that
weaken the documents.

### Cross-Subsystem Read Requirements

The following phases require reading source files from packages outside their "primary"
subsystem:

- **Phase 2 (World Model)** must read `packages/engine/src/capability-dispatch-helper.ts`
  to understand how `findTraitWithCapability` is actually called from action context.
- **Phase 5 (Engine)** must read `packages/stdlib/src/` partially to understand how
  ActionContext flows into action phases — the engine and stdlib are tightly coupled at
  that boundary.
- **Phase 6 (Stdlib)** must read `packages/lang-en-us/src/actions/` to verify the
  message IDs emitted by each action, since the message-ID catalog lives at the
  intersection of stdlib and the language layer.
- **Phase 8 (Index + Glossary)** reads all seven specs but no additional source files.

---

## ADR Conflict Policy (Operational)

**Code is primary. ADRs are secondary context.** For each phase:

1. Read the code first. The spec's contract, invariants, and event catalog describe
   what the code actually does.
2. Use ADRs to understand intent, naming, and design rationale — especially for
   non-obvious choices.
3. When code and ADR disagree: spec follows the code. Add a note: "ADR-NNN intended X;
   current implementation does Y." A re-implementor can choose which to follow.
4. **Superseded** ADRs: historical context only, do not spec.
5. **Proposal** / **Draft** ADRs that have not shipped: do not spec as conformance
   requirements; mention in "Implementation Notes" if relevant.
6. Behavior with no ADR coverage: spec what the code does; no note needed.

---

## Output File List

```
docs/spec/
├── index.md               (Phase 8)
├── glossary.md            (Phase 8)
├── 01-data-model.md       (Phase 1)
├── 02-world-model.md      (Phase 2)
├── 03-parser.md           (Phase 3)
├── 04-grammar.md          (Phase 4)
├── 05-engine.md           (Phase 5)
├── 06-stdlib.md           (Phase 6)
└── 07-text-service.md     (Phase 7)
```

---

## Per-Document Template (to be used in every phase)

Each spec document follows this structure:

```
## Purpose
One-paragraph statement of what this subsystem does and why it exists.

## Invariants
Conditions that must always hold. Numbered list. Written as assertions.

## Public Contract
Language-agnostic pseudocode interfaces, data shapes, and function signatures.
No TypeScript-specific syntax. No import paths.

## Event / Command Catalog
Table of event IDs this subsystem emits or consumes, with payload shapes.

## Extension Points
What an author or platform integrator may add without violating the contract.

## Mandatory vs. Optional
Two-column table: what a conforming minimal implementation must provide,
and what may be omitted or deferred.

## Implementation Notes
ADR-vs-code divergences, known gaps, open questions flagged during analysis.
```

---

## Estimates

| Phase | Tier | Budget | Primary reading load |
|-------|------|--------|----------------------|
| 1 Data Model | Medium | 250 | core.md, adr-011, adr-033, adr-034 |
| 2 World Model | Medium | 250 | world-model.md, ~35 trait files, adr-090 |
| 3 Parser | Medium | 250 | parser.md, parser-en-us/src/, 6 ADRs |
| 4 Grammar DSL | Small | 100 | if-domain/grammar/, adr-087, adr-088 |
| 5 Engine | Medium | 250 | engine.md, engine/src/, adr-071, adr-120 |
| 6 Stdlib | Medium | 250 | stdlib.md, 43 action dirs, 10 ADRs |
| 7 Text Service | Medium | 250 | text.md, lang.md, lang-en-us/src/, 8 ADRs |
| 8 Index + Glossary | Small | 100 | all 7 spec docs (already written) |
| **Total** | | **1700** | |

Total budget is well within a Large tier for the overall effort, distributed across 8
sessions of Small/Medium size — each independently completable and committable.
