# Session Plan: Chord Phase C — The Ownership Package

**PLAN ONLY. No implementation happens from this document by itself.**
**Implementation starts only on David's explicit go-ahead**, given after he
has reviewed this plan (and, within it, after he has approved every Phase 1
ratchet entry — see Phase 1 below, which is itself governance work, not
grammar work).

**Created**: 2026-07-11
**Overall scope**: Implement the Phase C ownership package
(`docs/work/chord/phase-c-ownership-proposal.md`) — four interlocking legs
that land together (removals ship only with their replacements): (1) state
adjectives in the condition kit, backed by world-model trait state; (2) the
story object (`states:` on the story header, `change the story to <state>`);
(3) entity-attached rules (top-level `when`/`once`/`every` deleted, replaced
by `on`/`after` clauses on entities, `once` as a clause modifier); (4)
`define flag` and the `flag` trait-field type deleted, along with `if`
statements — replaced by trait-declared states, `must`-form requirements, and
the statement `when` suffix. Both shipping stories (`cloak.story`,
`zoo.story`) migrate inside this phase; both gates (Cloak 81/81, Zoo 61/61)
must stay green, with every intentional behavior change enumerated and
signed off before its transcript is touched.
**Bounded contexts touched**: N/A — infrastructure/tooling. No
`docs/ddd/notation.yaml` exists in this repo; this plan uses Sharpee's own
established platform vocabulary (traits, behaviors, capability dispatch, IR),
per Phase A/B precedent. (Chord the *language* is itself DDD-informed —
Givens 8 and 9 came directly out of a DDD review of Chord — but that is the
subject of the work, not a reason to model this plan's own phases as bounded
contexts.)
**Key domain language**: state adjectives (open/closed/locked/unlocked/on/
off/worn/lit), the story object, `states:` / `states, reversible:`,
`change`, entity-attached rules, `on` (intercept) vs `after` (react),
`, once` clause modifier, `must <predicate>: <key>` (requirement) vs
`refuse when` (prohibition), the three-ring boolean-state gate
(`analysis.boolean-state` / `analysis.shadow-state` / `analysis.negated-
state`), trait-declared states, statement `when` suffix, step anchors
(`when <owner> becomes <state>`), owner-scoped narration (broadcast vs
presence-scoped), score ownership (`worth N` on the earning owner).

## References consulted

- `docs/work/chord/phase-c-ownership-proposal.md` — THE spec for this plan:
  four legs, ten owner decisions, all approved by David 2026-07-11. This
  plan implements exactly this document; where this plan summarizes, the
  proposal wins on any conflict. It also states the shipping rule this
  plan's phase ordering must honor: "removals land only together with their
  replacements... the package has four legs; they interlock, so they ship
  as one" — no phase in this plan deletes old grammar without its
  replacement already built in an earlier phase.
- `docs/work/story-language/design.md` (§1, Givens) — Given 8 (global true/
  false flags forbidden, booleans gone at every scope) and Given 9
  (stickiness — all behaviors belong to "something") are the axioms this
  entire package exists to satisfy; Given 4 is already amended (`if`
  removed, `change` gated to declared states) and this plan's Phase 2/3 must
  implement that amendment exactly as recorded, not reopen it. Given 7 (one
  canonical form per concept, modifiers are single-word adverbs) constrains
  every keyword choice Phase 1 drafts.
- `docs/work/chord/ddd-review.md` — the motivating analysis (roots R1: §5.4
  routing invisible in syntax; R2: vocabulary too small, forcing shadow
  state). Directly informs this plan's Risk 1 (on/after routing) and
  confirms the package's four legs are the review's own recommended
  remedies, not a scope invention.
- `docs/work/chord/zoo-phase-c-sketch.story` — the target artifact. This
  plan's Phase 5 migration deliverable is defined as "make this sketch (or
  its equivalent) the shipping `zoo.story`, compiling under the new
  grammar." The sketch also documents its own in-scope cleanups (pettable
  kind-enum deletion, `create the snake`, `collect-map` awardability) and
  its own remaining gaps (victory trigger, press mechanics, recurrence-
  offset, strategy-phrase ownership) — this plan's in-scope/out-of-scope
  split follows the sketch's own split exactly.
- `docs/architecture/chord-grammar-changes.md` — the one-way ratchet log
  governing this repo's story-language grammar. Two entries already
  anchor this package (2026-07-11: Given 9 adopted; Given 8 / `define flag`
  removed, "implementation deferred to the replacement-design phase") —
  this plan's Phase 1 is that deferred replacement-design phase, and its
  deliverable is exactly what those two entries said was still owed: dated,
  David-approved entries for the concrete surface forms (state adjectives,
  `states:`, `after`, `reversible`, the `when`-suffix, step anchors).
