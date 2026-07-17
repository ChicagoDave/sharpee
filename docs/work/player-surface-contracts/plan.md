# Session Plan: ADR-231 Player-Surface Contract Rulings

## Preface — the design lens (David, 2026-07-17)

All work under this plan is judged against two standing commitments, in
this order, before any implementation-cost consideration:

1. **Professional IF designer quality.** Every player-facing behavior
   lands at the fidelity a professional interactive-fiction designer
   would ship: refusals that always render, mature-parser name matching
   with real disambiguation, topics that never scope-reject, initial
   state an author can declare. Heuristic ceilings and "good enough for
   now" approximations are rejected on principle — if a mechanism can't
   scale to a full canonical game (Chord-Zork), it's the wrong mechanism.
2. **100% Sharpee == 100% Chord.** Everything delivered here is fully
   authorable from Chord, and behavior is identical across TS-authored
   and Chord-authored stories *by construction* (shared helpers, single
   derivation points — never parallel implementations). Option choices
   are mechanism choices; scope reduction is never an option.

When a later phase finds a conflict between this lens and a cheaper
path, stop and surface it — do not take the cheaper path silently.

**Created**: 2026-07-17
**Derives from**: ADR-231 (`docs/architecture/adrs/adr-231-player-surface-contract-rulings.md`, ACCEPTED, all six decision areas D1-D6 ruled by David 2026-07-17, interview, session 1befbd) + ADR-230 (`docs/architecture/adrs/adr-230-grammar-reachability-completion.md`, precedent for phase style, the D1 pinning-before-code discipline, and the dungeo walkthrough/phrasebook verification bar) + ADR-229 (R2 key-slot-consultation pattern, cited by D1's key/tool consultation shape) + ADR-218 (§1a, the Chord catalog-adjective/grammar-header precedent D2a corrects)
**Overall scope**: Close the seven phrasebook verification gaps ADR-231 grounded in code — refusal-key provenance/namespace (D1), dead parse-time trait gating and rule specificity (D2), word-level name vocabulary (D3), a first-class topic field (D4), Chord `starts <state>` + closed-by-default containers (D5), and a dedicated persisted action RNG stream (D6) — plus the plain defects the ADR's Consequences section carries without a separate ruling. All platform work — nothing here is implemented until David approves this plan (root `CLAUDE.md`: "Platform changes require discussion first").
**Bounded contexts touched**: parser-en-us (grammar, rule specificity, slot types), stdlib (actions' `blocked()`/`validate()`, lifecycle engine, command-validator, action-context), world-model (entity identity/name construction, trait defaults), lang-en-us (messages), engine (action-context-factory, save-restore, prose-pipeline renderer), packages/chord + packages/story-loader (Chord compiler frontend + loader), packages/helpers (builders), docs/reference (chord-language.md, chord.ebnf, stdlib-reference.md, chord-grammar-changes.md ratchet)
**Key domain language**: refusal-key provenance (interceptor-originated vs action-internal), fully-qualified message id, content-word vocabulary, scored candidate matching, first-class topic field (`{ text, entity? }`), `starts <state>` initializer (derivable state-adjective, never stored — the shadow-state ratchet), dedicated action RNG stream, capability dispatch (ADR-090), reachability gate (ADR-230 D1), grammar ratchet (`docs/architecture/chord-grammar-changes.md`)

## References consulted

- `docs/architecture/adrs/adr-231-player-surface-contract-rulings.md` — the ACCEPTED source-of-truth decision record (D1-D6); every phase below traces to one of its six decisions or its Consequences-listed defects.
- `docs/architecture/adrs/adr-230-grammar-reachability-completion.md` — establishes the pinning-before-code discipline this plan's Phase 1 follows, the reachability-gate pattern D2/D3/D4 must not regress, and the dungeo-walkthrough-chain + unit-transcript verification bar for grammar/matching changes.
- `docs/architecture/adrs/adr-229-interceptor-surface-completion.md` — R2's key-slot consultation shape (target → key, explicit-only, symmetric seedData) is the precedent D1's fixed_in_place fix and any future tool/key consultation touch points must match.
- `docs/architecture/adrs/adr-218-chord-foundations.md` — §1a is the source of the "parse-time trait gating" comments D2a's ruling says must be corrected; this plan's research (below) found the underlying claim more nuanced than the ADR states, which changes D2a's implementation shape without changing David's ruling.
- `docs/work/grammar-reachability/plan.md` — the immediate precedent this plan matches in phase style, tiering, and verification conventions (pins-phase-first, per-phase Status/Exit-state discipline, Integration Reality Statements for owned-dependency phases).
- `docs/context/project-profile.md` — TS strict mode, four-phase action pattern, message-ID-only discipline (no embedded English outside lang-en-us), Vitest conventions, uniform lockstep versioning; the "reporting without mutation" mutation signatures this plan's tests must avoid.
- `CLAUDE.md` (root) — never auto-retry failed builds/tests (report and wait); platform changes require discussion before implementation — this plan is that discussion artifact; build commands (`./repokit build`), transcript testing via `dist/cli/sharpee.js --test --chain`.
- `packages/stdlib/CLAUDE.md` — capability-dispatch decision tree (ADR-090) D6's WeaponBehavior rng-param plumbing and D5a's `starts <state>` trait-pairing must respect; lifecycle-engine/wired-action-registry conventions (ADR-228) D1's provenance change and any new/changed action touch; `TEST_MARKER_TRAIT` interceptor-test convention; capability-effect fully-qualified-id rule (2026-07-02 P1 regression) that is the direct precedent for D1's "interceptor-originated errors are never prefixed" ruling.
- `packages/parser-en-us/CLAUDE.md` — `.forAction()`/`.define()` grammar-authoring conventions constraining D2b's confidence-rule and priority-bump changes and D4's topic-slot grammar changes.
- Session memory `never-turn-off-randomness.md` — policy: never seed/disable story RNG; D6's dedicated action stream is routing-only infrastructure, story-level RNG policy stays untouched.
- Session memory `one-good-run-rule.md` — dungeo walkthrough chain: a single passing run is baseline; thief/combat/carousel RNG death flakes are not regressions.
- Session memory `no-borrowed-traits-in-tests.md` — interceptor/pinning-test fixtures use `TEST_MARKER_TRAIT`, never a borrowed real trait as a registration key.

## Pre-plan research findings that change scope (read before Phase 1)

A research pass against the live codebase (not just the ADR text) sized all six decision areas and surfaced one finding material enough to revise a ruling's factual basis, plus two findings that narrow scope. All three are folded into the phases below; the first is also carried into Phase 1 as a required pin item so David can confirm the ruling still stands before Phase 4 (D2a) deletes anything.

1. **D2a's "dead code" premise is contradicted — `traitFilters` is live, not inert.** The ADR's Context section states `.hasTrait()` writes `traitFilters` that "no consumer ever evaluates," citing `entity-slot-consumer.ts:303,378`. That file (`packages/parser-en-us/src/slot-consumers/entity-slot-consumer.ts`) has **zero** `hasTrait`/`traitFilters` references. The actual consumer is `packages/parser-en-us/src/grammar-scope-resolver.ts:77-83`, which filters entity-slot candidates via `entityHasTrait` on every `traitFilters`-bearing rule (~35 call sites in `grammar.ts`). This does not overturn David's ruling — parse-time trait gating still moves to validate(), and the mechanism is fully consistent with the ADR's own live-repro examples: a trait filter with no matching candidate makes the *rule fail to match* (not "match and no-op"), so parsing falls through to a less-specific rule via the priority tie-break (`get in sedan chair` → entering's rule can't match, taking's broader pattern wins). What changes is the deletion's blast radius: removing `.hasTrait()` makes every one of those ~35 rules match syntactically-eligible input it previously silently rejected, so each corresponding action's `validate()` needs an audit — confirm it already refuses the ungated case (most do, per the four-phase pattern) or add the missing refusal as a defect fix. Phase 4 opens with this audit, not a blind deletion.
2. **D1's "all Chord key sites" dotted-key scope is 4 call sites, not a broad sweep.** `readDottedKey()` (`packages/chord/src/parser.ts:2059`) is already correct and already used once (line 1858). Three sites read a single token instead: `parseActionRefusal` (~1018), `parseRefuseWhenStatement` (~1033), `parsePhrasesBlock` entries (~1058). `parseDefinePhrase` (the ADR-230 Phase 8 fix) has its own hand-rolled dot-continuation loop rather than calling `readDottedKey` — a 4th, optional, consistency-only refactor. Sizes Phase 3 as Small, not Medium.
3. **D4's TOPIC slot type is already partially wired.** `SlotType.TOPIC` and `TextSlotConsumer` (`packages/parser-en-us/src/slot-consumers/text-slot-consumer.ts:18,31,180`) already handle topic-typed slots end to end — the gap is narrower than "unused by core grammar" suggests: no core grammar rule (`grammar.ts:638,645,654,661,668`) declares `:topic` as that slot type, so it defaults to an entity slot, and the structure-builder (`english-parser.ts:815-915`) has no `TOPIC` branch populating a first-class field (the type doesn't exist yet on `IParsedCommand`/`IValidatedCommand`). Phase 7's scope is the grammar-rule slot-type declarations, the structure-builder branch, and the new field — not new consumer-side machinery.

Also noted, not scope-changing: the 8 ad-hoc dotted-key `blocked()` sites match the ADR's list exactly (asking, closing, cutting, digging, opening, talking, taking, telling — all confirmed at the cited pattern); `giving.ts`/`showing.ts` do **not** use that pattern (different construction) — confirm their `blocked()` shape during Phase 2 before assuming they need the same edit as the 8. `packages/stdlib/vitest.config.ts`'s `resolve.alias` is configured correctly, but the stdlib suite has repeatedly resolved `parser-en-us`/`lang-en-us` to `dist` in practice (grammar-reachability Phase 6 note) — every phase below that gates on the stdlib suite rebuilds via `./repokit build` first.

## Phases

### Phase 1: Pin the four design surfaces
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: cross-cutting design decisions every later phase depends on — no production code changes, this phase produces decisions and a companion document (ADR-230 Phase 1 precedent).
- **Entry state**: ADR-231 ACCEPTED; this plan drafted.
- **Deliverable**: a pinning document `docs/work/player-surface-contracts/pins.md` David reviews and signs off on, containing:
  1. **PIN D1 — provenance-marking shape.** Concrete proposal: does the ADR-228 lifecycle engine (which owns interceptor consultation) attach a boolean/discriminant field to its result object (`InterceptorResult` — currently a plain `{ valid: false, error: string }` per `packages/story-loader/src/runtime.ts:1293-1307` and the 4 call sites that build it), or does it wrap the error in a distinct type (e.g. `QualifiedError` vs `bareError: string`)? Pin the exact field name/type and which of the two shapes stdlib's ~37 `blocked()` implementations check to skip qualification. Cross-reference: `requireCarriedOrImplicitTake` (`packages/stdlib/src/actions/enhanced-context.ts:135-160`) builds its own `ImplicitTakeResult` with an unqualified `fixed_in_place` key — confirm this same provenance field covers helper-produced errors, not only interceptor-consulted ones, or pin a second discriminant if the two cases need different plumbing.
  2. **PIN D3 — "content word" definition and the candidate-scoring function shape.** Define what counts as a content word for name-vocabulary derivation (stopword policy: articles/prepositions excluded; does "of," "the," "a" get stripped from "bag of holding" leaving {bag, holding}, or does "of" count as content because it's mid-compound-noun?). Pin the scoring function's signature and tie-break rule precisely: `score(candidateWords: Set<string>, queryWords: string[]): number`, exact-full-text beats more-matched-words beats fewer-matched-words, and confirm the disambiguation trigger condition on ties (same score, 2+ candidates → normal disambiguation prompt; same score, 1 candidate → auto-resolve). Confirm where the shared helper lives (world-model, called once at identity construction — `packages/world-model/src/entities/if-entity.ts`'s `name` getter is the existing centralized name-resolution point and the natural site to add vocabulary derivation alongside).
  3. **PIN D4 — topic field's exact location and type.** Confirmed by research: add `topic?: { text: string; entity?: EntityId }` to both `IParsedCommand` (`packages/world-model/src/commands/parsed-command.ts:149-201`, alongside the existing `instrument` field — same shape precedent) and `IValidatedCommand` (`packages/world-model/src/commands/validated-command.ts:24-52`, same placement). Pin whether `entity` is a full entity reference or an `EntityId` (recommend `EntityId`, matching `instrument`'s shape) and confirm `textSlots`/`extras` are untouched (the ADR's explicit constraint).
  4. **PIN D2a-CONTRADICTION — confirm the re-scoped ruling.** Per pre-plan finding #1 above: `traitFilters` is consumed by `grammar-scope-resolver.ts`, not dead. David confirms the ruling stands as originally intended (parse-time trait gating still removed; refusal moves to validate()) with the corrected understanding that deletion changes match behavior for ~35 rules, requiring a validate()-level refusal audit in Phase 4 rather than a pure code-deletion. If David wants a narrower or staged approach given this correction, amend here before Phase 4 starts.
  5. **PIN D5a — `starts <state>` pairing-error message ids and grammar production shape.** Pin the exact analyzer diagnostic codes for each mismatch (`starts locked` without `lockable` composed; `starts closed`/`starts open` without `openable`; `starts off`/`starts on` without `switchable`) and confirm the grammar production reuses the existing `starts` line-loop dispatch in `packages/chord/src/parser.ts` (precedent: `starts in` at line 465, trait-field `starts` at line 1334) rather than a new top-level keyword.
- **Exit state**: `pins.md` written and committed; David has reviewed and confirmed or amended all five pins above. No later phase may improvise on these decisions — if a later phase discovers a pin is wrong, stop and re-pin rather than diverging silently.
- **Status**: COMPLETE (2026-07-17 — all five pins signed off as proposed; PIN 2 ruled computed-on-demand; PIN 4 resolved the pre-plan finding #1 contradiction as a same-name/different-type conflation, no re-scope)
- **David-review checkpoint**: MANDATORY — satisfied 2026-07-17.

### Phase 2: D1a — refusal-key provenance pass-through (stdlib + engine)
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: ADR-228 lifecycle engine (provenance marking), stdlib `blocked()` implementations across all actions (qualification removal), `requireCarriedOrImplicitTake` (fixed_in_place producer fix), engine prose-pipeline renderer (dev-warning), wearing's missing message params (same-file defect, rides here).
- **Entry state**: Phase 1's PIN D1 confirmed. **Status: CURRENT.**
- **Deliverable**:
  - The lifecycle engine marks provenance on an interceptor-consultation result per PIN D1's confirmed shape, as it crosses from consultation into the blocked path.
  - Every `blocked()` implementation across stdlib's action directories stops qualifying interceptor-originated errors (checks the PIN D1 discriminant before building `${action.id}.${error}`); action-internal validation errors keep today's qualification. The 8 ad-hoc dotted-key escape sites (asking, closing, cutting, digging, opening, talking, taking, telling) are removed as dead branches once the general provenance check supersedes them.
  - `requireCarriedOrImplicitTake` (`enhanced-context.ts:135-160`) emits taking's `fixed_in_place` key as fully-qualified (`if.action.taking.fixed_in_place`) rather than a bare key giving/showing then mis-prefix into their own namespace; confirm giving.ts/showing.ts's actual `blocked()` shape first (pre-plan finding: they don't match the 8-site pattern) and adjust whichever construction they use.
  - `packages/engine/src/prose-pipeline/phrase-render.ts:55-64` — the unregistered-id null-return path gains a dev-mode warning (logger call, no behavior change to the return value).
  - Wearing defect fix (rides here, same file area as the D1 pinning target): `wearing.ts:110/123/125` (`not_wearable`/`already_wearing`/`cant_wear_that`) gain the missing message params, mirroring the taking-off pattern.
  - Rejection/pinning tests (named per the ADR's explicit requirement): a bare interceptor key round-trips to rendered text on wearing or giving — an action that formerly always prefixed — asserting the rendered string is non-blank and matches the registered phrase, not just "no error thrown."
- **Exit state**: `pnpm --filter '@sharpee/stdlib' test` green (rebuild parser-en-us/lang-en-us dist first per the known vitest-alias gotcha); `pnpm --filter '@sharpee/engine' test` green; the two shipped-doc blanks (stdlib-reference §2 iron-ring, chord-language.md hive-box examples) render correct text when spot-checked against the CLI bundle; phrasebook verify (`node docs/work/stdlib-phrasebook/verify.mjs` or equivalent invocation) stays 68/68; dungeo walkthrough chain one clean run (message-text changes only, but refusal routing changed broadly enough to warrant the full chain per policy).
- **Status**: PENDING

### Phase 3: D1b — Chord dotted-key parser fix, all remaining sites
- **Tier**: Small
- **Budget**: 150
- **Domain focus**: `packages/chord/src/parser.ts` only, plus regression tests and doc/EBNF alignment. Independently orderable — no dependency on Phase 2; placed here because it completes the same D1 decision.
- **Entry state**: Phase 1 confirmed (no new pin needed — `readDottedKey` is an existing, already-correct precedent per ADR-230 Phase 8).
- **Deliverable**: `parseActionRefusal` (~1018), `parseRefuseWhenStatement` (~1033), and `parsePhrasesBlock` entry parsing (~1058) switch from single-token key reads to `readDottedKey(c)`; `parseDefinePhrase`'s hand-rolled dot-continuation loop is refactored to call the same helper for consistency (optional, do if it doesn't risk the ADR-230 Phase 8 regression coverage). `chord.ebnf` confirmed already states `phrase-key = WORD { "." WORD }` generically — no EBNF change needed, this is a parser-conformance fix; `chord-language.md`'s phrase-key section gets a note (fold into Phase 11's doc pass, not duplicated here).
- **Exit state**: unit tests on the Chord parser/analyzer assert dotted keys register whole at all 4 sites (IR phrase-key field, not just "no diagnostic"); `pnpm --filter '@sharpee/chord' test` and `pnpm --filter '@sharpee/story-loader' test` green.
- **Status**: PENDING

### Phase 4: D2a — delete parse-time trait gating (audit + removal)
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: parser-en-us (`grammar.ts` ~35 `.hasTrait()` call sites, `grammar-builder.ts`, `grammar-scope-resolver.ts`), stdlib (`validate()` audit across every action whose grammar rule carried a trait filter), ADR-218 §1a comment correction, `grammar.ts` file-header correction.
- **Entry state**: Phase 1's PIN D2a-CONTRADICTION confirmed (David has reviewed the re-scoped understanding and the ruling stands).
- **Deliverable**:
  - **Audit first**: for each of the ~35 `.hasTrait()` call sites in `grammar.ts`, confirm the mapped action's `validate()` already refuses the ungated case (e.g. entering a non-ENTERABLE target, climbing a non-CLIMBABLE object). Where a refusal is missing, add it as a defect fix before deleting the corresponding grammar-side gate — an invariant (every trait-gated verb refuses in-action) must not be silently weakened.
  - `.hasTrait()` is removed from the grammar builder API (`packages/if-domain/src/grammar/grammar-builder.ts`) and from every `grammar.ts` call site; `traitFilters` storage and its consumption in `grammar-scope-resolver.ts:77-83` are deleted together (no orphaned plumbing).
  - `docs/architecture/adrs/adr-218-chord-foundations.md` §1a's comments and `packages/parser-en-us/src/grammar.ts`'s file header (line 6, "100+: Semantic rules with trait constraints (e.g., .hasTrait(...))") are corrected to state `.where()` function constraints are the one parse-time gating mechanism.
  - `.where()` constraints are left untouched — they are not part of this deletion.
- **Exit state**: no `.hasTrait(` occurrences remain in `packages/parser-en-us/src`; every audited action's `validate()` refuses correctly (asserted by tests, not just "didn't throw"); `pnpm --filter '@sharpee/parser-en-us' test` and `pnpm --filter '@sharpee/stdlib' test` green; dungeo walkthrough chain one clean run (RNG death flakes not regressions); phrasebook verify 68/68.
- **Status**: PENDING

### Phase 5: D2b — literal-before-slot confidence rule + priority bumps
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: parser-en-us rule-matching/scoring (wherever tie-breaking currently defaults to registration order, near `english-parser.ts`'s priority-assignment points) plus the ~10 mechanical `withPriority()` bumps in `grammar.ts`.
- **Entry state**: Phase 4 landed (D2a removes the trait-gating fallthrough this phase's confidence rule must now arbitrate cleanly — matching order matters).
- **Deliverable**:
  - The ~10 mechanical priority bumps land first, as defect fixes independent of the confidence-rule logic (the grammar file's own header mandates 100+ for semantic rules — some current entries are below that).
  - A general confidence rule: a rule whose literal tokens consume words outranks a rule whose unconstrained slot swallows the same words (`get in :portal` beats `get :item` for "get in basket" structurally). Per-rule `.withPriority()` remains an explicit override layered on top, not replaced.
- **Exit state**: `pnpm --filter '@sharpee/parser-en-us' test` green; `pnpm --filter '@sharpee/stdlib' test` green; **full dungeo walkthrough chain** (one clean run, explicit ADR requirement since this re-scores many parses subtly) + unit transcripts green; phrasebook verify 68/68.
- **Status**: PENDING

### Phase 6: D3 — word-level name vocabulary + scored matching
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: world-model (shared identity-construction helper, `if-entity.ts`'s `name` getter area), stdlib (`command-validator.ts:635-718` exact-match resolution → scored resolution), story-loader (`loader.ts:~714` vocabulary derivation from names), parser-en-us (`INounPhrase.articles` population, `english-parser.ts:857-891`).
- **Entry state**: Phase 1's PIN D3 confirmed.
- **Deliverable**:
  - A shared helper, called once at world-model identity construction, derives every content word of an entity's name as matchable vocabulary per PIN D3's stopword definition — shared so Chord-loaded and TS-authored entities behave identically by construction.
  - `command-validator.ts`'s resolution logic replaces exact-full-text-only matching with the scored candidate function from PIN D3: exact full text beats more-matched-words beats fewer; ties trigger normal disambiguation.
  - `loader.ts` derives vocabulary from names at load time (currently it does not); explicit `aka` aliases stay additive on top.
  - `INounPhrase.articles` (currently hardcoded `[]` at 3 sites in `english-parser.ts`) is populated; articles are stripped before matching, full-text-first so proper names beginning with an article-like word survive.
  - Story-wide behavior change is expected and accepted per the ruling: entities sharing a word now disambiguate where they previously missed silently.
- **Exit state**: `pnpm --filter '@sharpee/world-model' test`, `pnpm --filter '@sharpee/stdlib' test`, `pnpm --filter '@sharpee/parser-en-us' test`, `pnpm --filter '@sharpee/story-loader' test` all green; `x key`, `x brass key`, `x bag` (of holding)-class names resolve with zero authoring, verified live against the CLI bundle; **full dungeo walkthrough chain** one clean run + unit transcripts (explicit ADR requirement — story-wide parser behavior change); phrasebook verify 68/68.
- **Status**: PENDING

### Phase 7: D4 — first-class topic field, entity-first resolution
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: world-model (`IParsedCommand`/`IValidatedCommand` new `topic` field per PIN D4), parser-en-us (`grammar.ts`'s 5 ask/tell rules mark `.topic()`, structure-builder TOPIC branch), stdlib (`command-validator.ts` stops entity-rejecting topic slots, asking.ts/telling.ts read the real field).
- **Entry state**: Phase 1's PIN D4 confirmed.
- **Deliverable**:
  - `topic?: { text: string; entity?: EntityId }` added to both command interfaces per PIN D4's confirmed location.
  - The 5 ask/tell grammar rules (`grammar.ts:638,645,654,661,668`) are marked `.topic()` (or the pattern-builder's equivalent slot-type declaration) instead of defaulting to entity-slot resolution.
  - The structure-builder (`english-parser.ts:815-915`) gains a `TOPIC` branch that populates the new field — leveraging the already-wired `TextSlotConsumer` (pre-plan finding #3: this consumer-side machinery already exists).
  - `command-validator.ts` stops entity-resolving/scope-rejecting topic slots; resolution is entity-first with text fallback — a topic naming an in-scope entity carries that entity, anything else flows through as free text, never scope-rejected.
  - `asking.ts`/`telling.ts` read the real `command.topic` field; the dead `structure.extras.topic` fallback (confirmed non-functional — `extras` is not nested under `structure`) is deleted.
  - `unknown_topic` renders the topic text verbatim for free-text topics.
  - **Rejection test named per the ADR's explicit requirement**: a free-text topic naming no in-scope entity does NOT get scope-rejected — asking/telling proceed with `{ text, entity: undefined }` and produce a normal response, not "You can't see any such thing."
- **Exit state**: `pnpm --filter '@sharpee/world-model' test`, `pnpm --filter '@sharpee/parser-en-us' test`, `pnpm --filter '@sharpee/stdlib' test` green; live spot-check: `ask troll about the weather` (free text, no matching entity) succeeds without scope rejection; `ask troll about lantern` (in-scope entity) carries the entity; dungeo walkthrough chain one clean run + unit transcripts; phrasebook verify 68/68.
- **Status**: PENDING

### Phase 8: D5a — Chord `starts <state>` initial-state clause
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: packages/chord (parser, analyzer, ast, ir), packages/story-loader (loader trait-data mapping), docs (`chord-grammar-changes.md` ratchet entry, `chord.ebnf`, `chord-language.md`).
- **Entry state**: Phase 1's PIN D5a confirmed. Independent of Phases 2-7 (different package family) but must land before Phase 9 (D5b), which relies on `starts open` as its escape hatch.
- **Deliverable**:
  - Chord parser gains `starts <state>` as a composition-line clause, reusing the existing `starts` keyword dispatch (precedent: `starts in` placement at `parser.ts:465`, trait-field `starts` at `parser.ts:1334`) — a container/actor/etc. line like `a container, openable, lockable with key the brass key, starts locked`.
  - The semantic analyzer enforces pairing per PIN D5a's diagnostic codes: `starts locked` requires `lockable` composed on the same entity, `starts closed`/`starts open` requires `openable`, `starts off`/`starts on` requires `switchable`. Mismatches are load-time errors, not silent no-ops.
  - The loader maps each accepted `starts <state>` to the corresponding trait's initial-value field (`isLocked`, `isOpen`, `isOn`, …) — the state-adjective itself is never stored as separate story state (the shadow-state ratchet: `locked`/`closed`/`open`/`on`/`off` stay derivable, only the trait's boolean is set).
  - `docs/architecture/chord-grammar-changes.md` gains a new dated entry in the existing table format (Date | Form | Rationale | Example | Decision) — this ruling IS the owner approval per the ADR.
  - `chord.ebnf` gains the `starts <state>` production; `chord-language.md` gets spec text (the narrative half; fold delivery here since it's new-feature documentation, not a truth-refresh — distinct from Phase 11's touch-up pass).
  - **Rejection test named per the ADR's explicit requirement**: `starts locked` on an entity without `lockable` composed produces the pinned analyzer diagnostic and fails to load (Integration Reality Statement: REAL-PATH test drives a Chord source string through the actual parser→analyzer pipeline, not a hand-built AST fixture).
- **Exit state**: `create the safe, container, lockable with key the brass key, starts locked` round-trips through the real loader into a `LockableTrait` with `isLocked: true` (REAL-PATH test, not a stub); pairing-violation fixtures produce the correct diagnostic and load error; `pnpm --filter '@sharpee/chord' test` and `pnpm --filter '@sharpee/story-loader' test` green.
- **Status**: PENDING

### Phase 9: D5b — closed-by-default containers
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: packages/helpers (`ContainerBuilder`'s `?? true` default), packages/story-loader (`loader.ts`'s `builder.openable()` pre-add removal), fixture/transcript sweep across every story using `container, openable`.
- **Entry state**: Phase 8 landed — `starts open` (D5a) is the author's explicit escape hatch this phase relies on before flipping the default; landing D5b first would silently break every currently-open-by-default story with no way to declare open.
- **Deliverable**: `packages/helpers/src/builders/container.ts:138`'s `isOpen: this._openable.isOpen ?? true` is aligned to the world-model trait's own default (`?? false`, `openableTrait.ts:80-81`); `loader.ts`'s pre-add of `builder.openable()` on the container branch (the lockable Phase 9a pattern per the grammar-reachability plan) is removed so the keyed/configured add always wins and the trait default (now closed) is authoritative everywhere. Fixture and transcript sweep: every `a container, openable` (no explicit state) across `stories/*` that assumed open-by-default gets an explicit `starts open` line or an updated transcript expectation.
- **Exit state**: `pnpm --filter '@sharpee/helpers' test`, `pnpm --filter '@sharpee/story-loader' test`, `pnpm --filter '@sharpee/world-model' test` green; dungeo walkthrough chain one clean run + unit transcripts (behavior change across every story with openable containers); phrasebook verify 68/68 (any fixture container states referenced there checked against the new default).
- **Status**: PENDING

### Phase 10: D6 — dedicated persisted action RNG stream
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: engine (`action-context-factory.ts`, `game-engine.ts`'s existing `SeededRandom` instance, `save-restore-service.ts` — new serialization, no reusable persistence precedent exists per research), world-model (`WeaponBehavior.calculateDamage` — rng injected as a parameter, world-model stays engine-free), stdlib (`throwing.ts`'s 6 `Math.random()` sites, `inventory.ts`'s 1 site).
- **Entry state**: none of the grammar-program phases (2-9) block this; independently orderable.
- **Deliverable**:
  - A new dedicated seeded stream (separate from the existing turn-plugin/scheduler/basic-combat streams — sharing was explicitly rejected in the ruling) is created and threaded into `ActionContext` as `ActionContext.random` via `createActionContext()` (`action-context-factory.ts:66`).
  - The stream's seed is persisted across save/restore: `SeededRandom.getSeed()`/`setSeed()` (already declared in `packages/core/src/random/seeded-random.ts:26-30` but never called by `game-engine.ts`) are wired into `createSaveData()`/the restore path (`save-restore-service.ts`) — this is new plumbing end-to-end, no existing subsystem's persistence code can be copied verbatim (research finding: the scheduler's own persistence pattern was not found reusable as a drop-in).
  - `throwing.ts`'s 6 `Math.random()` sites (lines 342, 350, 357, 367, 406, 418) switch to `context.random`.
  - `WeaponBehavior.calculateDamage` (`weaponBehavior.ts:31-43`) gains an `rng` parameter (the deadly-room precedent — world-model stays engine-free, the caller in stdlib's attacking action passes `context.random`); its two internal `Math.random()` calls (damage roll, crit check) are removed.
  - `inventory.ts:140`'s message-variant `Math.random()` switches to `context.random`.
  - **Rejection/determinism test named per the ADR's explicit requirement**: post-restore action-roll determinism — save mid-combat (or mid-throw), restore, replay the same action sequence, and assert the roll outcomes are identical to a fresh run seeded the same way (Integration Reality Statement: REAL-PATH test drives the actual save/restore service, not a hand-rolled RNG stub standing in for it).
- **Exit state**: `pnpm --filter '@sharpee/engine' test`, `pnpm --filter '@sharpee/stdlib' test`, `pnpm --filter '@sharpee/world-model' test` green; the determinism test passes against the real save/restore path; no `Math.random()` remains in `throwing.ts`, `weaponBehavior.ts`, or `inventory.ts`'s message-variant pick; story-level RNG (dungeo's thief/combat/carousel) is untouched and dungeo walkthrough chain one clean run confirms no accidental determinism regression there (RNG death flakes still not regressions — this phase does not seed or disable story randomness).
- **Status**: PENDING

### Phase 11: Doc + site refresh
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: `docs/reference/stdlib-reference.md`, `docs/reference/chord-language.md`, `docs/reference/stdlib-phrasebook.md`, site re-render.
- **Entry state**: Phases 2-10 landed.
- **Deliverable**: `stdlib-reference.md` §2 touch-up confirming the two shipped-doc blanks (iron-ring, hive-box) now render correct text under D1's pass-through; `chord-language.md` gains the dotted-key narrative-doc subsection (D1b, folded from Phase 3), confirms D5a's `starts <state>` spec text landed with Phase 8 rather than being duplicated here, and documents D5b's closed-by-default change with `starts open` as the escape. Phrasebook (`docs/reference/stdlib-phrasebook.md`) and its fixtures regenerated/re-verified. Site re-render per the existing build process.
- **Exit state**: `node docs/work/stdlib-phrasebook/verify.mjs` (or its documented invocation) reports 68/68; stdlib-reference.md and chord-language.md no longer contradict shipped platform behavior; site re-rendered, tag-balanced, new content spot-checked.
- **Status**: PENDING
