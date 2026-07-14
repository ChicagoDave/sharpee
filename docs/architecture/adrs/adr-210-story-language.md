# ADR-210: Chord — The Sharpee Story Language, External Author Syntax Compiled to Platform Registries

## Status: ACCEPTED

> **Accepted 2026-07-10 by David.** All open questions resolved same day (name:
> Chord, CLI verb `sharpee compose`; two-book split; stdlib self-hosting 100%
> end state; grammar governance: owner-approved log) and all five platform
> prerequisites approved as proposed (`docs/work/story-language/prereqs.md`).
> Implementation may be planned; Phase A requires its own explicit go-ahead.
>
> **adr-review round 1 applied** (2026-07-10, verdict NEEDS WORK, 7/13 → 13/13
> after fixes): added the platform-text guard (stdlib language declarations
> source templates from lang-{locale}), the Packages section with dependency
> directions, the Story-lifecycle binding + atomic-load update contract, pinned
> hatch signatures to the ADR-196 producer type and the RNG to core's
> `SeededRandom`, chose verified-against (CI fixture) for the event-selector
> contract, and promoted the v1 kinds catalog to a Phase-A-blocking
> prerequisite.

## Date: 2026-07-10

> Full design specification: `docs/work/story-language/design.md` (consolidated
> from the 2026-07-10 design session; supersedes `docs/work/story-language/sketch.md`
> and the fluent-layer direction of `docs/work/fluent/research-ideas.md` /
> `docs/work/fluent/dream-cloak.md`). This ADR records the decision, its axioms,
> the architectural commitments, and the acceptance gates. The design doc owns
> the full grammar and examples.

## Terminology

- **Chord** (name decided 2026-07-10; "the story language" / briefly "Compose"
  in earlier drafts) — a declarative, block-structured language for authoring
  Sharpee stories; file extension `.story`. The CLI verb is **`sharpee
  compose`** (compile `.story` → IR/bundle): you compose a Chord story.
  Package names decided at Phase A creation (owner, 2026-07-10):
  **`@sharpee/chord`** (frontend — replaces working name `@sharpee/story-lang`)
  and **`@sharpee/story-loader`** (kept: the loader is language-neutral, it
  consumes IR and never sees Chord syntax). Only `@sharpee/chord` defines the
  IR; no separate IR package (no second frontend is anticipated).
- **Story IR** — the typed, JSON-serializable intermediate representation a
  `.story` file parses to. Nodes carry source spans.
- **Loader** — the runtime interpreter (`@sharpee/story-loader`):
  a generic `Story` implementation constructed from IR.
- **Emitter** — the `sharpee eject` backend that transforms IR into fluent-style
  TypeScript. One-way.
- **Hatch** — a TS escape (`define text garbled from "./extras.ts"`): a named
  export implementing a small documented interface, bound at load.
- **Pure-IR profile** — a deployment profile (browser playground, hosted
  multi-user) that refuses stories containing hatches and runs stories as data.

## Context

Sharpee's platform layer is stable and composable; its authoring surface is not
writer-friendly. The evidence, measured 2026-07-10:

- `stories/cloak-of-darkness/src/index.ts`: **785 lines** of platform-style TS
  (trait constructors, hand-written scope rules, EventProcessor handlers, manual
  ID bookkeeping) for the canonical minimal IF story.
- `stories/friendly-zoo` (the tutorial): **1,671 lines**; authors hand-build
  `ISemanticEvent` literals, cast string-keyed world state, write daemon
  `getRunnerState`/`restoreRunnerState` plumbing, and maintain message-ID
  constant maps synchronized by hand. The ~60-line petting action is four-phase
  + capability-dispatch boilerplate around three sentences of intent.
- The `sharpee init` template teaches the raw API; `@sharpee/helpers` (ADR-140)
  covers only entity construction. The "Forge" author layer promised across
  ADR-011/045/046 was never built.

A fluent TypeScript layer was designed first (`docs/work/fluent/dream-cloak.md`,
~90 lines for Cloak) and demonstrated the semantic vocabulary, but still requires
the node/npm/tsc toolchain, cannot be sandboxed for hosted multi-user, and is a
weak target for validated LLM generation (ADR-116).

The language design was then derived from seven axioms stated by the project
owner (the **givens**), not from other IF languages' surface conventions:

1. Sharpee has Traits, Behaviors, and Messages; Sharpee is composable. Kinds
   are trait bundles (ADR-189), not primitives.
2. Sharpee grammar is action/verb oriented (ADR-087, ADR-090).
3. All text must be registered in the Language Provider.
4. Behavior bodies use common structured control flow (if/select/iterate,
   `end`-terminated blocks).
5. Counting up and down is implied; the author defines no counting mechanism.
   Occurrences differentiate by ordinal, turn, or event; accumulation lives in
   named ordered states.
6. Text emission is not a print statement; it declares a semantic message
   (`phrase`, not `say`), rendered post-turn through the phrase algebra.
7. Selection criteria are author- and programmer-friendly: a **closed grammar**
   — one canonical form per concept — not Inform 7's open English. Modifiers
   are single-word adverbs where English has one.

Both reference stories (Cloak of Darkness, Friendly Zoo) have been fully
re-expressed in the language during design (design doc §3), including stdlib's
taking/opening/wearing/container behaviors and the zoo's custom dispatch verbs,
timed sequences, and NPC behavior — every construct mapped to an existing
platform mechanism except four flagged items (see Platform Prerequisites).

## Decision

1. **Adopt the story language as Sharpee's author-facing layer.** Declarative,
   block-structured, verb-led declarations — `create` (world-model instances)
   and `define` (registry declarations) — with the closed selector grammar and
   the statement set `refuse / phrase / emit / set / change / move / award /
   win / lose`. The full grammar is specified in the design doc and is
   normative once this ADR is accepted.

2. **The Story IR is the product; syntaxes are frontends.** The pipeline is
   `.story` → AST → resolved, analyzed **Story IR** → backends. Frontends may
   multiply (language, IDE forms, LLM generation); backends are the loader, the
   emitter, the introspection manifest (ADR-184), and message extraction for
   localization. The IR schema is versioned (`story language 1`), and published
   `.story`/IR compatibility is a release commitment from first public release.

3. **Interpreter-primary execution.** The loader constructs a generic `Story`
   from IR: entities/traits into the world model, behavior clauses into
   capability dispatch and interceptors, prose into the Language Provider,
   temporal constructs into plugin-scheduler, states into the state-machine
   mechanism. Conditions and statements run in an AST-walking evaluator — no
   `eval`, no runtime TS compiler; iteration bounded per turn; randomness
   through `SeededRandom` (`@sharpee/core`). The **pure-IR profile** runs untrusted
   stories as data (playground per ADR-191; hosted multi-user); the devkit
   profile additionally binds hatches.

4. **Four-phase compilation is static.** The load-time **phase-order rule**
   (within an `on` block, `refuse` statements precede the first mutation) makes
   the partition mechanical: refusals → validate/blocked; `set`/`change`/`move`/
   `award` → execute (delegating to world-model behaviors where they exist);
   `phrase`/`emit` → report. The stdlib decision tree is a compiler rule, not
   an author choice: refusal-only clauses on standard-semantics actions compile
   to ActionInterceptors (ADR-118/208); mutation-bearing clauses on dispatch
   verbs compile to CapabilityBehaviors (ADR-090/207).

5. **Structural enforcement replaces convention.** The language makes the
   following platform disciplines the only expressible thing: all text
   registered under derived, stable message IDs (given 3; ADR-107 dual-mode);
   EntityInfo template params (ADR-158) as the only emission the compiler
   produces; fully-qualified capability messageIds (2026-07-02 P1 class made
   inexpressible); declared/implied state as world state (save/restore/undo
   free; no runner-state plumbing, no magic state strings); occurrence tracking
   materialized by the compiler only for constructs that need it.

   **Platform-text guard:** language layer separation survives the language.
   *Platform-shipped* language declarations (stdlib traits/actions, whether
   self-hosted or bindings) MUST source their templates from `lang-{locale}`
   packages; the embedded `phrases <locale>` block is **story-content syntax**.
   The design doc's §3.2 stdlib examples illustrate grammar, not text
   placement. Story files may inline prose (ADR-107); platform packages may
   not.

6. **The fluent TS layer is demoted to infrastructure.** It survives as the
   emitter's target vocabulary and the loader's internal API, not as a
   separately documented authoring product. TypeScript remains the
   *developer/extension* track (custom platform work, hatches); the language is
   the *author* track.