- `docs/work/chord-phase-b/plan.md` — the phase/plan format this document
  follows (tier, budget, domain focus, entry state, deliverable, exit
  state, status per phase; a References-consulted section; a Platform-touch
  forecast; a Checkpoints-requiring-David's-decision section). Also the
  precedent for "N/A — infrastructure/tooling" bounded-context framing and
  for treating grammar governance as its own Phase 1 (Phase B's Phase 1 was
  a pure-checkpoint phase with zero code, same shape as this plan's Phase 1).
  Phase B's Phase 7 struck the exact deal this plan's Phase 5 must repeat at
  larger scope: freeze existing transcripts, audit them against what
  changed, get explicit sign-off before editing anything frozen.
- `docs/architecture/adrs/adr-210-story-language.md` — ACCEPTED, the
  umbrella ADR. Consequences section binds this plan: grammar additions are
  a one-way ratchet requiring a dated entry (Phase 1's whole job); stdlib
  event-selector contract (AC-9) must stay green through any language
  change (Phase 6 regression obligation); IR is a wire type used by two
  reference implementations (loader now, emitter later) that "must stay
  behavior-equivalent" — any IR schema change in Phase 3 is a compatibility
  surface, not a free internal edit. AC-6 (occurrence/declared state
  survives save/restore with no author-written persistence) directly
  constrains how Phase 4 must implement story-state and trait-declared
  state: as world state, not runner-side bookkeeping.
- `docs/context/project-profile.md` — pnpm/Turborepo/tsf build conventions,
  Vitest + `.transcript` walkthrough/integration test conventions, TS
  strict mode, uniform lockstep versioning, and the language-layer
  separation convention (`lang-en-us` owns user-facing text) — this plan's
  phases must keep honoring these, not relax them, exactly as Phase B's
  plan noted for itself.
- `docs/context/session-20260711-0100-v2-210-chord-a.md` (most recent
  session file) — records that Phase B is GATE-COMPLETE and, as of the git
  history checked at plan time, committed (`ca29b9ec` through `890d31a6`,
  verified via `git log`); the ownership proposal, the DDD review, and all
  ten owner decisions are themselves already committed and pushed. Open
  items carried forward: the four gate-exclusion candidates (initial-
  Description, ADR-209 snippets, ADR-195 slot contributors, plus event-verb
  growth, role-bound trait clauses on standard actions, `each <condition>`
  iteration, quantifier/comparison conditions) are explicitly *not* this
  package's job — they stay Phase C backlog beyond the ownership package,
  matching the proposal's own "explicitly out of scope" section.

## Platform-touch forecast (identified up front, per CLAUDE.md)

The proposal states the forecast directly: **zero expected changes to
`packages/stdlib`, `packages/world-model`, `packages/engine`** — the
evaluator reads trait state directly (leg 1 is a read-only projection over
existing `OpenableTrait`/`LockableTrait`/`SwitchableTrait`/wearable-relation/
derived-light state) and narration scoping (decision 10) is loader-side,
using existing world-model location queries the same way Phase B's can-see/
can-reach co-location check already does.

Packages this plan expects to touch: `@sharpee/chord` (lexer/parser/
analyzer/IR/catalog — the IR is a wire type re-exported by `ide-protocol`,
per the ADR-210 reference above, so any IR schema change is a checked
compatibility surface, not a free edit), `@sharpee/story-loader` (loader/
runtime/evaluator/state-keys — `CHORD_FLAG_PREFIX` and everything reading/
writing `chord.flag.*` is deleted), `@sharpee/devkit` (`compose`, if the new
grammar surfaces need CLI-visible changes — expected minimal),
`scripts/bundle-entry.js` (CLI host, if the story arg surface changes —
expected no change), and story content: `stories/cloak-of-darkness/
cloak.story`, `stories/friendly-zoo/zoo.story`, `stories/friendly-zoo/src/
chord-extras.ts` (the `gateStatus` producer currently reads `chord.flag.
gate-closed` directly — Phase 5 must repoint it at the gate's `openable`
state).

**One specific risk to this zero-platform-touch forecast is flagged and
tracked, not silently assumed away**: whether `after`-clauses reacting to a
**dispatch verb** (a story-defined `define action` routed through
`CapabilityBehavior`, e.g. `after feeding it` reacting to `feedable`'s own
`on feeding it`) can be built entirely inside `story-loader` using the
existing `ActionInterceptor` registry (`registerActionInterceptor`, keyed by
`traitType:actionId` per ADR-118, invoked generically by
`packages/engine/src/game-engine.ts`'s command executor — confirmed present
for standard-semantics actions in Phase B, **not yet confirmed for
custom dispatch actions registered via `getCustomActions`**), or whether it
needs a new hook added to `packages/world-model/src/capabilities/
capability-behavior.ts`'s four-phase `CapabilityBehavior` interface (a
`packages/` change, requiring discussion before implementation per CLAUDE.md).
See Risk 1 below — **this is resolved by a runtime spike run directly in
Phase 1**, not a design detail deferred to implementation: the question is
answerable entirely against Phase B's already-shipped machinery (no new
grammar required to ask it), so there is no reason to wait for Phase 2-4's
grammar/analyzer work before running it. The `after` ratchet entry in Phase
1's deliverable is not signed until the spike's answer is in hand.

Any other `packages/` touch discovered during implementation is a
**checkpoint trigger, not a silent scope addition** — stop and discuss with
David before touching anything outside the packages listed above, exactly as
CLAUDE.md's "Platform changes require discussion first" rule requires.

## Mid-package tree honesty (fixture-indirection ground rule)

This package spans six phases; the shipping stories
(`stories/cloak-of-darkness/cloak.story`, `stories/friendly-zoo/zoo.story`)
only migrate to the new grammar in Phase 5. But Phase 4 deletes the
`define flag` runtime machinery those stories currently depend on. Any test
that loads a shipping story directly would therefore go red the moment
Phase 4 lands — not because of a defect in Phase 4's own work, but purely
because the story content it's loading hasn't caught up yet.
`packages/story-loader/tests/zoo-pure-ir.test.ts` is the confirmed instance
(it compiles the real `stories/friendly-zoo/zoo.story` and asserts
`maxScore 100`); treat any other test found loading a shipping-story path
the same way.

**Ground rule: at every phase's exit, every named test suite is genuinely
green — never sanctioned-red.** The fix is fixture indirection, not
toleration:

- **Phase 2** adds a compiling migrated-zoo fixture
  (`packages/chord/test/fixtures/zoo-phase-c.story` or equivalent, derived
  from `zoo-phase-c-sketch.story`) and repoints any test found loading a
  shipping-story path at that fixture instead, with a
  `// TODO(phase-c-p5)` marker.
- **Phases 2-4**'s "zero `chord.flag` references" and "old-grammar-free"
  exit claims are scoped to `packages/` (source and fixtures) only — the
  repo-wide claim, covering `stories/**` and everything else outside
  `packages/`, is explicitly deferred to Phase 5's exit criterion, not
  quietly assumed earlier.
- **Phase 5** restores the repointed tests to the real, now-migrated
  shipping stories, removes the TODO markers, and runs the repo-wide grep
  that Phases 2-4 deliberately did not claim.

**Named failure mode to avoid**: the temptation, mid-phase, to hot-fix a
frozen shipping story or its frozen transcripts just to make a suite pass
early — e.g. deleting a stray `chord.flag` reference in `zoo.story` during
Phase 3 because a test complained. That is exactly the "stranded story" the
shipping rule forbids, and exactly the transcript-editing-without-audit the
Phase 5 gate-delta process exists to gate. If a phase's own suite goes red
because of shipping-story content rather than that phase's own code, the
fix is fixture indirection per this ground rule, or a stop-and-checkpoint —
never a silent edit to a frozen story or its frozen transcripts.

## Checkpoints requiring David's decision

1. **Every Phase 1 ratchet entry** — the exact spellings of `after`,
   `reversible`, the statement-`when` suffix, the step-anchor form, and the
   `must`-line grammar details are drafted in Phase 1 but are not normative
   until David approves each dated entry individually. Phase 2 cannot start
   until all of them are APPROVED.
2. **The on/after-vs-dispatch-verb routing mechanism** (Risk 1) — if the
   Phase 1 spike finds the existing `ActionInterceptor` registry does not
   already fire for custom dispatch actions, the chosen fix (extend the
   registry's invocation path vs. add a hook to `CapabilityBehavior` vs.
   some third option) is a `packages/world-model` or `packages/engine`
   change and needs David's sign-off before it's built, not after. The
   `after` ratchet entry (item 1 above) waits on this answer.
3. **Every proposed frozen-transcript revision** in Phase 5's gate-delta
   audit — each one needs an individual "yes, revise it this way" before
   the corresponding `.transcript` file is edited. This is a hard gate per
   the shipping rule ("no story left stranded... gates green") and per
   CLAUDE.md's "never delete files without confirmation" spirit extended to
   frozen test artifacts.
4. Whether `zoo-phase-c-sketch.story`'s "newly possible" and "review-
   recommended cleanup" content (pettable kind-enum deletion, `create the
   snake`, `collect-map` awardability) ships as part of Phase 5's migration
   (it is already written into the sketch, so the default assumption in
   this plan is **yes, it ships** — flag at Phase 5 kickoff only if David
   wants it split out).
5. **Does top-level `define score` survive?** (Finding 3b.) Decision 3
   moves score ownership onto the earning owner (`worth N` in a `create`
   block, a trait block, a `define action` block, or the story header). If
   every score can now be declared at its owner, does the top-level
   `define score X worth N` form get **removed** (Given 7: one canonical
   form per concept — a free-floating declaration and four owner-attached
   forms would be five ways to say the same thing) or does it **survive**
   as the story-header/story-object form specifically? Phase 1 drafts this
   as an explicit either/or question for David; Phase 2's removal list
   follows whichever answer he gives.
6. **The sequence-scope mutation rule** (Finding 4) — the proposal's leg-2
   text *recommends* sequences may only `change the story`/`phrase`/`move`/
   `award`, but the approved sketch's feeding-time sequence does
   `change the pygmy goats to hungry` (a named-entity `change`, not a story
   `change`). Phase 1 drafts a reconciled rule (sequences may `change`
   world state — the story or any named entity — plus `move`/`phrase`/
   `award`; the only firm constraint is that they bind no `it`) as its own
   ratchet entry for David to confirm or correct, rather than silently
   resolving the conflict in the sketch's favor.

## Phases

### Phase 1: Ratchet finalization — ownership-package grammar entries
- **Tier**: Small
- **Budget**: 100 tool calls
- **Domain focus**: Governance only — no parser, analyzer, or loader code.
  `docs/architecture/chord-grammar-changes.md` (the one-way ratchet log)
  and the still-open spellings the proposal explicitly deferred to
  implementation time.
- **Entry state**: `phase-c-ownership-proposal.md` and
  `zoo-phase-c-sketch.story` are committed and accepted by David (verified:
  git history through `890d31a6`); this plan itself is approved by David as
  the phase breakdown to work from; no grammar or code work has started.
- **Deliverable**:
  - A dated, PROPOSED ratchet entry (form / rationale / example / decision
    columns, matching the existing table format) for each still-open
    spelling the proposal names:
    - the state-adjective catalog (open/closed, locked/unlocked, on/off,
      worn, lit) and its growth governance (same closed-catalog rule as the
      existing capability adjectives)
    - `states:` on the story header + `change the story to <state>`
    - the `on` (intercept) vs `after` (react) keyword split — confirm the
      exact keyword `after`, and that `refuse` is syntactically illegal
      inside an `after` clause
    - `states, reversible:` as the back-transition declaration — confirm
      the exact word `reversible` (single-word adverb-style modifier per
      Given 7)
    - `, once` as a clause-header modifier (distinct from `first time`
      inside a body) — confirm both forms stay, per decision 4
    - `<subject> must <predicate>: <key>` as both a define-action line and
      a body statement, and the companion gate: `refuse when` with a
      top-level `not` becomes a load error with a must-form fix-it
    - the freed statement `when <cond>` suffix (`award X when <cond>`) and
      its positional distinctness from the select-arm `when <value>` homonym
    - the trait-declared `states[, reversible]:` field syntax replacing the
      `flag` field type
    - the three-ring boolean-state gate diagnostics — exact codes
      (`analysis.boolean-state`, `analysis.shadow-state`,
      `analysis.negated-state`) and the encouraging fix-it wording (draft
      text, e.g. the `unfed`/`fed` example from the proposal)
    - the step-anchor form `when <owner> becomes <state>` and its
      interaction with existing `at turn N` / `N turns later` steps in the
      same sequence
    - owner-scoped narration (decision 10) — not new syntax, but recorded
      as a ratchet entry since it changes existing clause-firing semantics
      (a semantics change belongs in the governance log even without a new
      keyword, per the log's own "renames and removals count too" rule)
    - **owner-attached scores** (decision 3, Finding 3a): `score <name>
      worth N` as a line form legal in `create` blocks (**plain entities
      included, not just rooms** — the sketch attaches scores to the
      snake, the map, the brochure, the zookeeper, the goats, the rabbits,
      and the parrot, not only rooms), trait blocks, `define action`
      blocks, and the story header. Draft this entry alongside the
      **Checkpoint 5 question** (does top-level `define score` get removed
      or survive as the story-header form? — see Checkpoints section) so
      the entry can be finalized once David answers it.
  - **Spec reconciliation for the sequence-scope mutation rule** (Finding
    4 / Checkpoint 6): the proposal's leg-2 text recommends sequences may
    only `change the story`/`phrase`/`move`/`award`, but the approved
    `zoo-phase-c-sketch.story` itself has the feeding-time sequence doing
    `change the pygmy goats to hungry` — a named-entity `change`, not a
    story `change`. This is a direct conflict between the proposal's
    recommendation and the sketch David already approved. Draft the
    reconciled reading (sequences may `change` world state — the story or
    any named entity — plus `move`, `phrase`, and `award`; the only firm
    rule is that they bind no `it`, i.e. no implicit-target statements) as
    its own ratchet entry and put it in front of David explicitly as a
    confirm-or-correct item — do not silently resolve the conflict in the
    sketch's favor without his sign-off.
  - **On/after-dispatch-verb routing spike (Risk 1), run now, not deferred
    to Phase 4** (Finding 5): this is a runtime experiment against
    Phase B's already-shipped machinery, not grammar work, so it needs no
    parser or analyzer changes to run. Write a minimal smoke test
    exercising the *existing* `ActionInterceptor` registry
    (`registerActionInterceptor`, keyed `traitType:actionId` per ADR-118)
    and the *existing* `getCustomActions` dispatch path, using the
    already-shipped Phase B Zoo dispatch actions as the harness (e.g.
    `feedable`'s `on feeding it` CapabilityBehavior plus a second,
    hand-registered `ActionInterceptor` under the `feeding` capability
    action ID on a different trait type) to determine whether the
    interceptor's `postExecute`/`postReport` fires after the dispatch
    action's own CapabilityBehavior completes. If it fires: the
    `after`-on-dispatch-verbs mechanism is confirmed, and the `after`
    ratchet entry is drafted and signed on that basis. If it does not
    fire: stop and checkpoint with David on the fallback (most likely a
    new hook on `packages/world-model/src/capabilities/
    capability-behavior.ts`'s `CapabilityBehavior` interface) before
    drafting the `after` entry, since that fallback is a `packages/`
    change requiring discussion-first sign-off (Checkpoint 2). **The
    `after` ratchet entry is not signed until this spike's answer is in
    hand** — everything else in this phase's list can be drafted in
    parallel with the spike, but `after` specifically waits on it.
  - An explicit removals list for this package (top-level `when`/`once`/
    `every`, `define flag`, the `flag` field type, `if` statements) and an
    explicit "unchanged, only extended" list (`first time`, `select`,
    `change`, existing capability adjectives) — confirming Phase 2's scope
    boundary before any parser work begins.
- **Exit state**: every drafted entry is either APPROVED (dated, normative,
  ready for Phase 2 to implement verbatim) or sent back with changes
  requested; the on/after-dispatch-verb spike has run and its answer is
  recorded (mechanism confirmed, or fallback approved by David); the
  score-ownership and sequence-scope checkpoint questions are answered.
  **No Phase 2 work starts until every entry in this phase is APPROVED by
  David** — this is the hard gate the proposal's "final ratchet entries...
  land with implementation" line requires done first, not concurrently.
- **Status**: CURRENT — drafts + spike DONE 2026-07-11, awaiting David's
  approvals. All 13 entries drafted in `ratchet-drafts.md` (D1–D13) with
  the removals and unchanged-only-extended lists. **Spike result**: zero
  interceptor hooks fire on the dispatch path (empirically pinned;
  registry resolves the binding but `buildDispatchAction` never consults
  it) — mechanism chosen for `after`-on-dispatch is loader-internal
  (compiles into the dispatch action's report phase alongside
  `fireActionRules`), so NO platform change is needed and Checkpoint 2
  reduces to confirming the mechanism. Open with David: CP2 (mechanism),
  CP5 (`define score` fate), CP6 (sequence-scope mutation rule), plus
  per-row approval of D1–D13.

### Phase 2: Chord frontend — new grammar in, old grammar out
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: `@sharpee/chord` lexer/parser/AST — parsing all four
  legs' approved surface forms, and deleting the top-level `when`/`once`/
  `every`, `define flag`, `flag` field type, and `if` grammar Phase A/B
  built, per the removals-with-replacements rule.
- **Entry state**: Phase 1 complete — every ratchet entry APPROVED; exact
  keyword spellings locked; no ambiguity left for the parser to resolve on
  its own.
- **Deliverable**:
  - Leg 1: state-adjective forms parse wherever capability adjectives are
    accepted today (condition positions, `must`/`refuse when` predicates),
    sourced from the approved catalog.
  - Leg 2: story-header `states:` field parses; `change the story to
    <state>` parses (reusing entity-`states:` `change` grammar, extended to
    the story object); bare state names remain valid condition refs with
    unchanged spelling from the Phase B `zoo.story` (`while after-hours`
    keeps working without a rewrite of that specific condition).
  - Leg 3: `on <verb> it` vs `after <verb> it` on-clause heads parse to a
    routing-tagged AST shape; `, once` clause-header modifier parses
    alongside the existing `while`; `while <cond>` generalizes onto event
    on-clauses (previously every-turn-only).
  - Leg 4 removals: `define flag`, `set <flag> to ...`, bare-flag condition
    refs, `if`-statement grammar, and top-level `when`/`once`/`every` are
    all removed — each becomes a parse error with a fix-it pointing at its
    leg-2/3/4 replacement.
  - New forms from the owner decisions: `must <predicate>: <key>`
    (define-action line + body statement), trait-declared `states[,
    reversible]:` field, `worth N` as a line form on **any owner** — plain
    `create` entities, rooms, traits, `define action` blocks, and
    (pending Checkpoint 5's answer) the story header — replacing or
    supplementing the score-declaration-only-on-`define score` form per
    whatever David decides in Phase 1, the statement `when <cond>` suffix,
    the `when <owner> becomes <state>` sequence step anchor.
  - Parser fixture tests: a positive fixture per new construct, a malformed
    fixture per removed construct (parse error + fix-it), following the
    Phase A/B fixture-pair convention. `zoo-phase-c-sketch.story`'s content
    transcribed into `packages/chord/test/fixtures/` as the primary
    positive fixture (mirroring how Phase A transcribed `cloak.story` and
    Phase B transcribed `zoo-actions`/`zoo-timeline`).
  - **Named fixtures requiring rewrite** (budget time for these
    specifically — "fixtures updated" above is not precise enough to plan
    against): `packages/chord/test/fixtures/cloak.story` (contains the
    top-level `when` stumble rule this package removes — this fixture also
    serves as the AC-3 mutation-testing base, so its rewrite must preserve
    whatever AC-3 mutation coverage currently depends on its shape),
    `zoo-timeline.story`, `zoo-actions.story`, and `traits-basic.story`
    (all three carry `if`/flag-adjacent shapes from Phase B that this
    package's removals touch — check each individually rather than
    assuming only the obviously-flagged ones need work), `ac5-random.story`
    (the seeded-RNG determinism fixture — confirm it doesn't incidentally
    rely on a removed construct), and the malformed-fixture pair
    `malformed/missing-end-when.story` and `malformed/every-bad-header.story`
    (both are fixtures for constructs leg 3/4 removes outright — each
    either gets rewritten to test the *new* removal diagnostic, or is
    retired in favor of a fixture that does). Regenerate `__snapshots__`
    for every touched fixture rather than hand-editing snapshot output.
  - **Fixture indirection for shipping-story-reading tests** (Finding 1 —
    see the "Mid-package tree honesty" section below for the ground rule
    this implements): add a compiling migrated-zoo fixture derived from
    `zoo-phase-c-sketch.story` under `packages/chord/test/fixtures/` (e.g.
    `zoo-phase-c.story`) that exercises the full four-leg grammar, and
    repoint `packages/story-loader/tests/zoo-pure-ir.test.ts` — plus any
    other test found loading a shipping-story path
    (`stories/friendly-zoo/zoo.story` or `stories/cloak-of-darkness/
    cloak.story`) directly — at this fixture instead, with a
    `// TODO(phase-c-p5): repoint at the real, migrated zoo.story once
    Phase 5 lands` marker. This is what keeps Phase 2-4's test suites
    genuinely green rather than sanctioned-red against a story tree that
    hasn't caught up yet.
- **Exit state**: `zoo-phase-c-sketch.story`-shaped fixtures parse to AST
  with zero errors; old-grammar fixtures (flag declarations, top-level
  `when`, `if` statements) produce the expected removal diagnostics; the
  named fixtures above are rewritten (not just "updated" in passing) with
  regenerated snapshots; shipping-story-reading tests are repointed at the
  new fixture with TODO markers in place; `pnpm --filter '@sharpee/chord'
  test` green.
- **Status**: PENDING

### Phase 3: Chord analysis — three-ring gate, routing, catalog, scope, step anchors
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: `@sharpee/chord` semantic analysis and IR — the load-time
  gates that make the four legs' intent enforceable, not just parseable.
- **Entry state**: Phase 2 complete; AST covers all four legs' approved
  forms.
- **Deliverable**:
  - The three-ring boolean-state gate (decision 8): `analysis.boolean-
    state` (literal `true`/`false`/`yes`/`no`), `analysis.shadow-state`
    (a declared state set reproducing a platform-owned pair — open/closed,
    locked/unlocked, on/off, lit/unlit, worn/unworn — checked against the
    leg-1 catalog), `analysis.negated-state` (negation-shaped pairs:
    `not-X`/`un-X`/`non-X`/`no-X`/`X-less`/shared-stem) — all load-time
    errors, with the encouraging fix-it text drafted in Phase 1.
  - The `must`-form requirement gate and its companion `refuse when`
    polarity gate (decision 6): a top-level `not` inside `refuse when` is a
    load error pointing at the `must` form.
  - On/after routing recorded on IR on-clauses: `on` marked interceptor-
    eligible-with-refusal (unchanged from Phase B); `after` marked
    reaction-only; `refuse` inside an `after` clause is a load-time error.
  - The state-adjective catalog wired into the analyzer's condition/
    predicate resolution, sourced from the trait-capability table (openable/
    lockable/switchable/wearable/light-source) — derivable, never stored.
  - Story-object `states:` and trait-declared `states[, reversible]:`
    registered in the two-pass resolver as new state-owner scopes alongside
    existing entity `states:`, each with its own `change`-legality/
    exhaustiveness checks; `reversible` sets permit backward `change`,
    non-reversible sets keep the Given-5 forward-march rule.
  - Score-owner resolution (decision 3): `worth N` declarations resolve
    against the declaring owner — any `create` block (room, person, or
    plain entity — the sketch attaches scores to the snake, map, brochure,
    zookeeper, goats, rabbits, and parrot, not just rooms), a trait block,
    a `define action` block, or the story header if Checkpoint 5 keeps
    that form; `award` resolves within the declaring owner's namespace —
    verify the same short score name (`fed`) is legal on two different
    owners (goats, rabbits) without a duplicate-identity false positive.
  - **Cross-trait state resolution** (Finding 4): a trait's clause can
    reference a state declared on a *different* composed trait — e.g.
    `restless`'s `on every turn while it is hungry` reads the `hungry`
    state declared on `feedable`, not on `restless` itself. State names
    must resolve across the entity's **full composed trait set**, not just
    the declaring trait's own body. Two composed traits declaring the same
    state name is a load-time collision error with a rename fix-it,
    mirroring the existing duplicate-identity gate shape already built for
    scores and phrases.
  - Step-anchor analysis (decision 9): `when <owner> becomes <state>`
    resolves the owner+state pair against a declared state set (story or
    entity), joining the existing `at turn N` / `N turns later` step-header
    forms in the same sequence.
  - Owner-scoped narration semantics recorded on IR (decision 10):
    entity-owned every-turn/on clauses tagged presence-scoped; story-owned
    schedule/sequence clauses tagged broadcast. This is a semantic tag for
    the loader (Phase 4) to act on — no new syntax.
  - IR snapshot + negative-fixture tests for every new gate class.
  - **IR wire-type check**: confirm `@sharpee/ide-protocol`'s re-export of
    the Chord IR type still compiles after these schema additions. This is
    a structural IR change, not a surface-syntax change, so it does not
    need its own grammar-changes ratchet entry — but it does need
    `ide-protocol` to build clean, and per ADR-210's Consequences, the
    loader and (future) emitter reference implementations must stay
    behavior-equivalent against the new IR shape.
- **Exit state**: `zoo-phase-c-sketch.story`-shaped fixtures produce stable
  IR snapshots with correct three-ring/must/routing/scope/anchor gates;
  `pnpm --filter '@sharpee/chord' test` and `pnpm --filter
  '@sharpee/ide-protocol' test` green.
- **Status**: PENDING

### Phase 4: Story-loader/runtime — ownership semantics wired to world state
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: `@sharpee/story-loader` — binding the four legs'
  semantics to actual world/scheduler mechanics. This is the phase where
  `CHORD_FLAG_PREFIX` and everything reading/writing `chord.flag.*` dies.
- **Entry state**: Phase 3 complete; IR carries correct three-ring/routing/
  scope/anchor information for `zoo-phase-c-sketch.story`-shaped fixtures.
- **Deliverable**:
  - On/after routing for dispatch verbs (Risk 1) is **already resolved** by
    the Phase 1 spike — this phase implements per the confirmed mechanism
    (or David-approved fallback) recorded there rather than re-running the
    experiment.
  - State adjectives (leg 1): condition evaluator reads world-model trait
    state directly (`isOpen`/`isLocked`/`isOn`/worn-relation/derived-light)
    for the new adjective forms — zero new world state, pure read.
  - Story object (leg 2): story `states:` compiles to a story-scoped state
    slot in world state (same state-machine mechanism as entity `states:`,
    scoped to a story-owned slot); `change the story to <state>` mutates it
    with the same legality/exhaustiveness checks as entity `change`.
  - Trait-declared states (decision 5): `states[, reversible]:` on a trait
    compiles per-composer via `ChordDataTrait` (Phase B machinery), fully
    replacing the `flag` field type; starting state = first declared value.
  - On/after routing (decision 1, per the Phase 1 spike's answer): `on`
    clauses compile exactly as Phase B built them (ActionInterceptor for
    standard verbs, CapabilityBehavior for dispatch verbs — unchanged).
    `after` clauses on **standard-semantics verbs** compile to the same
    ActionInterceptor postExecute/postReport-append shape, minus
    preValidate. `after` clauses on **dispatch verbs** use whatever
    mechanism the Phase 1 spike confirmed or David approved as the
    fallback.
  - **Named-entity `change` from story-sequence scope** (Finding 4): a
    `define sequence` step body may `change` an entity other than the
    story itself — the sketch's feeding-time sequence does `change the
    pygmy goats to hungry`. Confirm the evaluator resolves the named-entity
    target correctly from sequence-step scope: `on`/`after` clause bodies
    resolve `it` implicitly, but a sequence step has no `it` and must name
    its target explicitly (this is the runtime side of the Phase 1
    sequence-scope ratchet entry — implement per whatever rule David
    confirms there).
  - Must/refuse semantics (decision 6): `must <predicate>: <key>` compiles
    to a refusal check (positive precondition, negated internally);
    `refuse when` no longer accepts a top-level `not` (already gated at
    analysis — confirm the loader has nothing left to enforce here beyond
    what Phase 3 caught at load time).
  - `if` removal (decision 7): confirm no interpreter code path still
    branches on a removed `if` IR node — this should be a no-op check, not
    new code, since `if` never reached codegen for any Phase A/B-shaped
    story.
  - Owner-scoped narration (decision 10): entity every-turn/on-clause
    execution gains a presence check (player co-located with the clause's
    owner entity, using the same co-location semantics as Phase B's
    can-see/can-reach) before the clause fires — including RNG-bearing
    clauses (`one chance in 2`), which must not consume the RNG stream
    when off-stage (preserving AC-5 determinism for on-stage firings).
    Story-owned schedule/sequence clauses remain unconditional broadcasts,
    unchanged from Phase B.
  - Step-anchored sequences (decision 9): `when <owner> becomes <state>`
    step headers arm a sequence step on the referenced state transition,
    extending Phase B's `buildSchedulerDaemons` chaining logic.
  - `define flag` machinery removal: delete `CHORD_FLAG_PREFIX` and the
    `chord.flag.*` read/write paths in `state-keys.ts`, `evaluator.ts`,
    `loader.ts`, and `runtime.ts`. Grep-confirm zero remaining `chord.flag`
    references in `packages/story-loader/src` and `packages/chord/src`
    (**scoped to `packages/` — this phase's shipping stories, notably
    `stories/friendly-zoo/zoo.story`, still carry old grammar and their own
    `chord.flag` usage until Phase 5 migrates them; the repo-wide sweep is
    Phase 5's exit criterion, not this phase's** — see "Mid-package tree
    honesty" below).
  - **Named story-loader tests requiring rewrite** (Finding 6 — budget time
    for these specifically): `packages/story-loader/tests/scheduler.test.ts`
    (currently asserts `chord.flag.after-hours` directly — rewrite to
    assert the story-object state instead), `runtime.test.ts` (carries
    `if`-statement and `define flag` fixtures from Phase A/B — both need
    replacing with `must`/statement-`when`-suffix and trait-declared-state
    equivalents), and the loader's conditional-trait-composition tests (the
    parrot's `chatty while not after-hours` swap is currently flag-backed —
    re-verify Prerequisite 2's NPC-behavior-shaped conditional composition
    against the story-object state instead of the flag it reads today).
  - Unit tests (`packages/story-loader/test/`): story-state transition +
    exhaustiveness; trait-declared state transition (reversible vs.
    forward-march); on/after routing for both standard and dispatch verbs
    (the goats/rabbits `feedable` + `after feeding it` case specifically,
    since it is the concrete instance of Risk 1); owner-scoped narration
    presence gate, including an explicit RNG-not-consumed-off-stage
    assertion; step-anchored sequence firing on a state transition;
    save/restore round-trip for story state and trait-declared state (AC-6);
    **the statement `when` suffix and the body-level `must` statement**
    (Finding 8) — the sketch happens to exercise neither construct directly
    (feedable's `must` lines and the sketch's one surviving `when`-suffix
    use are covered incidentally at best), so fixture-only coverage is not
    enough for two decision pillars — write dedicated unit tests for both,
    independent of the Zoo fixture.
- **Exit state**: a `zoo-phase-c-sketch.story`-shaped fixture exercises all
  four legs end-to-end through direct `story-loader` calls (not yet the CLI
  transcript harness — Phase 5); zero `chord.flag` references remain in
  `packages/` (the repo-wide check, including story content, is Phase 5's
  exit criterion); `pnpm --filter '@sharpee/story-loader' test` green —
  genuinely green, per the fixture-indirection ground rule below, not
  green-with-known-exceptions.
- **Status**: PENDING

### Phase 5: Story migrations + gate delta audit (cloak, zoo, chord-extras)
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: `stories/cloak-of-darkness`, `stories/friendly-zoo` —
  migrating both shipping stories to the new grammar, and reconciling the
  two frozen gates against every intentional behavior change the package
  causes.
- **Entry state**: Phase 4 complete; all four legs work end-to-end via
  direct `story-loader` calls.
- **Deliverable**:
  - **Gate delta audit first, before touching any frozen transcript.**
    Write `docs/work/chord-phase-c/gate-delta-audit.md` enumerating every
    intentional observable-behavior change. The starting list below is
    **verified against the actual transcript files**, not speculative —
    two items from an earlier draft of this list were checked and found
    false; do not reintroduce them without re-verifying first:
    - **Scoring breaks wholesale.** `scoring.transcript` needs a
      near-total rewrite: max score drops 100 → 85 (`pet-award` removed as
      part of the sketch's pettable kind-enum cleanup, `collect-map` adds
      +5, and the `after-hours-keeper-leaves` score renames to `farewell`
      under decision-3 owner-scoped naming) — nearly every assertion in
      this file is revised, not just the total.
    - **Keeper departure is currently unpinned, not currently broken.**
      Today the zookeeper's farewell fires as a broadcast at closing
      regardless of player location; decision 10 makes it fire only when
      witnessed (player in the Main Path). No existing frozen transcript
      actually pins this behavior today, so this is not a transcript break
      to fix — it is a gap in current coverage. Phase 5 should add a new
      assertion (or extend an existing transcript) that positively tests
      the witnessed-vs-unwitnessed firing, not just carry the silence
      forward.
    - **Goats can bleat before the first feeding bell.** Under `states,
      reversible: hungry, content` (decision 5), the goats start `hungry`
      — so `restless`'s bleating clause can fire on-stage as early as turn
      ~2, where today's TS-hand-rolled `feeding-time-active` gate holds
      bleating off until turn 11 (the first PA bell). This is an
      observable, player-visible delta needing David's sign-off.
      `timeline.transcript`'s loose "Time passes" assertions may currently
      mask this difference — the audit must add an explicit early-turn
      check rather than rely on the existing assertions to surface it.
    - **Recurring feeding.** Feeding remains repeatable across bell cycles
      under the `hungry`/`content` state machine (feed again after each
      subsequent bell succeeds, where the old one-shot `fed: flag` would
      have refused).

    Two items are explicitly **removed** from an earlier draft of this
    list, verified false against the actual files: a bullet claiming
    transcripts assert `chord.flag.*` keys directly
    (`state-assertions.transcript` only ever asserts `player.inventory`,
    never a flag key) and a bullet claiming `timeline.transcript` asserts
    the keeper leaving (it ends at turn 20 on the closed PA line, before
    any keeper-departure assertion would occur).

    This four-item list is the verified starting point, not a ceiling —
    the audit must still scan every transcript for any other
    owner-scoped-narration-driven firing change (the parrot/goats/rabbits/
    snake `once` confession vignettes are the obvious candidates to check
    next) before treating the list as complete.

    For each affected transcript: file, assertion(s), old behavior, new
    behavior, proposed revision text. **Get David's sign-off on each
    proposed revision individually before editing the corresponding frozen
    `.transcript` file.** Unintentional deltas discovered during migration
    are bugs to fix, not audit entries to sign off on — this phase does not
    proceed past a bug by documenting it as a delta.
  - Migrate `cloak.story`: the one floating rule (stumble) →
    `after entering it while in-darkness` on the Foyer Bar, per the
    proposal's migration-proof note. No flags to remove. Re-verify the
    Cloak gate (81/81) through the rewrite.
  - Migrate `zoo.story`: apply `zoo-phase-c-sketch.story`'s content (the
    already-written target artifact) as the new shipping story — 5 visit
    rules → room `after entering it` clauses; 2 feed rules → `feedable`/
    entity `after feeding it` clauses; 2 Aviary-mood rules → parrot/Aviary
    clauses; 4 once-vignettes → entity `on every turn while after-hours,
    once` clauses; all 3 flags removed per the leg-4 table (`gate-closed`
    deleted outright; `after-hours` → story state; `feeding-time-active` +
    feedable's `fed` field merged into `states, reversible: hungry,
    content`). Update `stories/friendly-zoo/src/chord-extras.ts`'s
    `gateStatus` producer to read the staff gate's `openable` state
    directly instead of `chord.flag.gate-closed`.
  - Apply David-approved transcript revisions from the audit; re-run the
    full augmented Zoo gate suite (existing walkthroughs + unit
    transcripts) via `node dist/cli/sharpee.js --test --chain`, per repo
    convention (bundle only, never the package-loaded path, per CLAUDE.md).
  - Zoo gate stays scoped at 7 files / 61 assertions — the 4 files already
    excluded by David in Phase B (initialDescription, ADR-209 snippets,
    ADR-195 slot contributors) remain excluded; their features are
    separate Phase C backlog, not this package's job.
  - **Restore the fixture-indirected tests** (Finding 1, closing the
    Phase 2 TODO): repoint `packages/story-loader/tests/zoo-pure-ir.test.ts`
    (and any other test Phase 2 repointed at the Phase 2 fixture) back to
    load the real, now-migrated `stories/friendly-zoo/zoo.story`; remove
    the `// TODO(phase-c-p5)` markers. Run a **repo-wide** grep for
    `chord.flag` — not scoped to `packages/` this time, covering
    `stories/**`, `docs/**`, and anywhere else the token could still
    appear — and confirm zero remaining references outside historical/
    archival documentation (session files, ratchet-log entries recording
    the removal, and this plan itself are expected hits and are fine).
- **Exit state**: both stories compile and run under the new grammar; Cloak
  gate 81/81 green (post-revision if any sanctioned deltas applied, with
  David's sign-off recorded in the audit doc); Zoo gate 61/61 green
  (same discipline); `gate-delta-audit.md` records every intentional change
  and its sign-off, with zero unresolved unintentional deltas;
  `zoo-pure-ir.test.ts` (and any other Phase-2-repointed test) loads the
  real shipping stories again with no TODO markers remaining; a repo-wide
  `chord.flag` grep returns zero hits outside historical documentation.
- **Status**: PENDING

### Phase 6: Full regression, docs re-cut, Phase C close
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: Cross-package regression and documentation — closing
  the package against ADR-210's ongoing constraints (AC-9 event-selector
  contract, no platform-package regressions, ratchet log fully reconciled).
- **Entry state**: Phase 5 complete; both gates green with all deltas
  sanctioned and recorded.
- **Deliverable**:
  - Full regression: `pnpm --filter '@sharpee/chord' test`, `--filter
    '@sharpee/story-loader' test`, `--filter '@sharpee/ide-protocol' test`,
    `--filter '@sharpee/devkit' test`; Cloak gate; Zoo gate; Dungeo unit +
    walkthrough suites (one-good-run rule) as an unaffected-check, since the
    platform-touch forecast is zero `packages/stdlib`/`world-model`/
    `engine` deltas — confirm no Dungeo regression exists to contradict
    that forecast; `./repokit build` clean.
  - AC-9 event-selector CI fixture re-verified: confirm legs 3/4 introduced
    no new event verb without a grammar-changes entry (entity-attached
    `after entering it` reuses the existing `enters` event verb).
  - Docs re-cut: `docs/reference/chord-grammar.md` regenerated from the
    parser's own tables (per ADR-210 — never hand-edited);
    `docs/work/story-language/design.md` §2/§3 examples updated to the new
    forms; `docs/work/chord/dungeo-conversion.md` §5 given a one-pass
    modernization (Finding 9) — its examples are written in the syntax this
    package removes (top-level `when`, `define flag`), so the examples need
    rewriting even though the document's conclusions (the gap-list itself,
    the Phase C backlog items it identifies) survive unchanged; every
    Phase 1 ratchet entry flipped from PROPOSED to its final as-shipped
    state in `docs/architecture/chord-grammar-changes.md` (any Phase 2-5
    deviation from the Phase 1 draft gets its own dated note, per the log's
    append-only discipline).
  - Explicitly confirm the out-of-scope items (below) were not silently
    pulled in during implementation.
  - Report Phase C ownership package complete against the proposal's four
    legs and ten owner decisions.
