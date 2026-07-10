# Session Plan: Chord Phase A — Cloak-complete core

**Created**: 2026-07-10
**Overall scope**: Implement ADR-210 Phase A — the Chord language's lexer/parser/IR
(`@sharpee/chord`) and a loader subset (`@sharpee/story-loader`)
sufficient to interpret a canonical `cloak.story` file and pass a
golden transcript suite. Gates: AC-1, AC-3, AC-5, AC-6, AC-10.
**Bounded contexts touched**: N/A — infrastructure/tooling (new compiler +
interpreter packages). No `docs/ddd/notation.yaml` exists in this repo; this plan
uses Sharpee's own established platform vocabulary (traits, behaviors, capability
dispatch, IR) rather than formal DDD bounded-context notation.
**Key domain language**: Chord (the language), `.story` (source file), Story IR
(the compiled artifact), hatch (TS escape), the loader/interpreter, load-time gate,
phase-order rule, kind noun / trait adjective.

## References consulted
- `docs/architecture/adrs/adr-210-story-language.md` — ACCEPTED decision record; Phase A is scoped to lexer/parser/IR + loader subset gating AC-1/3/5/6/10; nothing platform-runtime may depend on `@sharpee/chord` (working name `story-lang` at consult time); platform-shipped text must source templates from `lang-{locale}` (embedded `phrases <locale>` is story-content only); package/CLI naming (`sharpee compose`) and grammar-governance log location are owner-decided and must be honored as written.
- `docs/work/story-language/design.md` — full grammar, compile-to mapping (§4), and technical pipeline (§5); Phase A's suggested scope explicitly excludes `define action`/`define trait` four-phase compilation for dispatch verbs (Phase B), constraining what this plan may build.
- `docs/work/story-language/prereqs.md` — all 5 platform prerequisites APPROVED as proposed; Prerequisite 5 (v1 kinds catalog + default player table) is a hard Phase-A blocker and this plan's Phase 4 must use that exact table; Prerequisite 3 (win/lose) commits to one if-domain wire-type addition — the only platform-package delta this plan is authorized to make.
- `docs/work/fluent/dream-cloak.md` — documents two canonical behavior divergences from the shipped TS Cloak (blocked north exit replaces Outside room; re-darkening on cloak retrieval) that the golden transcript suite must encode, and that the current hand-written story does **not** exhibit.
- `docs/context/project-profile.md` — pnpm workspace + Turborepo conventions, TS strict mode via shared `tsconfig.base.json` with composite project references, Vitest for unit tests, `.transcript` format for walkthrough/integration tests run via the CLI bundle, uniform lockstep versioning across `@sharpee/*` packages, language-layer separation (all user-facing text in `lang-{locale}`) already enforced as a convention this plan makes structural.
- `docs/context/session-20260710-1339-v2-210-chord-a.md` — this session's own file; a stub (no prior Open Items recorded — planning is the first work done in this session).

## Additional findings that shape this plan (not from an existing reference, but load-bearing)