7. **Load-time gates are part of the language contract:** phrase coverage
   (every referenced key resolves in the active locale — `requiredMessages`
   made structural), closed-grammar predicate/type checks, state-name and
   role-binding validation, ambiguous name references as errors with rename
   suggestions, marker/producer validation, and the phase-order rule.

## Packages and Dependency Directions

New packages (working names):

| Package | Owns | Depends on |
|---|---|---|
| `@sharpee/chord` | lexer, parser, semantic analysis, **IR wire types**, diagnostics | nothing platform-runtime (browser-safe; `if-domain` types at most) |
| `@sharpee/story-loader` | the generic `Story` built from IR; expression evaluator; occurrence materialization | world-model, stdlib, engine, lang-{locale}, plugin-scheduler, plugin-state-machine, core (`SeededRandom`) |
| emitter | `sharpee eject` command | chord (IR) + devkit (Phase D; lives in devkit) |

**Direction rule:** nothing platform depends on the language packages. The
compiler is pure (parse anywhere, including the playground); the loader is a
platform *consumer*.

Touched packages: **devkit** (init template emits `.story`, build bundles IR,
`extract-messages`, `eject`), **transcript-tester** (report failures with
`.story` source spans), **ide-protocol** (IR schema published beside the
ADR-184 manifest types), **core** (`SeededRandom` — exists, used by NPC
subsystem), **plugin-scheduler** / **plugin-state-machine** (registration
surfaces consumed, no changes expected), **parser-en-us** / **lang-en-us**
(existing registration APIs consumed, no changes expected).

## Update Contract — Story Lifecycle Binding

The loader implements the **existing `Story` interface**; the language adds no
engine mode. IR sections bind at the existing lifecycle hooks:

| IR section | Lifecycle hook |
|---|---|
| entities, traits, placement, states, flags | `initializeWorld` (player via `createPlayer` default) |
| `define verb`, action grammar | `extendParser` / `getCustomVocabulary` |
| phrases (all locales in scope) | `extendLanguage` |
| `when`/`once`/`every`/sequences, capability + interceptor registration | `onEngineReady` (per-world binding maps, ADR-207/208) |
| `define action` | `getCustomActions` |

**Atomic load:** if any load-time gate fails (Decision 7), the entire load
fails — no partial registration of any registry. Load order within a hook is
declaration order; cross-references resolve in the analysis pass, so order
cannot dangle.

## Interface Contracts

1. **IR schema** — versioned wire format; nodes carry source spans; the
   introspection manifest is generated from it. Canonical source of truth is
   `@sharpee/chord` (per the Packages table); `@sharpee/ide-protocol`
   re-exports it beside the ADR-184 manifest types. This gives ide-protocol
   (tooling, not runtime) a dependency on chord; the Direction rule
   constrains the *runtime* platform, which still never depends on the
   language packages. (Owner-confirmed 2026-07-10.)
2. **Event-selector / context-value contract** — the map from language forms
   (`enters`, `reads`, `the previous location`, grammar slot names) to
   `if.event.*` types and payload shapes is **verified against** stdlib's
   actual emissions by a CI fixture test (AC-9). Generation from stdlib source
   was considered and rejected for v1 (the map needs curated author-facing
   names); verification catches drift without coupling build systems. This is
   the language's coupling surface to stdlib and its primary long-term risk.
3. **Hatch interfaces** — `define text X from` binds to the **ADR-196 dynamic
   text producer type** (the existing signature; no new interface). Later hatch
   kinds (`define action X from`, `define behavior X from`) bind to the
   existing `Action` and `CapabilityBehavior` types respectively. Missing or
   mis-typed exports are load errors.
4. **Message-ID derivation** — deterministic IDs from declaration path with
   explicit `as <id>` opt-in; stability rules under edit (reordering, renaming)
   are specified in the design doc §5 and versioned with the format. Rule and
   occurrence-counter identities follow the same scheme.
5. **Randomness** — `randomly` and `one chance in <n>` route through
   `SeededRandom` from `@sharpee/core` (already used by the NPC subsystem), so
   transcript runs are seedable (AC-5).

## Consequences