- **Exit state**: all suites green; `chord-grammar-changes.md` fully
  reconciled (no entry left at PROPOSED); docs re-cut; Phase C ownership
  package ready to report closed. Books (the two Sharpee Book editions) are
  explicitly release-time and out of scope for this phase, per the v2
  release strategy.
- **Status**: PENDING

## Risks

1. **On/after routing for dispatch verbs (biggest risk).** `on`-clauses
   already have a clean §5.4 story from Phase B (ActionInterceptor for
   standard verbs, CapabilityBehavior for dispatch verbs). `after`-clauses
   on *standard* verbs reuse the ActionInterceptor postReport-append shape
   with no new mechanism needed. `after`-clauses on *dispatch* verbs (the
   concrete case: `after feeding it` on goats/rabbits, reacting to
   `feedable`'s own `on feeding it` CapabilityBehavior) may need a
   post-behavior hook that does not clearly exist in the dispatch path
   today — `CapabilityBehavior`'s four phases (validate/execute/report/
   blocked) are the whole action; there is no documented second listener
   slot. This is resolved by a **runtime spike run directly in Phase 1**
   (it needs no new grammar, so there is no reason to wait for Phase 2-4's
   parser/analyzer work) — not something to discover mid-migration in
   Phase 5. If the resolution requires a `packages/world-model` or
   `packages/engine` change, that is a platform change needing David's
   discussion-first sign-off per CLAUDE.md before it's built (see
   Checkpoint 2), and the `after` ratchet entry is not signed until this is
   settled.
