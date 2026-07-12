# Session Plan: Chord `each` Package — Quantified Conditions + Iteration

**PLAN ONLY. No implementation happens from this document by itself.**
**Implementation starts only on David's explicit go-ahead**, given after he
has reviewed this plan (and, within it, after he has approved every Phase 1
ratchet entry — see Phase 1 below, which is itself governance work, not
grammar work — exactly the same hard gate Phase C's Phase 1 used).

**Created**: 2026-07-12
**Overall scope**: Implement the `each` package
(`docs/work/chord/each-iteration-proposal.md`) — three grammar forms that
land together as one atomic pipeline slice (lexer → parser → analyzer → IR →
evaluator → runtime, no partial landings): **E1** `any <open-condition>`
existential condition (REBUILD — no `any` parse code survives Phase C's
removals; this is new construction against the analyzer's surviving
open/closed classification, not a revival); **E2** `no <open-condition>`
negated existential (its own positive spelling, the universal-quantifier
dual — no `every` form ships); **E3** `each <open-condition> … end each`
body-position iteration block with the `the match` binder (value kind
`match`; `it` stays the clause owner, no shadowing). Hosts: `on`/`after`
clause bodies, action bodies, trait clause bodies, sequence steps — never
top-level, per Given 9 (all behavior is owned). **No story migrations**:
Cloak (81/81) and Zoo (79/79) stay green untouched — this package proves
itself with a dedicated fixture story, not a shipping-story rewrite.
**Sequenced directly after Phase C** (closed 2026-07-12): Phase C's own
out-of-scope list named `each`/iterate as deferred "because the ownership
shape changes where those features would attach" — ownership shipped, the
attachment points (`on`/`after` bodies, trait clauses, sequence steps) now
exist.
**Bounded contexts touched**: N/A — infrastructure/tooling. No
`docs/ddd/notation.yaml` exists in this repo; this plan uses Sharpee's own
established platform vocabulary (traits, behaviors, IR, analyzer gates), per
Phase A/B/C precedent. (Chord the *language* is itself DDD-informed, but
that is the subject of the work, not a reason to model this plan's own
phases as bounded contexts.)
**Key domain language**: open condition / closed condition (`define
condition`, analyzer's `openConditions` classification), existential
condition (`any`), negated existential (`no`), iteration block (`each …
end each`), `the match` binder, creation-order enumeration, empty-set
semantics (any=false, no=true, each=no-op), never-guess gate
(`analysis.open-condition-truth`, new `analysis.match-outside-each`).

## References consulted

- `docs/work/chord/each-iteration-proposal.md` — THE spec for this plan.
  Status: DESIGN SETTLED (David, 2026-07-12), amended after adr-review
  (7/11 → fixed same day): §3.5 pins the pipeline/IR contracts this plan's
  Phase 2/3 must implement verbatim (condition kinds `any-of`/`none-of`,
  statement kind `each`, value kind `match`; enumeration domain = all world
  entities including player and rooms, creation order); §7's four
  checkpoints are all answered (any+no only, no `every`; `the match` binder;
  numeric cardinality/comparisons stay fenced out; E3's host list
  confirmed) — this plan does not reopen any of them. Where this plan
  summarizes, the proposal wins on conflict. It also states the corrected
  claim this plan's Phase 2 must honor exactly: "no `any` parse code
  survives in parser.ts" — Phase C's P2 removed `any`'s only host (when-rule
  targets) with the rule itself, so E1 is new construction, not a revival.
- `docs/architecture/chord-grammar-changes.md` (the one-way ratchet log) —
  two entries directly bound this plan's Phase 1. The 2026-07-11 "Open
  conditions as selections" entry already reserved `each <condition-name>`
  "for iterate/cardinality positions when those constructs land" and
  recorded the open/closed classification this package's gates reuse
  unchanged. The 2026-07-12 "Phase C ownership package — as-shipped
  reconciliation" entry records `any` as DORMANT, explicitly "revives with
  the `each`/iterate backlog" — i.e. this package. Phase 1's job is closing
  both entries' open threads with dated, David-approved E1–E3 entries; per
  the log's append-only discipline, neither existing entry is edited, only
  superseded.
- `docs/architecture/adrs/adr-210-story-language.md` — ACCEPTED, the
  umbrella ADR. Consequences section binds this plan on two points: grammar
  additions are a one-way ratchet requiring a dated decision against this
  ADR's lineage (Phase 1's whole job, same as every prior Chord phase), and
  the IR's two reference implementations (loader now, emitter later) "must
  stay behavior-equivalent" — Phase 3's IR additions (`any-of`/`none-of`/
  `each`/`match`) are a compatibility surface checked via `ide-protocol`
  builds, not a free internal edit. `packages/ide-protocol/src/
  story-ir.ts` re-exports `StoryIR`/`IRStatement`/`IRCondition` directly
  from `@sharpee/chord`, confirming the wire-type coupling is real, not
  theoretical.