**Enables:** no-toolchain authoring (browser playground, ADR-191); sandboxed
hosted multi-user (stories as data — feeds the zifmia redesign); validatable
LLM story generation (ADR-116 retargeted at a closed language); mechanical
localization (`extract-messages`; a translation re-registers IDs); platform
evolution beneath stable story files; LSP-grade tooling derived from the closed
grammar (completions computed from declarations).

**Constrains:**

- Grammar additions (predicates, modifiers, statements) are a **one-way
  ratchet**; each requires an explicit decision recorded against this ADR's
  lineage. The grammar reference (`docs/reference/chord-grammar.md`, with the
  pure-EBNF extraction `docs/reference/chord.ebnf`) is hand-maintained
  implementation notation synced against the parser: changes are gated by
  `docs/architecture/chord-grammar-changes.md`, and drift is caught by
  parser-verified review plus compile-checked documentation examples.
  *(Amended 2026-07-14: the original bullet claimed the reference is generated
  from the parser's tables — that generator was never shipped; hand-sync under
  the governance log is the shipped mechanism. Table-generation remains
  possible future tooling.)*
- Published `.story` files freeze the format per version stamp; breaking
  grammar changes require a migration path.
- stdlib action/event changes must keep the event-selector contract green
  (Interface Contract 2) — stdlib work gains a CI obligation.
- The book eventually splits into an author track (the language) and a
  developer track (TS); sequencing against the v2 book line is a separate
  product decision, deferred.
- Two reference implementations (loader now, emitter later) must stay
  behavior-equivalent; dual-backend transcript runs are the enforcement.

**Costs accepted:** parser/diagnostics investment (error messages are the
product); LSP is net-new; conditional trait composition and other §8 items may
land as reduced fallbacks first.

## Platform Prerequisites (flagged, discussion required before their constructs ship)

> Worked resolutions for all five in `docs/work/story-language/prereqs.md` —
> **APPROVED as proposed by David, 2026-07-10.** Net platform delta: one
> wire-type addition (ending contract in if-domain); everything else is
> loader-internal or a documented v1 restriction. The Phase-A gate "Platform
> Prerequisites have owners" is satisfied (owner: the story-loader work).

1. **Derived properties** (`dark while <cond>`) — ship as sugar (turn-end rule
   recomputing the trait field); first-class dependency tracking only if
   staleness bites (separate ADR).
2. **Conditional trait composition** (`chatty while <cond>`) — NPC behavior
   swap machinery exists; the generalized form needs design. Fallback: one
   trait branching internally.
3. **First-class endings** (`win`/`lose`) — bless the `story.victory`/
   `story.defeat` + completion-state convention as a small platform service.
4. **Per-entity phrase override** (`phrase fed: "…"` in a `create` block) —
   likely reduces to existing lang-layer override machinery; verify, else ADR.
5. **v1 kinds catalog and default player** (promoted from Open Questions;
   **blocks Phase A**) — the parser cannot resolve `a room` / `a person` /
   `a supporter` without the enumerated kind-noun → trait-bundle catalog and
   the default player definition. Resolve before Phase A begins; the catalog
   is expected to mirror ADR-189's registry plus the ADR-140 builder set.

## Acceptance Criteria