2. **Owner-scoped narration vs. the every-turn daemon architecture.** Phase
   B's `buildSchedulerDaemons` iterates all entities carrying a given trait
   every turn, unconditionally. Decision 10 adds a presence gate per clause
   — this must not introduce new persisted state (a presence check is a
   runtime read of player location, same shape as the existing can-see/
   can-reach co-location check) and must preserve RNG-stream determinism
   (AC-5) for on-stage firings while genuinely not consuming the RNG when
   off-stage. Getting the RNG-consumption boundary wrong either breaks
   AC-5 for on-stage sequences or silently reintroduces an off-stage RNG
   draw that changes downstream random outcomes in ways a transcript can't
   easily pin.
3. **Gate-delta scope creep.** The proposal and the sketch already draw a
   clean line between package-required changes, newly-possible content the
   sketch includes anyway (pettable kind-enum deletion, `create the snake`,
   `collect-map` awardability), and remaining gaps that stay out of scope
   (victory trigger, press mechanics, recurrence-offset, strategy-phrase
   ownership). The risk is Phase 5 drifting past that line under gate
   pressure — e.g., "fixing" the victory condition because a transcript
   would be more satisfying with one. If migration reveals a genuine need
   to touch something outside the sketch's own content, that is a
   checkpoint with David, not a silent scope add.