- **No golden transcript suite exists for Cloak today.** `stories/cloak-of-darkness/` has only a Vitest unit suite (`tests/cloak-of-darkness.test.ts`) that asserts directly against `WorldModel`/`CloakOfDarknessStory` internals — there is no `.transcript` walkthrough directory (unlike `dungeo` and `friendly-zoo`). AC-1's "existing cloak-of-darkness transcript suite" does not exist in this repo and must be **authored from scratch** in Phase 1, from Firth's canonical Cloak behavior plus the two documented divergences — not derived from the current `src/index.ts`, which still has the pre-divergence behavior (permanent lighting, Outside room).
- **Package naming — DECIDED by David 2026-07-10** (the Phase 1 checkpoint, resolved before implementation): frontend is **`@sharpee/chord`** (replaces working name `@sharpee/story-lang`); loader stays **`@sharpee/story-loader`** (language-neutral — it consumes IR, never Chord syntax). Only `@sharpee/chord` defines the IR; no separate IR package (no second frontend anticipated). ADR-210 Terminology + Packages table amended. Directory: `packages/chord`.
- **AC-5 (seeded-RNG determinism) cannot be exercised by `cloak.story` alone** — the canonical Cloak grammar in the design doc's §3.1 example uses no `randomly`/`one chance in <n>` construct. Phase 1's golden-fixture set adds one small synthetic `.story` fixture that exercises both random forms, so AC-5 has a concrete gate artifact.
- **`cloak.story`'s one hatch (`define text garbled from "./extras.ts"`) requires a minimal hatch binding** even though the general hatch contract (multiple hatch kinds, pure-IR-profile refusal/AC-4) is Phase B scope. Phase 4 implements only the narrow slice needed: binding a single `define text X from` producer per the existing ADR-196 dynamic-text producer signature.
- **Wiring a `.story`-backed story into `node dist/cli/sharpee.js --test`** (needed for the Phase 6 golden-gate run) touches devkit/CLI/engine bootstrap, which is platform surface under CLAUDE.md's "platform changes require discussion first" rule — distinct from the general Phase A go-ahead already given for `packages/chord` and `packages/story-loader` themselves. Phase 6 opens with a checkpoint to confirm the integration approach before touching CLI code.

## Plan-review tensions — resolved by David 2026-07-10

All three advisory tensions from plan-review were confirmed as the plan's recommended reading; amendments applied to ADR-210 and design.md the same day:

1. **IR ownership**: `@sharpee/chord` (then working-named `story-lang`) is the canonical source of truth for the IR schema; `@sharpee/ide-protocol` re-exports it. ADR-210 Interface Contract 1 amended.
2. **Phase 5 on-block slice**: the ActionInterceptor half of four-phase compilation is in Phase A (required by AC-1); the CapabilityBehavior/dispatch half stays Phase B. ADR-210 phasing note added.
3. **AC-1 wording**: the golden cloak transcript suite is authored in Phase A (none existed), then frozen as the gate. ADR-210 AC-1 and design.md §5.9 amended.

## Phases