- `docs/context/project-profile.md` — pnpm/Turborepo/tsf build conventions,
  Vitest + `.transcript` fixture/integration test conventions, TS strict
  mode, and the language-layer separation convention — this plan's phases
  keep honoring these, not relax them.
- `docs/context/session-20260712-0000-v2-210-chord-a.md` (most recent
  session file) — records Phase C fully CLOSED and pushed (`9c3f6acc`),
  and records this package's own design settling in the same session
  ("Each package — design settled... Next: implementation package
  go-ahead (Phase 1 = log ratchet entries + plan)" — i.e., this plan is
  exactly the requested next step). Also records a deferred, unrelated
  platform follow-up (hatch-context `'chord.'` lint hardening) that is
  explicitly out of scope for this package and not touched by any phase
  below.

## Platform-touch forecast (identified up front, per CLAUDE.md)

The proposal states the forecast directly (§4): **chord + story-loader
only** — zero expected changes to `packages/stdlib`, `packages/world-model`,
`packages/engine`. The evaluator for `any`/`no`/`each` enumerates world
entities and evaluates the named open condition with `it` bound per entity —
this is a pure read over existing world queries (the same
`WorldModel.getAllEntities()`-shaped enumeration the loader's existing
scope/co-location checks already use), not a new mutation surface or a new
world-model capability.

Packages this plan expects to touch: `@sharpee/chord` (lexer — no new
tokens, `any`/`no`/`each`/`match` are already-lexed words; parser — three
new forms; analyzer — never-guess gates + `the match` scope resolution; IR —
the wire-type additions above), `@sharpee/story-loader` (evaluator —
existential/negated-existential eval; runtime — `each` block execution),
and `@sharpee/ide-protocol` (no source change expected — its re-export of
the Chord IR types must simply keep building clean against the new IR
shapes; this is the wire-type check, not a feature addition).

**No `packages/` touch beyond this list is expected.** Any surprise touch to
`stdlib`/`world-model`/`engine` discovered during implementation is a
checkpoint trigger, not a silent scope addition — stop and discuss with
David before touching anything outside the packages named above, per
CLAUDE.md's "Platform changes require discussion first" rule. Unlike Phase
C's Risk 1 (the on/after-dispatch-verb routing question), this package
identifies no comparably uncertain platform-touch risk at plan time — the
enumeration-over-world-entities mechanism is new *usage* of an existing
query shape, not a new mechanism requiring a spike.

## Mid-package tree honesty (no shipping-story indirection needed this time)