4. **IR-as-wire-type compatibility.** The IR is re-exported by
   `@sharpee/ide-protocol` and ADR-210 requires the loader and future
   emitter reference implementations to "stay behavior-equivalent." Phase
   3's IR schema additions (routing tags, scope tags, anchor references)
   must keep `ide-protocol` building clean — treat any IR shape change as a
   compatibility surface to verify, not an internal-only edit.
5. **Platform-touch forecast is a forecast, not a guarantee.** Zero
   `packages/stdlib`/`world-model`/`engine` deltas are expected (matching
   Phase A and Phase B's actual experience), but Risk 1's resolution is the
   one identified way this forecast could be wrong. Any other surprise
   `packages/` touch discovered during Phases 2-5 is a stop-and-discuss
   checkpoint, per CLAUDE.md's platform-change rule — never a silent
   scope addition.

## Explicitly out of scope for this package

Per the proposal's own "explicitly out of scope" section and the sketch's
"remaining gaps" list:

- **Victory condition** — `victory` text still has no `win` path; needs a
  score-total or checklist condition, and interacts with Given 5's
  no-counting rule. Not this package's job.
- **Press mechanics** — `collect-pressed-penny` stays dropped; the
  souvenir-press interaction was never transcribed into the sketch.
- **Recurrence-with-offset** — the feeding sequence stays four copy-pasted
  steps (`every 8 turns starting at turn 11` is separate backlog) *unless*
  it falls out of the step-anchor work (decision 9) trivially; if Phase 3/4
  discovers it does fall out for free, note it, but do not go looking for
  it as a goal.
- **The Phase B gate exclusions** — initialDescription, ADR-209 room
  snippets, ADR-195 slot contributors. These stay excluded from the Zoo
  gate; they rejoin when the grammar grows each specific feature, which is
  not this package.
- **Event-verb growth** beyond what leg 3 needs (`enters` remains the only
  event verb this package requires).
- **Strategy-phrase ownership** — `parrot-chatter`/`parrot-candor` stay
  top-level `define phrase` in the sketch; whether they should belong to
  the chatty/candid traits is an open ratchet question the sketch itself
  flags as unresolved, not a decision this package makes.
- **`each <condition>` iteration and quantifier/comparison conditions** —
  separate Phase C backlog, sequenced after the ownership package because
  the ownership shape changes where those features would attach.
- **Role-bound trait clauses on standard actions** — stays deferred (Phase
  B left this throwing at bind; this package does not revisit it).
- **Book re-cuts** — the two Sharpee Book editions are release-time tasks
  per the v2 release strategy, not part of Phase C.

## Plan review

An independent adversarial review (2026-07-11) found 2 blockers, 4
should-fixes, and 3 notes against this plan. All are resolved by amendment:

- **Blocker — mid-package tree honesty**: resolved via the "Mid-package
  tree honesty" section above and the fixture-indirection deliverables it
  drove into Phases 2, 4, and 5.
- **Blocker — gate-delta audit list was wrong**: resolved by replacing
  Phase 5's audit list with the four verified deltas (scoring rewrite,
  unpinned keeper-departure witness requirement, early goat-bleating, and
  recurring feeding) and removing the two verified-false items
  (`chord.flag.*` assertions, timeline keeper-leaves assertion).