### Phase 1: Scaffolding — packages, grammar log, and the golden gate fixtures
- **Tier**: Small
- **Budget**: 100 tool calls
- **Domain focus**: Project scaffolding; the golden-transcript gate artifact that every later phase is graded against.
- **Entry state**: ADR-210 ACCEPTED; prereqs.md approved; branch `v2-210-chord-a` exists; this plan confirmed with the user, including the package-naming question below.
- **Deliverable**:
  - ~~User confirmation of final package names~~ DONE 2026-07-10: `@sharpee/chord` + `@sharpee/story-loader` (see Additional findings above).
  - Two new empty-but-wired packages (`packages/chord`, `packages/story-loader`), each with `package.json`/`tsconfig.json` following `packages/core` and `packages/if-domain` conventions (composite project references, `dist`/`dist-esm` outputs, `2.2.0` lockstep version), registered in the pnpm workspace and `./repokit` build graph (`--skip` list included), each exporting an empty `index.ts` that builds clean.
  - `docs/architecture/chord-grammar-changes.md` created per ADR-210 Open Question 4 — header + empty dated-entry table (form, rationale, example, decision), ready for use if Phase A implementation needs any grammar addition beyond the design doc.
  - Golden Cloak transcript suite at `stories/cloak-of-darkness/tests/transcripts/` (or `walkthroughs/`, matching the `dungeo`/`friendly-zoo` `.transcript` convention: header block + `[GOAL]`/`[ENSURES]`/`[OK]` assertions), covering: room traversal and descriptions, the blocked north exit (divergence 1), wearing/taking/dropping the cloak, the bar going dark while the cloak is worn, re-darkening after retrieving the cloak (divergence 2), message state progression (`intact` → `trampled` on first stumble → `obliterated` on third), and `reading` the message in each state (win on intact, neutral on trampled, lose on obliterated).
  - One small synthetic `.story`-shaped fixture spec (prose description only at this stage — the story text can't be written until parsing exists) noting the `randomly`/`one chance in <n>` constructs Phase 5 must exercise for AC-5; a real `.story` file is authored once the parser exists (Phase 2).
  - A short note appended to this plan file (or a `docs/work/chord-phase-a/divergences.md` companion) recording that this suite is authored fresh, not derived from `src/index.ts`, and why.
- **Exit state**: Both packages build under `./repokit build --skip <everything else>` (empty no-op build succeeds); grammar-changes log exists and is empty-but-structured; the golden transcript suite exists, is reviewed for correctness against Firth's canonical Cloak text, and is **not yet expected to pass** against anything (nothing to run it against yet).
- **Status**: COMPLETE (2026-07-10). Both packages build clean (cjs+esm) and repokit's suite passes with the new build order; suite = 6 transcripts + divergences.md + ac5-fixture-spec.md. Suite freeze pending David's read of the transcripts.

### Phase 2: Chord lexer, indentation-aware parser, and AST
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: `@sharpee/chord` — turning `.story` source text into an AST with source spans, for the grammar subset Phase A needs (no `define action`/reusable `define trait` behavior blocks — those are Phase B).
- **Entry state**: Phase 1 complete; package skeleton exists.
- **Deliverable**:
  - Lexer: indentation tracking (INDENT/DEDENT tokens), keyword-block tokens, prose-block tokens (opaque bare text, `{…}` markers extracted but not yet validated), quoted-string and identifier/operator tokens for the closed selector grammar.
  - Parser (recursive-descent, keyword-blocked, `end <keyword>`-terminated) covering: story header (`story "..." by "..."` + fields); `create <name>` blocks (kind noun + trait adjectives + `with` config, `aka`, placement `in`/`on`/`wears`, exits + `is blocked:`, `states:`, bare prose description, entity-scoped `on <action> it` clauses); `define condition`; `define phrase` (quoted and prose-block forms, strategy modifiers `randomly`/`cycling`/`ordered`/`once`); `define phrases <locale>` blocks; `define verb X or Y means <pattern>`; `when <event-header> [while <condition>] ... end when` including ordinal blocks (`first time`/`third time`); `define flag X starts <v>`; `define text X from "./mod.ts"` (hatch declaration syntax only — no binding yet); statement set `refuse/phrase/emit/set/change/move/award/win/lose`; control flow `if/then/else/end if`, `select on/select <strategy>/end select`.
  - Error recovery: after a parse error, resynchronize at the next `end` or top-level keyword, per design.md §5.2, so one mistake yields one diagnostic.
  - Golden parser tests: fixture `.story` files (including the full `cloak.story` text from design.md §3.1, transcribed verbatim) under `packages/chord/test/fixtures/`, each paired with an expected AST snapshot (Vitest, following `packages/core`'s `test:ci` convention) plus a small set of deliberately malformed fixtures asserting the resynchronize-and-report behavior.
- **Exit state**: `cloak.story` (design.md §3.1 text) and the AC-5 synthetic fixture (from Phase 1) parse to AST with zero errors; malformed fixtures produce exactly the expected diagnostics; `pnpm --filter '@sharpee/chord' test` green.
- **Status**: COMPLETE (2026-07-10). Lexer/AST/parser in packages/chord/src (span, diagnostics, lexer, ast, parser, index); 22 tests green incl. cloak.story §3.1 verbatim (zero diagnostics), ac5-random.story (authored per ac5-fixture-spec), 4 malformed fixtures. Grammar notation doc: docs/reference/chord-grammar.md (living EBNF tracking the implementation, incl. 7 recorded design.md readings).

### Phase 3: Name resolution, semantic analysis (load-time gates), and Story IR
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: `@sharpee/chord` — resolving the AST into a versioned, serializable Story IR and enforcing the Phase-A-relevant load-time gates (AC-3).
- **Entry state**: Phase 2 complete; AST available for `cloak.story` and fixtures.
- **Deliverable**:
  - Two-pass resolver (design.md §5.2): pass 1 collects declarations (entities, traits, phrases, states, conditions, context values, hatch declarations); pass 2 resolves references with article stripping, reporting ambiguous references as errors with rename suggestions (never a silent guess).
  - Load-time gate checks scoped to Phase A's grammar subset: phrase coverage (every `refuse`/`phrase`/blocked-exit key resolves in the active locale); closed-grammar predicate/state-name checks against the entity's `states:`; the **phase-order rule** for entity-scoped `on <action> it` clauses (`refuse` statements must precede the first mutation); marker validation (`{garbled}` must reference a declared hatch or phrase; the AC-5 fixture's `{snippet:...}` if used must resolve).
  - Story IR schema: versioned (`story language 1` format stamp), JSON-serializable, nodes carry source spans. Defined in `@sharpee/chord` (owns "IR wire types" per ADR-210's packages table) with a published copy/re-export in `@sharpee/ide-protocol` beside the ADR-184 manifest types (ADR-210 Interface Contract 1) — implement as one source of truth in `chord`, re-exported from `ide-protocol`, not two independent definitions.
  - IR snapshot tests: `cloak.story` → expected IR JSON fixture, checked into `packages/chord/test/fixtures/`; one negative fixture per load-time gate class (missing phrase key, unknown predicate with suggestion, undeclared state, ambiguous reference, refusal-after-mutation, unbound hatch marker) asserting the exact diagnostic.
- **Exit state**: `cloak.story` produces a stable, versioned IR snapshot; all six AC-3 diagnostic classes have a passing negative-fixture test with `.story` line numbers in the error; `pnpm --filter '@sharpee/chord' test` still green.
- **Status**: COMPLETE (2026-07-10). ir.ts (`story language 1` wire types), catalog.ts (kind nouns/trait adjectives/event verbs — names only, platform mapping stays in the loader), analyzer.ts (two-pass resolver, six gates with exact code+line+suggestion tests, IR builder). 44 chord tests green (IR snapshot + JSON round-trip + 6 gate fixtures). ide-protocol re-exports the IR schema (src/story-ir.ts, workspace dep + project reference); its 11 tests green.

### Phase 4: Story-loader core — world building, phrases, endings
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: `@sharpee/story-loader` — the generic `Story` implementation's static-world half: everything that doesn't need turn-by-turn evaluation.
- **Entry state**: Phase 3 complete; Story IR available for `cloak.story`.
- **Deliverable**:
  - Kinds catalog + default player exactly per `prereqs.md` §5's table (`a room`→ROOM+RoomTrait, `a door`→DOOR+DoorTrait, `a person`→ACTOR+ActorTrait, `a container`→CONTAINER+ContainerTrait, `a supporter`→SUPPORTER+SupporterTrait, no kind noun→ITEM; trait-adjective set `scenery/wearable/readable/openable/lockable/switchable/edible/pushable/pullable/light-source/plural/dark`; default player `yourself`/`self,me,myself`, ActorTrait `isPlayer`, ContainerTrait `max items 10`).
  - `create` block → entity/trait instantiation via ADR-140 helpers, `aka`, placement (`in`/`on`/`wears`), exits (`connectRooms`) + blocked exits (`RoomTrait.blockedExits`), `states:` → state-machine plugin/trait enum wiring (registration only — transition logic is Phase 5).
  - Phrase registration: inline prose + `phrases <locale>` blocks → Language Provider registration (dual-mode, ADR-107); strategy phrases (`randomly`/`cycling`/`ordered`/`once`) → phrase-algebra Choice producers (ADR-192/196).
  - Minimal hatch binding: `define text X from "./mod.ts"` binds the named export to the existing ADR-196 dynamic-text producer signature at load; missing/mis-typed export is a load error. (Scope-limited to this one hatch kind — no `define action X from`/`define behavior X from`, no pure-IR-profile refusal logic; those are Phase B/AC-4.)
  - Win/lose endings: `win [<phrase>]`/`lose [<phrase>]` → emit `story.victory`/`story.defeat` + set a completion flag in world state; generic `isComplete()` reads the flag. Implements the one if-domain wire-type addition approved in `prereqs.md` §3 (the ending event/flag contract) — this is the only platform-package (`if-domain`) touch this plan is authorized to make.
  - Story lifecycle binding: IR → `initializeWorld` (entities/traits/placement/states/flags), `extendLanguage` (phrases), default-player-aware `createPlayer`, per design.md's Update Contract table.
  - Unit tests (`packages/story-loader/test/`, Vitest): loading `cloak.story`'s IR produces a `WorldModel` with the correct rooms/entities/traits/placement (mirroring, and eventually superseding for Chord-authored stories, the assertions in `stories/cloak-of-darkness/tests/cloak-of-darkness.test.ts` — that existing file is untouched); phrase registration resolves all keys; the garbled hatch binds and produces output; win/lose emits the correct events and flag.
- **Exit state**: Loading `cloak.story` through `story-loader` yields a fully-populated, playable-shaped `WorldModel` (rooms, cloak, hook, message, player) with all phrases registered and the hatch bound — but darkness-on-enter, message-state transitions, and the reading behavior are not yet wired (Phase 5). `pnpm --filter '@sharpee/story-loader' test` green.
- **Status**: COMPLETE (2026-07-10). loader.ts (ChordStory: initializeWorld two-pass build via createHelpers, kinds per prereqs §5, bidirectional connectRooms, RoomBehavior.blockExit with phrase text, chord.state.* seeding, default player + worn items, extendLanguage registration incl. `{variants}` templates for strategy phrases, PUT_ON verb mapping, hatch binding via host-supplied hatchModules — loader stays fs-free, pure-IR profile passes none) + errors.ts. if-domain endings.ts wire type (StoryEndingEvents, STORY_ENDING_FLAG) — the one approved platform delta — plus one packaging fix discovered en route: @sharpee/helpers exports map lacked a `default` condition (CJS-only package unresolvable from ESM). 17 loader tests green. Deferred to Phase 5 (noted): dark-while initial evaluation + turn-end rule; ReadableTrait question for `on reading it` targets.

### Phase 5: Story-loader behavior — when-rules, ordinals, entity-scoped on-blocks, seeded RNG
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: `@sharpee/story-loader` — the turn-by-turn evaluator: the AST-walking expression/condition evaluator, event-rule binding, and the narrow four-phase-compilation slice Phase A needs.
- **Entry state**: Phase 4 complete; static world loads correctly.
- **Deliverable**:
  - AST-walking expression/condition evaluator implementing the closed selector grammar subset `cloak.story` uses: possessive access (`the player's location`), `is <state/value>`/`is a`, `is in`, `while <condition>` qualifiers, named conditions (`define condition in-darkness: ...`). No `eval`, no runtime TS compiler; per design.md §5.5.
  - `when <event-header> [while <condition>] ... end when` → `EventProcessor` handler registration (ADR-052/075), evaluating the condition via the evaluator above.
  - Ordinal blocks (`first time`/`third time`) → occurrence counters materialized as namespaced world state (loader-internal, invisible to authors, per design.md §5.5) — save/restore/undo-safe because it *is* world state (feeds AC-6).
  - Derived-property sugar: `dark while <cond>` → turn-end rule recomputing `RoomTrait.isDark` (Platform Prerequisite 1, no platform change — loader-internal turn-end hook).
  - Entity-scoped `on <action> it` clause compilation, **narrow slice only**: the message entity's `on reading it` clause (select-on-state + phrase/win/lose) compiles to an **ActionInterceptor** (ADR-118/208) via the phase-order-rule partition from design.md §5.4 (`refuse`→validate/blocked, `set`/`change`→execute, `phrase`/`emit`/`win`/`lose`→report). This is the standard-semantics-action half of §5.4 only; the CapabilityBehavior/dispatch-verb half (needed for custom actions like Zoo's `pettable`/`feedable`) is explicitly Phase B — do not build it here even if convenient.
  - Seeded RNG: `randomly` and `one chance in <n>` route through `SeededRandom` (`@sharpee/core`, `packages/core/src/random/seeded-random.ts`) so repeated runs with a fixed seed are byte-identical (AC-5). Exercised by the Phase 1 synthetic fixture, now written as a real `.story` file and given a matching `.transcript` (or Vitest determinism test running the same seed twice and diffing output).
  - Unit tests: `select ordered`/`select on` blocks resolve correctly; ordinal-block state changes (`trampled`→`obliterated`) fire on the correct turn; `dark while` recomputes on enter; the AC-5 fixture produces byte-identical output across two seeded runs.
- **Exit state**: A fully-interpreted `cloak.story` reacts correctly to `enter bar` (darkness), `read message` in each state (win/neutral/lose), and repeated stumbling (trampled→obliterated) — verified by direct `story-loader` unit tests, not yet by the CLI transcript harness (Phase 6). `pnpm --filter '@sharpee/story-loader' test` green.
- **Status**: COMPLETE (2026-07-10). evaluator.ts (closed-selector walk, chance stream persisted at chord.rng), runtime.ts (rules → keyed chains + fireRules test entry; ordinals → chord.occurrence.* world state; dark-while → initial eval + recompute chains on possession/movement events — fresher than prereq-1's turn-end rule, same contract; on-clauses → ActionInterceptor with §5.4 partition and pre-mutation decision snapshot covering if AND select-on; strategy phrases → persistent Choice atoms on the platform's seeded selectors; select-strategy statements via occurrence counters). stdlib reading.ts gained interceptor hooks per the opening.ts pattern (David-approved 2026-07-10; reading golden tests 11/11). 31 loader tests green incl. AC-5 two-run determinism and the §5.4 box routing test. ReadableTrait auto-added to `on reading it` targets.

### Phase 6: Integration gate — `sharpee compose`, IR round-trip, golden transcripts green
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: End-to-end Phase A acceptance — wiring Chord into the CLI surface and proving every Phase A gate (AC-1, AC-3, AC-5, AC-6, AC-10) against the golden fixtures.
- **Entry state**: Phase 5 complete; `cloak.story` fully interpretable via direct `story-loader` calls.
- **Status note**: CURRENT as of 2026-07-10 — opens with the CLI-integration checkpoint below.
- **Deliverable**:
  - **Checkpoint before touching CLI code**: confirm with the user how a `.story`-backed story gets exercised by `node dist/cli/sharpee.js --test` — this is devkit/CLI/engine bootstrap surface, which is platform surface under CLAUDE.md's "platform changes require discussion first," distinct from the Phase A go-ahead already given for the two new packages.
  - `sharpee compose` CLI command in `packages/devkit` (ADR-210 owner decision: this exact verb): parses + analyzes a `.story` file, emits the Story IR, with a `--check` mode that runs only the load-time gates (for CI/AC-3 use) and a default mode that also loads the story into a `story-loader` `Story` instance for testing.
  - `stories/cloak-of-darkness/cloak.story` authored (design.md §3.1 text), living alongside the existing `src/index.ts` — the existing TS story and its Vitest suite are **not** modified or removed.
  - The Phase 1 golden transcript suite run against the Chord-interpreted `cloak.story` via `node dist/cli/sharpee.js --test` (per the confirmed integration approach) — fixed until green. This is AC-1.
  - IR round-trip test (AC-10): parse → IR → serialize → load produces identical registry contents to a direct in-process load, as an automated test in `packages/chord` or `packages/story-loader`.
  - Save/restore/undo test (AC-6) against the live `cloak.story` run: occurrence state (ordinal counters, message state) and the `in-darkness`/completion flags survive a save/restore/undo cycle with no author-written persistence code.
  - Final AC-3 sweep: confirm all six load-time-gate diagnostic classes still fire with correct `.story` line numbers against the real `cloak.story`-shaped fixtures (not just the Phase 3 synthetic negatives).
  - `docs/architecture/chord-grammar-changes.md` updated with a dated entry for any grammar delta discovered during Phases 2–6 that wasn't already normative in design.md (owner-approved log, per ADR-210 Open Question 4) — expected to be empty if implementation stayed within the documented grammar.
- **Exit state**: `node dist/cli/sharpee.js --test` on the golden Cloak transcript suite is green against the Chord-interpreted `cloak.story`; AC-1, AC-3, AC-5, AC-6, AC-10 all have a passing, named test/run backing them; `./repokit build` succeeds with both new packages in the graph; Phase A is ready to report as gate-complete against ADR-210.
- **Status**: PENDING