Phase C's plan needed a fixture-indirection ground rule because its removals
(`define flag`) broke shipping-story-reading tests mid-package, before the
migration phase caught up. This package removes nothing — E1/E2/E3 are pure
additions on top of the surviving open/closed condition classification — and
explicitly does not touch `stories/cloak-of-darkness/cloak.story` or
`stories/friendly-zoo/zoo.story` at all (§5 of the proposal: "No story
migrations this time... both gates must stay green untouched, which is
itself the no-regression proof"). No test loading a shipping-story path is
expected to need repointing at any phase boundary in this plan. If one is
found to need it anyway, that is itself a signal something is off-plan —
stop and check before proceeding, rather than silently adding an
indirection this package was not supposed to need.

## Checkpoints requiring David's decision

1. **Every Phase 1 ratchet entry** — E1/E2/E3's exact ratchet-log wording
   (form / rationale / example / decision columns, matching the existing
   table format) is drafted in Phase 1 but is not normative until David
   approves each dated entry individually. Phase 2 cannot start until all
   three are APPROVED. Unlike Phase C's Phase 1, the underlying *design*
   checkpoints are already resolved (proposal §7, all four answered David
   2026-07-12) — this gate is specifically about the ratchet log's own
   dated-entry discipline (every grammar change needs one, per ADR-210's
   Consequences), not about reopening design questions.
2. **Any surprise `packages/` touch** outside `@sharpee/chord`,
   `@sharpee/story-loader`, and the `ide-protocol` wire-type check (see
   Platform-touch forecast) — stop and discuss before building, per
   CLAUDE.md.

No other design checkpoints are open. Unlike Phase C, this plan carries no
analogous Risk-1-shaped "resolve by spike in Phase 1" item — the proposal's
§4 interactions review already checked E1–E3 against Given 5 (no counting),
Decision 10 (owner-scoped narration — iteration adds no narration semantics
of its own), and AC-5 (RNG determinism via fixed creation-order enumeration)
and found no open mechanism question, only implementation work.

## Phases

### Phase 1: Ratchet finalization — E1/E2/E3 grammar entries
- **Tier**: Small
- **Budget**: 100 tool calls
- **Domain focus**: Governance only — no parser, analyzer, or loader code.
  `docs/architecture/chord-grammar-changes.md` (the one-way ratchet log) and
  the two open threads it already carries (`any` reserved 2026-07-11,
  recorded DORMANT 2026-07-12, "revives with the `each`/iterate backlog").
- **Entry state**: `each-iteration-proposal.md` is DESIGN SETTLED and
  amended (David, 2026-07-12, all four §7 checkpoints answered); this plan
  itself is approved by David as the phase breakdown to work from; no
  grammar or code work has started.
- **Deliverable**:
  - Three dated, PROPOSED ratchet entries (form / rationale / example /
    decision columns, matching the existing table format), each closing one
    proposal section verbatim:
    - **E1** — `any <open-condition>` as an existential condition, legal
      wherever a condition is legal (`while`, statement `when` suffixes,
      `refuse when`, `must` predicates via `be`); true iff some entity
      satisfies the named open condition, false over the empty set.
      Never-guess: `any <closed-condition>` is a load error (existing gate
      class, revived). Note explicitly in the entry that this supersedes
      the 2026-07-11 entry's reservation and the 2026-07-12
      as-shipped-reconciliation's "DORMANT" note — the log's append-only
      discipline means those entries stay as written; this new entry
      records the revival, it does not edit them.
    - **E2** — `no <open-condition>` as the negated existential; true iff no
      entity satisfies the condition, true over the empty set. Its own
      positive spelling (not `not any`) — same one-form-per-polarity
      reasoning as D6. Record explicitly: `refuse when no <name>: key` is
      legal (a positive form); `refuse when not any <name>` stays an error
      under D6's existing negated-requirement gate.
    - **E3** — `each <open-condition> … end each` as a body-position
      iteration block, hosted in `on`/`after` clause bodies, action bodies,
      trait clause bodies, and sequence steps (never top-level, per Given
      9). Binder `the match` (design.md §3's binder, kept — `it` continues
      to mean the clause owner, no shadowing). Order: stable creation-order
      enumeration, pinned in the entry as the source of AC-5 RNG-determinism
      inside the block. Empty set: no-op. Nesting: legal, `the match` binds
      innermost. Never-guess: `each <closed-condition>` is a load error with
      an open-condition fix-it.
  - A recorded note (not a fourth ratchet-table row — per the log's "what
    does not count as a grammar change" rule, IR-only schema shape is not a
    surface-syntax change) pointing at where the IR wire-type contract
    (condition kinds `any-of`/`none-of`, statement kind `each`, value kind
    `match`, per proposal §3.5) will be implemented in Phase 3, so Phase 3
    has a single source of truth to build against without re-deriving it
    from the proposal.
  - Confirmation that the `analysis.open-condition-truth` diagnostic's
    existing fix-it text ("Use `any <name>` in a selection position") will
    go live rather than stay aspirational once E1 ships — flag this as the
    one existing-message-text dependency Phase 3 must close out.
- **Exit state**: all three ratchet entries are either APPROVED (dated,
  normative, ready for Phase 2 to implement verbatim) or sent back with
  changes requested. **No Phase 2 work starts until all three are APPROVED
  by David** — the same hard gate Phase A/B/C's Phase 1 used.
- **Status**: COMPLETE (2026-07-12 — E1/E2/E3 logged in
  chord-grammar-changes.md and all three APPROVED by David, each-package
  P1 sign-off)

### Phase 2: Chord frontend — lexer/parser for any/no/each/match
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: `@sharpee/chord` lexer/parser/AST — parsing the three
  new forms as pure additions (no removals this package, unlike Phase C).
- **Entry state**: Phase 1 complete — all three ratchet entries APPROVED;
  exact keyword spellings and host list locked; no ambiguity left for the
  parser to resolve on its own.
- **Deliverable**:
  - Lexer: confirm `any`, `no`, `each`, `match` need no new tokens (per the
    proposal's own claim — they are already-lexed words); this is a
    verification step, not new lexer code, unless the verification turns up
    a surprise.
  - Parser: `any <open-condition-name>` and `no <open-condition-name>` as
    new condition-primary forms, parsing wherever a condition is legal
    today (mirroring the existing `condition-ref` grammar slot).
  - Parser: `each <open-condition-name> … end each` as a new statement-block
    form, parsing in the four approved host positions (`on`/`after` clause
    bodies, action bodies, trait clause bodies, sequence steps) and
    rejecting top-level placement with a parse error (the never-guess gate
    for wrong host is a parse-time concern since it's about grammatical
    position, distinct from the analyzer's closed-condition/open-condition
    semantic gates in Phase 3).
  - Parser: `the match` as a new value-primary form (parallel to the
    existing `it` value form), legal only syntactically inside an `each`
    block body — full scope enforcement (nesting depth, outside-`each`
    detection) is Phase 3's `analysis.match-outside-each` gate; Phase 2 only
    needs the token to parse to an AST node, not to validate its position.
  - AST node shapes for all three additions, following the existing
    `ConditionNode`/statement-node conventions in `packages/chord/src/ast.ts`
    (or equivalent).
  - Fixture tests: a positive fixture per new construct (`any`/`no`/`each`
    each get their own minimal fixture proving they parse), following the
    Phase A/B/C fixture-pair convention under `packages/chord/test/
    fixtures/`. No malformed/removal fixtures needed this phase (nothing is
    removed) — malformed-input fixtures for the analyzer-level never-guess
    gates belong in Phase 3, not here.
- **Exit state**: `any`/`no`/`each`/`the match` all parse to AST with zero
  errors for well-formed input in every approved host position; malformed
  host placement (e.g. top-level `each`) produces a parse error;
  `pnpm --filter '@sharpee/chord' test` green.
- **Status**: COMPLETE (2026-07-12 — chord 153/153, tsc clean; analyzer
  stubs emit `analysis.each-package-pending` so new forms parse but do
  not compile until Phase 3, keeping the pipeline atomic)

### Phase 3: Chord analyzer + IR — never-guess gates, wire-type additions
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: `@sharpee/chord` semantic analysis and IR — the
  load-time gates that make E1–E3 enforceable, and the IR shapes that carry
  them to the loader.
- **Entry state**: Phase 2 complete; AST covers `any`/`no`/`each`/`the
  match` in all approved positions.
- **Deliverable**:
  - **IR additions** (proposal §3.5, wire-type — must match Phase 1's
    recorded contract verbatim): condition kinds `{ kind: 'any-of',
    condition: string }` and `{ kind: 'none-of', condition: string }`;
    statement kind `{ kind: 'each', condition: string, body: IRStatement[],
    span }`; value kind `{ kind: 'match' }` (parallel to the existing
    `{ kind: 'it' }`).
  - **Never-guess gates**:
    - `any <closed-condition>` and `no <closed-condition>` — load error
      (existing gate class from the 2026-07-11 open-conditions entry,
      revived and extended to `no`).
    - `each <closed-condition>` — load error with an open-condition fix-it
      (new gate, same shape).
    - `analysis.match-outside-each` — `the match` referenced outside an
      `each` body at any nesting depth is a load error. Scope resolution:
      `the match` binds to the innermost enclosing `each`; `it` is
      untouched by `each` nesting (clause-owner binding, no shadowing) —
      verify this against a nested-`each`-inside-a-clause-with-`it` fixture
      specifically, since it's the one place two binders are live at once.
    - `analysis.open-condition-truth` message update: the existing fix-it
      text ("Use `any <name>` in a selection position") goes from
      aspirational to literally correct now that `any` has a live host —
      confirm the message still reads correctly (no wording change strictly
      required, but verify with a fixture that the pointed-at form actually
      compiles).
  - Reuse the analyzer's existing `openConditions` map (`analyzer.ts`,
    around line 260/314/1329) unchanged as the open/closed classification
    source for all three gates — no new classification pass.
  - **IR wire-type check**: confirm `@sharpee/ide-protocol`'s re-export of
    the Chord IR type (`packages/ide-protocol/src/story-ir.ts`, which
    directly re-exports `StoryIR`/`IRStatement`/`IRCondition`) still
    compiles clean after these schema additions — a structural IR check,
    not a surface-syntax ratchet entry (per the log's own "what does not
    count" rule), but still an ADR-210 Consequences obligation.
  - IR snapshot + negative-fixture tests for every new gate class (three
    closed-condition gates, `analysis.match-outside-each`, the
    open-condition-truth message-path fixture).
- **Exit state**: fixtures for `any`/`no`/`each` over open conditions
  produce stable IR snapshots with the new condition/statement/value kinds;
  fixtures for `any`/`no`/`each` over closed conditions and `the match`
  outside `each` produce the expected diagnostics; `pnpm --filter
  '@sharpee/chord' test` and `pnpm --filter '@sharpee/ide-protocol' test`
  green.
- **Status**: COMPLETE (2026-07-12). IR additions landed (any-of/none-of/
  each/match, plus `satisfies` for the must-be-any membership decision —
  dated §3.5 deviation recorded in the proposal §6.5, reconcile at P5).
  Gates live: `analysis.closed-condition-selection` revived verbatim
  (any/no/each over closed; story-state variant), `analysis.match-outside-
  each` (value + NameRef positions), `analysis.reserved-name` for `match`
  (entity/alias/trait field/slot — David's P3 decision), open-condition-
  truth fix-it names the live forms and the pointed-at form compiles in
  the each-compile fixture. collectInlineTexts + checkPhaseOrder descend
  into each bodies (P2 flag 1); `the match` maps like `it` in NameRef
  positions (P2 flag 4). story-loader gained honest LoadError stubs for
  the new IR kinds (evaluator switches are exhaustive-return; the runtime
  statement switch would otherwise silently no-op `each`) — execution is
  P4. Mutation-verification pass run: two flagged branch gaps closed with
  tests (phase-order + inline-text descent into each bodies); the loader
  throw-stubs stay untested by choice — P4 replaces them with real
  evaluation + tests, pinning temporary throws is churn. Suites: chord
  176/176 (+23), ide-protocol 11/11, story-loader 81/81, devkit
  26+1skip; chord/story-loader/ide-protocol tsc clean.
  P4 carry-flags: snapshotDecisions doesn't descend each bodies yet;
  evaluator `is-a` still throws (quantifier conditions like
  `it is a treasure` need it in P4); `satisfies`/`match` evaluation and
  creation-order iteration all land P4.

### Phase 4: Story-loader evaluator/runtime + fixture story e2e
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: `@sharpee/story-loader` — binding E1–E3's IR shapes to
  actual world-entity enumeration.
- **Entry state**: Phase 3 complete; IR carries correct `any-of`/`none-of`/
  `each`/`match` shapes for fixture-story input.
- **Deliverable**:
  - Evaluator: `any-of`/`none-of` condition kinds enumerate all world
    entities (player and rooms included, per §3.5 — the named condition
    does the filtering, not the enumeration), evaluate the open condition
    with `it` bound per entity, and short-circuit on first match (`any`) or
    first non-match (`no`) for efficiency; empty set → `any` = false,
    `no` = true.
  - Runtime: `each` statement executes its body once per matching entity,
    `the match` bound to that entity for the body's duration, in stable
    creation-order enumeration (pinned by Phase 1's ratchet entry — this is
    what makes RNG draws inside the block deterministic per AC-5); empty
    set → no-op; nested `each` — inner block's `the match` shadows nothing
    of the outer's (each level has its own binding, resolved by the Phase 3
    analyzer's innermost-binds rule, but verify the *runtime* binding stack
    actually matches what the analyzer allowed).
  - **A dedicated fixture story** (`packages/chord/test/fixtures/
    each-iteration.story` or equivalent, loaded through
    `@sharpee/story-loader` — not a shipping story) exercising all three
    forms end-to-end: an open condition with a non-empty match set and one
    with an empty set (existence true/false via `any`, empty-set semantics
    for both `any` and `no`), an `each` block visiting a known entity set in
    creation order (assert the visit order matches creation order, not
    just that all entities were visited), `the match` bound correctly
    inside the block body distinct from `it` (a clause with both a clause
    owner and an `each` body, asserting the two never collide), and one
    nested `each` (outer binds one open condition, inner binds another,
    `the match` resolves to the inner in the inner body).
  - Unit tests (`packages/story-loader/test/` or equivalent): existential/
    negated-existential evaluation over both non-empty and empty entity
    sets; `each` block execution including the no-op empty case; creation-
    order determinism (assert on the actual visit sequence, not just the
    final state); `the match` vs `it` binding including the nested case;
    an explicit RNG-determinism assertion for a `one chance in n` draw
    inside an `each` block (per AC-5, mirroring Phase C P4's off-stage
    RNG-non-consumption test shape, but here proving the *iteration order*
    — not a presence gate — is what pins the draw sequence).
- **Exit state**: the dedicated fixture story exercises `any`, `no`, and
  `each` end-to-end through direct `story-loader` calls, including
  empty-set semantics, creation-order determinism, and `the match` vs `it`
  binding with one nested `each`; `pnpm --filter '@sharpee/story-loader'
  test` green; zero changes to any file under `stories/cloak-of-darkness/`
  or `stories/friendly-zoo/` (confirm via `git status` before closing this
  phase — this package touches no shipping story).
- **Status**: COMPLETE (2026-07-12). Evaluator: any-of/none-of via
  short-circuit enumeration of ir.entities in DECLARATION order (= the
  loader's instantiation order — Risk 3 resolved with zero world-model
  touch, no reliance on Map iteration surviving save/restore);
  `satisfies` membership (it bound to subject; a subject with no story
  identity is outside the domain → false); is-a landed over IR kind
  compositions (platform kinds only — room/container/person/supporter
  are all the loader instantiates; arbitrary kinds like `treasure`
  remain future scope); `the match` = ctx.match IR id, innermost via
  context spread. Runtime: `each` executes per match through both the
  single-pass (event clause/sequence/daemon) and two-phase capability
  paths; the match set is SNAPSHOTTED pre-mutation in snapshotDecisions
  (§5.4 — iteration is routing; without it the canonical
  `each hungry-neighbor → change → phrase` would mutate everyone and
  narrate no one). Snapshot deliberately does not descend each bodies:
  nested each re-enumerates live and select-ons inside each bodies
  decide live per pass (per-iteration decision keys are a recorded
  follow-up; no shipped construct hits it). Fixture
  each-iteration.story + each-runtime.test.ts (18 tests): creation-order
  matchesOf, empty-set semantics both quantifiers + each no-op, match/it
  coexistence + nested-each inner binding, exact report-sequence proof
  of the snapshot (spotted-red→tucked→spotted-blue→tucked→tidy-note),
  satisfies through the must ladder both polarities, E2 refusal over
  the emptied set, AC-5 chance-in-each pinned per seed (42: miss/miss;
  7: miss/hit). Mutation-verification pass ran; all five flagged gaps
  closed with tests same session: each through BOTH standard-action
  interceptor paths (entity buildInterceptor w/ snapshot proof via
  noted×2, trait buildTraitInterceptor), each in a sequence-daemon step
  (live-eval context class), set + award inside an each body (field
  written per match, score deduped to one award), nested-each LIVE
  re-enumeration pinned (inner-note ×1, a stale snapshot would emit 2),
  and is-a false/negated-true for a subject with no story identity.
  Found while closing: trait-field initial syntax is `, starts <v>`
  (comma required; the parser silently drops an uncomma'd tail — noted
  for a possible future lint). Suites: story-loader 99/99 (+18), chord
  176, ide 11, devkit 26+1; shipping stories untouched (git fence).

### Phase 5: Regression, docs re-cut, package close
- **Tier**: Small
- **Budget**: 150 tool calls
- **Domain focus**: Cross-package regression and documentation — closing
  the package against ADR-210's ongoing constraints and the proposal's §6
  acceptance criteria, without touching either shipping story.
- **Entry state**: Phase 4 complete; all three forms work end-to-end via
  direct `story-loader` calls against the dedicated fixture story.
- **Deliverable**:
  - Full regression, bundle rebuilt: `pnpm --filter '@sharpee/chord' test`,
    `--filter '@sharpee/story-loader' test`, `--filter
    '@sharpee/ide-protocol' test`, `--filter '@sharpee/devkit' test`; then
    `./repokit build` clean, and against the rebuilt bundle: Cloak gate
    (`node dist/cli/sharpee.js --test --chain
    stories/cloak-of-darkness/...`) **81/81 untouched**, Zoo gate **79/79
    untouched** — this is the acceptance proof per proposal §5 ("both gates
    must stay green untouched... which is itself the no-regression proof"),
    not a formality. Any transcript delta here (unlike Phase C's Phase 5)
    is a bug to fix, not an audit entry to sign off on — this package is
    not supposed to change either shipping story's observable behavior at
    all.
  - Docs re-cut: `docs/reference/chord-grammar.md` regenerated from the
    parser's own tables (per ADR-210 — never hand-edited) to include the
    E1/E2/E3 productions.
  - Ratchet log reconciliation: flip the three Phase 1 entries from
    PROPOSED to their final as-shipped state in `chord-grammar-changes.md`;
    any Phase 2-4 deviation from the Phase 1 draft gets its own dated note,
    per the log's append-only discipline (same pattern Phase C P6 used for
    its as-shipped reconciliation entry).
  - Explicitly confirm the scope fence (E4) held: no numeric cardinality/
    comparison forms, no `every` quantifier, no inline-description
    selection criteria, no grammar-cardinality form (`take all` stays
    engine-owned per design.md §2.3) were pulled in during implementation.
  - Report the `each` package complete against the proposal's exact five
    §6 acceptance criteria (ratchet log carries E1–E3 Approved with
    checkpoint answers; fixture story exercises all three forms end-to-end
    incl. empty-set/order/binding; analyzer gate fixtures with exact-code
    tests for all three never-guess gates plus `match-outside-each` plus
    the open-condition-truth message path; `ide-protocol` builds clean and
    the grammar doc is re-cut; all suites green with Cloak 81/81 and Zoo
    79/79 untouched).
- **Exit state**: all suites green; `chord-grammar-changes.md` fully
  reconciled for E1–E3 (no entry left at PROPOSED); `chord-grammar.md`
  re-cut; Cloak 81/81 and Zoo 79/79 confirmed untouched through the
  rebuilt bundle; package ready to report closed against all five §6
  criteria.
- **Status**: PENDING

## Risks

1. **IR-as-wire-type compatibility.** The IR is re-exported by
   `@sharpee/ide-protocol`, and ADR-210 requires the loader and future
   emitter reference implementations to "stay behavior-equivalent." Phase
   3's four new IR shapes (`any-of`, `none-of`, `each` statement, `match`
   value) must keep `ide-protocol` building clean — treat this as a
   compatibility surface to verify every phase it's touched, not an
   internal-only edit, same discipline as Phase C's Risk 4.
2. **`the match` vs `it` collision at the boundary case.** The proposal is
   explicit that there is "no shadowing, no ambiguity" between `the match`
   and `it` — but the one place this is genuinely non-trivial is a clause
   that has both an owner (`it`) and a nested `each` block referencing an
   *unrelated* open condition inside that clause's body. Getting the
   binding-stack implementation wrong here (e.g. accidentally letting
   `the match` leak `it`'s value, or vice versa) would be a silent semantic
   bug, not a load error — Phase 4's fixture must specifically include a
   clause-owner-plus-each-body case, not just an isolated `each` at
   top-of-body.
3. **Creation-order enumeration must actually be stable, not merely
   typically stable.** AC-5 (RNG determinism) and the fixture story's
   order-determinism assertion both depend on "creation order" being a real,
   pinned ordering property of the world-entity store, not an incidental
   artifact of today's iteration implementation (e.g. `Map` insertion order
   surviving save/restore). If the underlying enumeration source doesn't
   already guarantee this, that is a platform-touch discovery per the
   Checkpoint 2 trigger above, not a detail to silently work around in
   story-loader.
4. **Platform-touch forecast is a forecast, not a guarantee** — same
   caveat as every prior Chord phase's plan. Zero `packages/stdlib`/
   `world-model`/`engine` deltas are expected; any surprise touch found
   during Phases 2-4 is a stop-and-discuss checkpoint per CLAUDE.md, never
   a silent scope addition.

## Explicitly out of scope for this package

Per the proposal's own §3's E4 scope fence and §1/§4:

- **Numeric cardinality and comparisons** (`holds <n> or more <description>`,
  `is at least <n>`) — Given 5 keeps counting-as-mechanism out of the
  language; no shipping story needs them; revisit only if the victory
  backlog item genuinely needs them.
- **Inline descriptions** (`each reachable item not already held`) — named
  conditions only, per the ratchet direction; `each`/`any`/`no` always take
  a `define condition`-declared name.
- **`every` as a third quantifier form** — checkpoint 1 answered: universals
  ship as the `no`-dual (`no stray-treasure`), not a separate keyword.
- **`take all` multi-object commands** — grammar cardinality, engine-owned
  (design.md §2.3), unaffected by this package.
- **The victory trigger** — a separate backlog item that *consumes* these
  forms once they exist; not built by this package.
- **Story migrations** — `cloak.story` and `zoo.story` are not touched;
  both gates stay green untouched as the acceptance proof, per §5.
- **The deferred hatch-context `'chord.'` lint hardening** — recorded as a
  follow-up in the most recent session file, unrelated to this package, not
  picked up here.

---

**Reminder: this is a plan document only. No parser, analyzer, loader, or
story-content code changes happen as a result of writing this file.
Implementation of Phase 1 (or any later phase) begins only when David gives
explicit go-ahead, and Phase 2 specifically cannot begin until every Phase 1
ratchet entry is individually APPROVED.**