- **AC-1** `cloak.story`, interpreted by the loader, passes the
  cloak-of-darkness golden transcript suite unmodified except two documented
  divergences (blocked north exit replaces the Outside room; canonical
  re-darkening when the cloak is retrieved). *Gate for Phase A.* (Amended
  2026-07-10: no `.transcript` suite existed for cloak-of-darkness — only a
  Vitest unit suite — so the golden suite is authored in Phase A against the
  hand-written story's behavior, then frozen as this gate.)
- **AC-2** `friendly-zoo.story` passes the zoo transcript suite, exercising
  custom actions, dispatch, scheduler, NPC behaviors, scoring, and one hatch.
  *Gate for Phase B.*
- **AC-3** Load-time gates fire as errors with `.story` line numbers: missing
  phrase key, unknown predicate (with nearest-valid suggestion), undeclared
  state, ambiguous entity reference (with rename suggestion), refusal after
  mutation, unbound hatch.
- **AC-4** The pure-IR profile refuses a story containing hatches at load, and
  runs a hatch-free story with no author code execution path.
- **AC-5** Determinism: with a fixed RNG seed, repeated transcript runs of a
  story using `randomly` and `one chance in <n>` are byte-identical.
- **AC-6** Occurrence state (ordinals, `ordered` positions, `once`, sequence
  progress) and declared flags/states survive save/restore and undo without
  author-written persistence.
- **AC-7** `extract-messages` emits the complete ID → template table for a
  story; re-registering a translated table changes rendered text without
  touching story structure.
- **AC-8** (Phase D) `sharpee eject` output passes the same transcript suite as
  the interpreted original.
- **AC-9** The event-selector contract check fails CI when a stdlib event type
  or payload field referenced by the language map is renamed or removed.
- **AC-10** IR round-trip: parse → IR → serialize → load produces identical
  registry contents to a direct in-process load.

## Implementation Phasing

- **Phase A — Cloak-complete core** (lexer/parser/IR, loader subset, seeded
  RNG): gate AC-1, AC-3, AC-5, AC-6, AC-10. Includes the ActionInterceptor
  half of four-phase compilation for entity-scoped `on`-blocks (required by
  AC-1 for `cloak.story`'s `on reading it`); the CapabilityBehavior/dispatch
  half stays in Phase B. (Phasing note added 2026-07-10.)
- **Phase B — Zoo-complete** (action/trait declarations, four-phase compilation,
  role binding, scheduler, phrase strategies, hatch contract): gate AC-2, AC-4,
  AC-9.
- **Phase C — Tooling** (diagnostics polish, TextMate grammar, LSP,
  extract-messages, playground): gate AC-7.
- **Phase D — Emitter**: gate AC-8.

No implementation begins until this ADR is accepted and the Platform
Prerequisites above have owners.

## Open Questions (owner decisions recorded 2026-07-10; none block Phase A)

1. **Name and extension** — **DECIDED: Chord**, with **`sharpee compose`** as
   the CLI command. Extension `.story` stands. (Compose-as-name and Madrigal
   were considered; Chord keeps the composability metaphor — many voices
   sounding as one — while staying searchable, and demotes "compose" to the
   verb where it belongs.)
2. **Books** — **DECIDED: split into two books.** An author book teaching the
   language and a developer book (TS platform/extension work). Timing default:
   author book begins after Phase B + playground; the existing v2 book seeds
   the developer track.
3. **stdlib self-hosting** — **DECIDED: 100% — self-hosting is the end state.**
   stdlib's source of truth eventually becomes language declarations (the
   platform dogfoods its own language, forcing expressiveness). Declaration
   bindings ship first as transitional scaffolding (Phases A–B); migration
   begins after Phase B. Implication sharpened by the Decision 5 platform-text
   guard: self-hosted stdlib `.story` declarations carry **no prose** — their
   phrase keys resolve from `lang-{locale}` packages; the embedded
   `phrases <locale>` block remains story-content syntax only.
4. **Grammar governance** — **DECIDED: owner approval, logged in-repo.** Every
   grammar addition (predicate, modifier, statement, strategy) gets a dated
   entry — form, rationale, example, decision — in
   `docs/architecture/chord-grammar-changes.md`, approved by the owner before
   it lands. An experimental tier (header-flagged trial forms, batch promotion)
   is deferred until outside authors exist; the format stamp leaves room for it.

(The former open question on the v1 kinds catalog is now Platform
Prerequisite 5 — it blocks Phase A.)

## Session

Design session 2026-07-10 (`docs/context/session-20260710-1000-main.md`);
consolidated specification `docs/work/story-language/design.md`.

## References

- ADR-011 (entity IDs; "Forge will hide this"), ADR-045/046 (scope; forge
  sketches), ADR-087 (action-centric grammar), ADR-090 (capability dispatch),
  ADR-107 (dual-mode content), ADR-116 (prompt-to-playable), ADR-118/208
  (interceptors), ADR-129 (score identities), ADR-140 (entity helpers),
  ADR-158 (EntityInfo params), ADR-184/185 (IDE + introspection), ADR-189
  (default traits), ADR-191 (playground), ADR-192–206 (phrase algebra),
  ADR-196 (dynamic text), ADR-203 (attribution), ADR-207 (per-world behavior
  binding), ADR-209 (snippets).