- **Should-fix — owner-attached scores omitted from Phase 1**: resolved;
  also surfaced as Checkpoint 5 (does top-level `define score` survive?)
  for David to answer in Phase 1.
- **Should-fix — cross-trait state resolution and sequence-scope `change`
  missing**: resolved in Phase 3 and Phase 4 respectively; the sequence-
  scope leg-2/sketch conflict is surfaced as Checkpoint 6 for David to
  reconcile in Phase 1, not silently resolved in the sketch's favor.
- **Should-fix — on/after-dispatch-verb spike scheduled too late**:
  resolved by moving the spike from Phase 4 to Phase 1 (it needs no
  grammar, only Phase B's already-shipped machinery); the `after` ratchet
  entry now explicitly waits on the spike's answer.
- **Should-fix — dying/changing test files not named**: resolved by naming
  the specific story-loader tests (Phase 4) and chord fixtures (Phase 2)
  that need rewrite, with a rewrite budget called out rather than folded
  into a generic "tests updated" line.
- **Note — missing runtime coverage for two decision pillars**: resolved by
  adding dedicated unit tests for the statement `when` suffix and the
  body-level `must` statement to Phase 4, since the Zoo fixture alone
  doesn't exercise either.
- **Note — dungeo-conversion.md left in removed syntax**: resolved by
  adding it to Phase 6's doc re-cut list.

Checkpoint 5 (score-form removal-or-survival), Checkpoint 6 (sequence-scope
mutation reconciliation), and every gate-delta item in Phase 5 are David
checkpoint material, not resolved unilaterally by this plan — they are
drafted as explicit confirm-or-correct questions in Phase 1/5 rather than
answered by assumption.

---

**Reminder: this is a plan document only. No parser, analyzer, loader, or
story-content code changes happen as a result of writing this file.
Implementation of Phase 1 (or any later phase) begins only when David gives
explicit go-ahead, and Phase 2 specifically cannot begin until every Phase 1
ratchet entry is individually APPROVED.**
