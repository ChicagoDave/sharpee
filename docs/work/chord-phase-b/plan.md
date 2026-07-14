# Session Plan: Chord Phase B — Zoo-complete

**Created**: 2026-07-11
**Overall scope**: Implement ADR-210 Phase B — `define action`/`define trait`
declarations with full four-phase compilation (both halves: the
ActionInterceptor half shipped in Phase A, the CapabilityBehavior/dispatch
half deferred to Phase B), role binding, scheduler constructs (`once <cond>`,
`every N turns [, N times]`, `define sequence`), the full TS hatch contract
(`define action X from`, `define behavior X from`, plus pure-IR-profile
refusal), and `define score`/`award`. Gates: AC-2 (friendly-zoo.story passes
the zoo transcript suite, exercising custom actions, dispatch, scheduler, NPC
behaviors, scoring, and one hatch), AC-4 (pure-IR profile refuses hatches at
load), AC-9 (event-selector CI fixture).
**Bounded contexts touched**: N/A — infrastructure/tooling (compiler +
interpreter packages, continuing Phase A's `@sharpee/chord` and
`@sharpee/story-loader`). No `docs/ddd/notation.yaml` exists in this repo;
this plan uses Sharpee's own established platform vocabulary (traits,
behaviors, capability dispatch, IR) rather than formal DDD bounded-context
notation, per Phase A precedent.
**Key domain language**: `define action` / `define trait` (full declarations,
not just per-entity `create`-block overrides), role binding (`on <action>
anything as the <role>`), CapabilityBehavior (ADR-090/207), dispatch verb,
`define sequence` / `once` / `every N turns`, TS hatch (`define text/action/
behavior X from`), pure-IR profile, `define score` / `award`, the second gate
(zoo transcripts).

## References consulted
- `docs/architecture/adrs/adr-210-story-language.md` — ACCEPTED; Phase B is
  scoped to gate AC-2/AC-4/AC-9; the CapabilityBehavior/dispatch half of
  four-phase compilation (§5.4) is explicitly deferred from Phase A to Phase
  B; grammar additions are a one-way ratchet requiring a dated,
  David-approved entry in `docs/architecture/chord-grammar-changes.md`
  before landing; the platform-text guard (stdlib-shipped text sources from
  `lang-{locale}`, embedded `phrases <locale>` is story-content only) still
  applies to any story-language constructs this plan adds.
- `docs/work/story-language/design.md` — §3.2 (stdlib trait shapes: openable/
  wearable/container), §3.3 (Zoo NPC chatter, `define sequence` PA timeline,
  `once after-hours`), §3.4 (Zoo custom actions: `define action petting/
  feeding`, `pettable`/`feedable` traits, `define score`/`award`, per-entity
  phrase override) give the exact target shapes this plan's phases must
  produce; §4 compile-to mapping confirms CapabilityBehavior/dispatch-verb
  compilation and scheduler constructs are both "exists today" platform
  mechanisms (no platform change expected); §5.4 states the phase-order rule
  and interceptor-vs-behavior compiler rule the analyzer/loader must
  implement; §5.5/§5.6 define the hatch contract and the pure-IR vs. devkit
  profile split (AC-4); §5.11 confirms Phase B's suggested scope list
  matches this plan's phases.
- `docs/work/story-language/prereqs.md` — Prerequisite 2 (conditional trait
  composition) is legal **only** for traits whose clauses are all
  NPC-behavior-shaped (on-every-turn / on-player-enters) — directly relevant
  because Zoo's parrot uses exactly this shape (`chatty while not
  after-hours`); any other conditional-trait use is a load error by design,
  not a gap to fill. Prerequisite 3 (win/lose) and Prerequisite 4 (per-entity
  phrase override) are already implemented in Phase A's loader — Phase B
  reuses them, does not redesign them.
- `docs/work/chord-phase-a/plan.md` — Phase A COMPLETE (all 6 phases, DONE
  2026-07-10). `@sharpee/chord` and `@sharpee/story-loader` exist and build;
  the ActionInterceptor half of §5.4 is implemented (`runtime.ts`
  `buildDispatchingInterceptor`, keyed by target entity); native `.story`
  support exists in the CLI bundle (`--story <path>.story`, hatch resolution
  policy `dist/<base>.js` then `<base>.js` beside the `.story`); `sharpee
  compose` (`--check` / default) exists in devkit; the golden-gate pattern
  (author transcript suite → freeze → run via `node dist/cli/sharpee.js
  --test`) is established and this plan should follow the same shape for
  Zoo. Grammar-changes log stayed empty through all of Phase A except the
  four 2026-07-10 formatting entries (prose-block-only phrase text,
  paragraph breaks, `{br}`, `verbatim`) — those are already normative and
  any Phase B prose-bearing construct must honor them, not reopen them.
- `docs/work/chord/grammar.md` — the implemented Phase A grammar is the
  actual starting surface, and it draws a hard line this plan must extend:
  `on-clause = "on" WORD "it" NL` only — no role-binding form (`on <action>
  anything as the <role>`), no standalone `define trait`/`define action`
  declarations (Phase A only has per-entity `create`-block clauses and the
  `phrase <key>:` override), no `once`/`every`/`define sequence`, no
  `define score`. The event-verb set is `enters` only ("growing this set is
  a grammar change" — logged). All of these are exactly what Phase B must
  add.
- `docs/architecture/chord-grammar-changes.md` — currently four entries, all
  2026-07-10 formatting decisions, all already normative. Any Phase B
  grammar addition beyond what `design.md` already specifies as normative
  (role binding, `once`/`every`/`define sequence`, `define score` ARE
  already normative per design.md and ADR-210 — not grammar changes; a
  candidate conditional-blocked-exit or broader event-verb-growth addition
  from the dungeo-conversion gap list WOULD be a grammar change) needs a
  dated entry here, approved by David, before it lands.
- `docs/work/chord/dungeo-conversion.md` — §5 gap list evaluated against
  Zoo's actual needs (verified against `stories/friendly-zoo/src/*.ts`):
  Zoo has **no blocked exits at all** (`zoo-map.ts` has none), so
  conditional blocked exits (`<dir> is blocked while <cond>: <phrase>`, gap
  #2) is not required for AC-2 — it is a genuine "pull it in now, cheap and
  Cloak-adjacent" option, not a Zoo blocker. Zoo's room-visit scoring already
  uses the Phase-A-supported `enters` event verb (`scoring.ts`
  `ROOM_SCORE_MAP`); its petting/feeding scoring can be expressed as `award`
  statements directly inside the `pettable`/`feedable` traits' own `on
  <action> it` clauses (matching the container-capacity pattern from design
  doc §3.2) without needing new event verbs at all — so broader event-verb
  growth (gap #1: exits/takes/drops/eats/throws/pushes/reads/switches-on/
  dies/score-displayed) is also optional for AC-2, not required. Both are
  genuine "cheap, high-leverage, evaluate now" candidates per David's
  framing, decided at the Phase 1 checkpoint below — not silently scoped in.
  The rest of the gap list (dynamic exit mutation, runtime entity lifecycle,
  runtime trait mutation beyond the NPC-shaped case, vehicles) stays flagged
  as Phase C candidates, per the source document's own recommendation.
- `docs/context/project-profile.md` — pnpm/Turborepo/tsf build conventions,
  Vitest + `.transcript` walkthrough/integration test conventions, uniform
  lockstep versioning, TS strict mode via shared `tsconfig.base.json`;
  language-layer separation (already structural via Chord, per ADR-210
  Decision 5) is a convention this plan must keep honoring, not relax.
- `docs/context/session-20260710-1440-v2-210-chord-a.md` (most recent
  session file) — Open items carried into Phase B: David's review of two
  AFK-applied changes (parser-en-us wearing/taking_off grammar, lang-en-us
  `still_worn` message) is still pending — unrelated to Phase B scope but
  should be resolved before or alongside Phase B's own platform-adjacent
  checkpoints so outstanding review debt doesn't compound; Phase A's work
  was reported COMPLETE but **uncommitted** at session end — this plan's
  Phase 1 entry state assumes that work has since been committed (verify at
  Phase 1 start; if not, committing Phase A first is a prerequisite, not
  part of this plan); browser-client rendering fidelity for `{br}`/verbatim
  was verified CLI-only, not browser — not a Phase B blocker since Phase B's
  gate is also the CLI transcript harness, but worth a footnote if Zoo's
  `.story` uses verbatim/paragraph-break-heavy prose.

## Platform-touch forecast (identified up front, per CLAUDE.md)

ADR-210's Packages table and design.md's compile-to mapping (§4) both state
that Phase B's target mechanisms already exist and require **no platform
change**: story-grammar registration for `define action` verbs
(`extendParser`/`getCustomVocabulary`, ADR-087 — exists), capability dispatch
for `define trait` mutation clauses (`registerCapabilityBehavior`, ADR-090/
207 — exists), and daemon/fuse registration for scheduler constructs
(`plugin-scheduler` — exists, "registration surfaces consumed, no changes
expected" per ADR-210). The hatch contract binds to the **existing** `Action`
and `CapabilityBehavior` types (ADR-210 Interface Contract 3) — no new
platform interface is anticipated.

**Forecast: zero `packages/` deltas planned for Phase B**, matching Phase A's
experience (Phase A's only platform touch was the one pre-approved
`if-domain` ending wire-type, plus two incidental fixes surfaced and
discussed live — `going.ts` reorder, `wearing`/`taking_off` grammar). If a
phase discovers capability dispatch, story grammar, or scheduler are
insufficient for a specific Zoo construct (e.g., role binding needs new
context-value plumbing dispatch doesn't carry today), that is a **checkpoint
trigger**, not a silent scope addition — stop and discuss before touching
`packages/` other than `chord`/`story-loader`, exactly as CLAUDE.md requires.
`chord`/`story-loader` themselves have the same standing go-ahead Phase A
had.

## Checkpoints requiring David's decision before or during Phase 1

1. **Branch**: continue Phase B on `v2-210-chord-a` (current branch, pushed
   but not merged to main), or cut `v2-210-chord-b` off it? Affects how
   Phase A + Phase B land relative to main.
2. **Grammar-scope pull-ins from the Dungeo gap list**: adopt conditional
   blocked exits (`<dir> is blocked while <cond>: <phrase>`) and/or broader
   event-verb growth now (cheap, high-leverage, feeds Phase C) — or defer
   both, since neither is required by the Zoo gate itself (see dungeo-
   conversion.md finding above)? Each adopted item needs its own dated
   `chord-grammar-changes.md` entry before Phase 2 implements it.
3. **Zoo golden-gate suite strategy**: the existing `stories/friendly-zoo/
   tests/transcripts/*.transcript` (3 files) + `walkthroughs/wt-*.transcript`
   (5 files) are behavior-parity proofs against the hand-written TS story.
   Recommended approach (mirrors Phase A's Cloak precedent): treat these as
   the **starting draft**, verify they exercise every AC-2 category (custom
   actions ✓ petting/feeding, dispatch ✓ CapabilityBehavior, scheduler ✓ PA
   sequence/feeding-time/after-hours, NPC behaviors ✓ parrot chatty swap,
   scoring ✓ room-visit + action awards — but **no hatch** is currently
   exercised by any transcript), add at least one transcript exercising a
   hatch (recommend binding the existing `dynamic-text.ts`
   `registerDynamicText` producers — already an ADR-196 dynamic-text
   producer shape identical to Cloak's `garbled` hatch — as Zoo's `define
   text` hatch), then freeze the augmented suite as the AC-2 gate. Confirm
   this approach (or an alternative) before Phase 7.

## Phases

### Phase 1: Checkpoints, branch/scope decisions, and grammar-log entries
- **Tier**: Small
- **Budget**: 100 tool calls
- **Domain focus**: Project scaffolding and governance — no code.
- **Entry state**: ADR-210 Phase B scoping accepted by the user (this plan
  approved); Phase A's work is committed (verify — see Open Items above; if
  not, resolve before proceeding); `v2-210-chord-a`/`v2-210-chord-b` branch
  question open.
- **Deliverable**:
  - Branch decision recorded and acted on (stay on `v2-210-chord-a` or cut
    `v2-210-chord-b`).
  - Grammar-scope decision recorded for the two Dungeo-gap-list candidates
    (conditional blocked exits, event-verb growth); if either is adopted,
    a dated entry added to `docs/architecture/chord-grammar-changes.md`
    (form, rationale, example, decision) before any parser work begins.
  - Zoo golden-gate suite strategy confirmed (freeze-existing-plus-hatch-
    transcript, or an alternative David prefers).
  - A short audit of `stories/friendly-zoo/tests/transcripts/` +
    `walkthroughs/` against the six AC-2 categories (custom actions,
    dispatch, scheduler, NPC behaviors, scoring, hatch), recording which
    categories are already covered and which (expected: hatch) need a new
    transcript, appended to this plan or a
    `docs/work/chord-phase-b/zoo-gate-audit.md` companion.
- **Exit state**: All three checkpoints resolved and recorded; if grammar
  pull-ins were adopted, their governance-log entries exist; Phase 2 can
  start with an unambiguous grammar target list.
- **Status**: COMPLETE (2026-07-11). David's decisions: (1) **continue on
  `v2-210-chord-a`** — no new branch; (2) **conditional blocked exits
  adopted** into Phase B scope (dated grammar-log entry added
  2026-07-10-dated in chord-grammar-changes.md; event-verb growth deferred
  to Phase C); (3) **freeze-existing-plus-augmentation** for the Zoo gate —
  the audit (zoo-gate-audit.md) found scheduler, scoring, and hatch
  categories untested by the existing 8 transcripts, so the augmentation is
  three transcripts (timeline, scoring, hatch-text), not one. Phase A
  commit state verified: 97db6af2 + ac69118a pushed/committed; the
  wearing/taking_off review debt noted in References is resolved
  (ac69118a).

### Phase 2: Chord frontend — trait/action declarations, role binding, scheduler grammar, `define score`
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: `@sharpee/chord` lexer/parser/AST — the full set of new
  top-level declarations Phase A's grammar explicitly excludes (per
  `docs/work/chord/grammar.md`'s `(* Phase B: ... *)` markers).
- **Entry state**: Phase 1 complete; grammar scope for this phase is
  unambiguous (design.md-normative constructs plus any Phase-1-approved
  pull-ins).
- **Deliverable**:
  - `define trait X` as a standalone declaration (design.md §2.2/§3.2):
    `data` block (typed fields, `optional`, `starts <v>`), `phrases
    <locale>` block, one or more `on <action> it` / `on <action> anything as
    the <role>` clauses, `before X`/`after X` ordering between traits on the
    same action.
  - Role-binding grammar: `on <action> anything as the <role>` — the role
    name must resolve against the target action's declared roles (parse-
    time shape only; the resolution/validation gate is Phase 3).
  - `define action X` as a standalone declaration (design.md §2.3/§3.4):
    `grammar` block (verb patterns, `:slot` capture, cardinality forms
    `take all → each ...`, `take all but :exceptions`), `the <slot> must be
    reachable`-style scope constraints, `refuse without <slot>: <phrase>`,
    `refuse when <cond>: <phrase>`, `otherwise refuse <phrase>` (dispatch-
    miss form), a body of the existing statement set.
  - Scheduler grammar: `once <cond> ... end once` (design.md §3.3), `every N
    turns [, N times] ... end every`, `define sequence X ... end sequence`
    with `at turn N` / `N turns later` step headers (design.md §2.5/§3.3).
  - `define score X worth N` declaration and confirmation that `award
    <score> [, once]` (already Phase-A grammar) resolves against it.
  - If Phase 1 adopted conditional blocked exits: `<dir> is blocked while
    <cond>: <phrase>` extends the existing `create-line` blocked-exit form.
  - If Phase 1 adopted event-verb growth: the specific new verbs approved
    (at minimum whatever Zoo's own custom-action-emitted events need, if the
    Phase 1 audit found `award`-inside-trait insufficient for any Zoo
    scoring case).
  - Parser fixture tests: `packages/chord/test/fixtures/` gains fixtures for
    each new declaration form (positive) and malformed variants (resync/
    diagnostic tests), following Phase A's fixture-pair convention. Include
    the design.md §3.2 stdlib trait examples (openable/wearable/container)
    and §3.4 Zoo examples (petting/feeding actions, pettable/feedable
    traits, the PA `define sequence`, `once after-hours`) transcribed
    verbatim as fixtures, mirroring how Phase A transcribed `cloak.story`.
- **Exit state**: All new declaration forms parse to AST with zero errors on
  their design-doc fixtures; malformed fixtures produce the expected
  resync-and-report diagnostics; `pnpm --filter '@sharpee/chord' test`
  green.
- **Status**: COMPLETE (2026-07-11). All Phase B declaration forms parse:
  define trait (data types incl. one-of/optional/starts, embedded phrases,
  it/role/every-turn clauses, before/after ordering), define action
  (grammar patterns + `→` cardinality, scope constraints, refuse
  without/when, otherwise refuse, embedded phrases, §2.3 bodies,
  dedent-terminated), define action/behavior hatches, define score,
  once/every/define sequence (at-turn + relative steps), conditional
  blocked exits (Phase 1 pull-in), dotted phrase keys (`zoo.pa.closing-3`),
  declare-and-emit inline prose after `phrase <key>`, entity-name config
  values (`with food the handful of feed`), and `can see/reach` predicates
  (IR pred can-see/can-reach; evaluator throws until phases 4-5). Lexer: a
  lone `"` is prose punctuation (multi-line dialogue in §3.3 prose) —
  string-requiring positions diagnose at parse time (malformed fixture
  repurposed). Fixtures: zoo-actions.story (§3.4), zoo-timeline.story
  (§3.3), traits-basic.story (§2.2/§3.2 subset) + 4 malformed. NOTE two
  §3.2 deviations, deliberate: wearable/container's quantifier-comparison
  conditions (`any item where …`, `is over max weight`) are NOT parsed —
  they belong to the quantifier/comparison kit ADR-210 defers past AC-2
  (stdlib self-hosting); traits-basic carries a parseable stand-in body
  with the role-binding header verbatim. chord 81 tests green;
  story-loader 37 + ide-protocol 11 green; cloak golden gate 81/81 after
  bundle rebuild.

### Phase 3: Chord analysis — role-binding validation, four-phase partition (both halves), hatch-kind gates, pure-IR-profile flag
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: `@sharpee/chord` semantic analysis and IR — extending
  the Phase-A two-pass resolver and load-time gates to Phase B's grammar,
  and marking the IR with the information the loader needs to route
  ActionInterceptor vs. CapabilityBehavior.
- **Entry state**: Phase 2 complete; AST available for `define trait`/
  `define action`/scheduler fixtures.
- **Deliverable**:
  - Role-binding validation gate: `as the <role>` names must match a role
    the target action declares (AC-3-style diagnostic, `.story` line
    numbers, per design.md §5.3 item 3).
  - Four-phase partition, **both halves** implemented as the automated
    compiler rule from design.md §5.4: trait clause on a standard-semantics
    action → ActionInterceptor path (already built in Phase A); trait clause
    with mutations on a **dispatch verb** (a `define action`-declared
    action) → **CapabilityBehavior** routing decision recorded on the IR
    node. The phase-order rule (`refuse` before first mutation) already
    exists for entity-scoped clauses — extend the same check to `define
    trait`'s standalone `on` clauses.
  - Hatch-kind analysis: `define action X from "./mod.ts"` and `define
    behavior X from "./mod.ts"` declarations recognized alongside Phase A's
    `define text X from`; each records its target interface kind
    (producer/action/behavior) on the IR for the loader to bind against.
  - Pure-IR-profile flag: IR carries a computed `hasHatches: boolean` (or
    equivalent) so a profile check can refuse load without re-scanning
    source — this is the IR-side half of AC-4; the loader-side refusal
    enforcement is Phase 6.
  - `define score` identity registration in the two-pass resolver (score IDs
    are a namespace like phrases/states — duplicate/undeclared-score
    diagnostics).
  - **Open-condition selections** (grammar log 2026-07-11, David-approved
    mid-phase): classify every `define condition` as OPEN (references
    `it`/`its`) or CLOSED; resolve the `any <condition-name>` reference form
    in when-rule targets and has/holds/wears thing-positions; the two
    never-guess gates (open condition as bare `while` test without `it` in
    scope; `any` naming a closed condition). Evaluation lands with phases
    4–5 (bounded enumeration binding `it`).
  - IR snapshot + negative-fixture tests for every new gate class, following
    Phase A's `packages/chord/test/fixtures/` pattern (one positive snapshot
    per new construct, one negative fixture per new diagnostic).
- **Exit state**: Zoo-shaped fixtures (petting/feeding actions + traits, the
  PA sequence, `once after-hours`) produce stable IR snapshots with correct
  ActionInterceptor/CapabilityBehavior routing recorded; role-binding and
  hatch-kind diagnostics fire with `.story` line numbers; `pnpm --filter
  '@sharpee/chord' test` still green.
- **Status**: COMPLETE (2026-07-11). IR: traits/actions/scores/onceRules/
  everyRules/sequences arrays, hasHatches, IRHatch.hatchKind,
  IROnClause.{binding,role,condition,ordering,routing},
  IRBlockedExit.condition, IRNamedCondition.open, IRRule.{actionName,target
  union entity|anything|any-condition}, IRValue slot/flag, IRCondition flag.
  Analyzer: Scope-aware resolution (trait fields as `its <field>`, action
  slots + role words + `the actor` as context values, flags in value/
  condition/set positions, boolean symbols, `its <field>` predicate
  objects, `holds nothing` idiom); §5.4 routing both halves recorded per
  clause; role validation (declared slots + actor; curated
  STANDARD_ACTION_ROLES for standard actions) with roles listed in the
  message; slot validation on constraints/refuse-without; score
  registration + duplicate/unknown-award gates; open/closed classification
  + both never-guess selection gates (open-condition-truth,
  closed-condition-selection); when-verb derivation from action gerunds
  (pets/feeds) + target segmentation (entity | anything | any <cond>);
  declare-and-emit inline phrases registered in pass 1; select-on arms and
  is-objects validated against one-of/flag field value sets; template
  phrases (formatter-chain forms) exempted from the bare-marker gate.
  Loader compat: rule-target union + derived-verb rules deferred at bind
  (phases 4-5), flag condition/value evaluation, slot values throw until
  dispatch lands. chord 103 tests green (22 new in
  analyzer-phase-b.test.ts incl. zoo-actions golden IR snapshot);
  story-loader 37 + ide-protocol 11 green; cloak gate 81/81 post-rebuild.
  Note: hatch-kind interface VALIDATION (binding checks) is Phase 6 as
  planned — Phase 3 records kinds only.

### Phase 4: Story-loader — dispatch-verb compilation (define action + trait CapabilityBehaviors, role binding, scoring)
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: `@sharpee/story-loader` — the CapabilityBehavior/
  dispatch-verb half of §5.4 that Phase A deferred; this is the mechanism
  Zoo's `pettable`/`feedable` need (design.md §3.4).
- **Entry state**: Phase 3 complete; IR carries correct ActionInterceptor/
  CapabilityBehavior routing for Zoo-shaped fixtures.
- **Deliverable**:
  - `define action X` → a real four-phase `Action` registered via
    `extendParser`/`getCustomVocabulary` (ADR-087), mirroring
    `pettingAction`/`feedingAction`'s shape in
    `stories/friendly-zoo/src/index.ts` (validate finds the capability-
    bearing trait via `findTraitWithCapability`, execute/report delegate to
    the resolved `CapabilityBehavior`, blocked emits the dispatch-miss
    `otherwise refuse` phrase).
  - `define trait X`'s mutation-bearing `on <action> it` / `on <action>
    anything as the <role>` clauses on a dispatch verb → a real
    `CapabilityBehavior`, registered per-world via
    `world.registerCapabilityBehavior` (ADR-090/207 idempotent binding
    maps), evaluated by the same AST-walking evaluator Phase A built (extend
    it only if a Zoo condition needs a selector form Cloak didn't exercise —
    check against `docs/work/chord/grammar.md`'s condition grammar first).
  - Role binding at runtime: `as the <role>` clauses resolve against the
    actual role bindings the dispatching action supplies (target/actor/
    instrument-equivalent), matching the container-capacity pattern (design
    doc §3.2, "taker" role).
  - `define score X worth N` → score identity registration (ADR-129 dedup-
    by-identity semantics — "once" is automatic, matching design.md §3.4's
    note); `award <score>` (already-built statement) resolves against it.
  - Unit tests (`packages/story-loader/test/`): a `pettable`/`feedable`-
    shaped fixture story loads and produces working petting/feeding
    behavior — pet an animal, get species-specific phrase; feed with wrong/
    right item, get correct refusal/success; snake-glass special case;
    score awarded exactly once per distinct achievement even if repeated.
- **Exit state**: A Zoo-shaped fixture story's custom dispatch actions and
  trait behaviors work end-to-end through direct `story-loader` calls (not
  yet the CLI transcript harness — Phase 7); `pnpm --filter
  '@sharpee/story-loader' test` green.
- **Status**: COMPLETE (2026-07-11). ChordDataTrait (dynamic-typed
  `chord.trait.<name>` instances, fields as own props — serialize with the
  world, AC-6-safe; `starts` defaults + `with` config incl. entity-name
  values resolved to IR ids); trait clauses registered per TRAIT TYPE at
  bind — dispatch clauses → CapabilityBehavior via
  registerCapabilityBehavior (§5.4 second half: refusal scan + occurrence +
  decision snapshot in validate via sharedData, mutations in execute,
  reports in report, blocked → phrase event), standard-semantics clauses →
  registerActionInterceptor under the trait type (ADR-118 per-trait
  resolution); `define action` → four-phase dispatch actions
  (getCustomActions, structurally typed): refusal ladder (without → when →
  dispatch-miss otherwise), instance-type binding lookup
  (getBehaviorBinding — the constructor-static getBehaviorForCapability
  path can't see dynamic trait types), slot bindings (primary slot +
  actor) threaded through EvalContext.slots; extendParser registers
  pattern grammar at priority 150 (cardinality patterns skipped — Phase
  C); derived-verb when-rules fire in report (anything / entity /
  any-condition targets, occurrence + ordinals honored); `award <score>` →
  world.awardScore (ADR-129 dedup verified by test), setMaxScore = sum of
  declared scores; evaluator gains slots + chord-trait field reads
  (entity-typed values IR→world) + field writes via `set`. Role-bound
  trait clauses throw at bind (post-Zoo; traits-basic exercises the
  grammar/IR only). story-loader 43 tests green (6 new dispatch tests:
  species select-on, glass-way refusal, dispatch miss, without-slot,
  fed-flag mutation + award-once + already-fed ladder); chord 103; cloak
  gate 81/81 post-rebuild. Every-turn clauses deferred to Phase 5 as
  planned.

### Phase 5: Story-loader — scheduler constructs (`once`, `every`, `define sequence`)
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: `@sharpee/story-loader` — binding scheduler grammar to
  `plugin-scheduler` daemons/fuses, replacing Zoo's hand-rolled
  `events.ts` daemon/fuse plumbing (PA announcements, feeding-time +
  goat-bleating, after-hours) with declarative constructs.
- **Entry state**: Phase 4 complete (dispatch verbs available, since some
  scheduler-fired effects may need to interact with dispatch state, e.g.
  feeding-time deactivation).
- **Deliverable**:
  - `every N turns [, N times]` → a daemon registration, IDs derived from
    declaration path (per design.md §5.5), matching Zoo's goat-bleating
    daemon shape (`ctx.world.getStateValue`/`setStateValue` guard + N-times
    countdown) but as declared state, not `getRunnerState`/
    `restoreRunnerState` plumbing.
  - `define sequence X ... at turn N ... N turns later ... end sequence` →
    chained fuses, each arming the next (design.md §2.5/§3.3), reproducing
    the PA closing-announcement timeline (`zoo.pa.closing-3/-2/-1/closed`)
    declaratively.
  - `once <cond> ... end once` → a daemon that retires after firing,
    reproducing the after-hours `move Sam the zookeeper offstage` +
    departure-phrase behavior (design.md §3.3) — note Prerequisite 2's
    constraint: this is a **statement block firing on a condition**, not
    conditional trait composition; verify the parrot's `chatty while not
    after-hours` / `candid while after-hours` swap (which IS conditional
    trait composition, NPC-behavior-shaped, prereqs.md-legal) is handled by
    the existing Phase A conditional-composition machinery, not confused
    with this phase's `once` construct.
  - Occurrence/declared-state persistence: scheduler-driven state (sequence
    progress, daemon countdown, `after-hours` flag) is namespaced world
    state per Phase A's occurrence-materialization pattern — save/restore/
    undo-safe with no author-written persistence, closing the exact gap
    design.md §6 names (`getRunnerState`/`restoreRunnerState` plumbing →
    declared/implied state is world state).
  - Unit tests: sequence steps fire on the correct turns in order; `every`
    daemon fires N times then retires; `once` daemon fires exactly once and
    executes its body; a save/restore cycle mid-sequence resumes correctly.
- **Exit state**: A Zoo-shaped fixture story's PA sequence, feeding-time/
  goat-bleating daemon, and after-hours `once` all fire correctly and
  survive save/restore through direct `story-loader` calls; `pnpm --filter
  '@sharpee/story-loader' test` green.
- **Status**: COMPLETE (2026-07-11). runtime.buildSchedulerDaemons():
  `every N turns[, M times]` → interval daemon with fired-count in
  chord.occurrence.every.<i>; `once <cond>` → self-retiring daemon
  (chord.occurrence.once.<i>); `define sequence` → one daemon per sequence
  with an absolute-turn schedule (at-turn anchors + relative chaining) and
  step cursor in chord.occurrence.sequence.<slug> (catch-up-safe `turn >=`
  condition); every-turn trait clauses → one daemon per clause iterating
  entities carrying chord.trait.<name>, gating on the COMPOSITION condition
  per entity (`chatty while not after-hours` — Prerequisite 2's
  NPC-behavior shape, now legal in the loader for declared traits whose
  clauses are all every-turn) then the clause condition. ALL progression
  state is world state — zero getRunnerState plumbing (design.md §6 win
  proven by the transplant test). ChordStory.onEngineReady registers a
  SchedulerPlugin + daemons (plugin-scheduler is a new story-loader dep);
  daemons structurally mirror the plugin's Daemon type and are exposed for
  direct unit driving. can see/can reach evaluate as co-location
  (containing-room equality) — noted as the Phase B semantics. Scheduler
  events carry narrate:true. story-loader 49 tests green (6 new:
  per-construct daemon inventory, sequence schedule + flag flip, every
  retire-after-4, once exactly-once + Sam offstage state, chatty⇄candid
  conditional-composition flip, mid-sequence world-state transplant);
  chord 103; cloak gate 81/81 post-rebuild. Seed note: tests use seed 11
  (seed 42's int(1,2) stream opens with 7 straight misses — worth knowing
  for future chance-based tests).

### Phase 6: Hatch contract completion and pure-IR-profile enforcement (AC-4)
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: `@sharpee/story-loader` — the two new hatch kinds and
  the profile split (design.md §5.6) that makes AC-4 a real, tested gate
  rather than an assumption.
- **Entry state**: Phase 5 complete; Phase 3's IR already records hatch kind
  and a computed `hasHatches` flag.
- **Deliverable**:
  - `define action X from "./mod.ts"` binds the named export to the
    existing `Action` type (ADR-210 Interface Contract 3) at load; missing
    or mis-typed export is a load error (matching Phase A's `define text`
    hatch error-handling shape).
  - `define behavior X from "./mod.ts"` binds the named export to the
    existing `CapabilityBehavior` type at load, same error handling.
  - Pure-IR profile: a loader construction mode that **refuses to load** any
    story whose IR has `hasHatches: true`, with a clear load-time error
    (not a silent no-op) — implements the devkit-profile vs. pure-IR-profile
    split from design.md §5.6.
  - Hatch-free load path: confirm a story with zero hatches loads and runs
    identically under both profiles (no behavioral difference when there's
    nothing to refuse).
  - Unit tests: `define action from`/`define behavior from` bind correctly
    and a mis-typed/missing export fails to load with a clear error; the
    pure-IR profile refuses a hatch-bearing fixture at load with no author
    code execution path (assert nothing from the hatch module executes —
    not just that loading throws); the pure-IR profile loads and runs a
    hatch-free fixture successfully. This is AC-4's full test surface.
- **Exit state**: AC-4 has a passing, named test backing both halves (refuse
  hatches / run hatch-free stories as data); `pnpm --filter
  '@sharpee/story-loader' test` green.
- **Status**: COMPLETE (2026-07-11). StoryLoaderOptions.profile
  ('devkit'|'pure-ir'); bindHatches refuses hatch-bearing IR under pure-ir
  BEFORE any module access (Proxy-tripwire test proves zero author-code
  reads — AC-4's strong half); hatch binding by kind: text → producers
  (unchanged), action → boundActions (shape-validated four-phase object,
  surfaced through getCustomActions alongside dispatch actions; grammar is
  the module's own concern), behavior → boundBehaviors (validate/execute/
  report shape). Missing/mis-typed exports are LoadErrors naming the
  export and module (tests per kind). Hatch-free stories load identically
  under both profiles (projection-equality test on zoo-actions).
  story-loader 55 tests green (6 new); chord 103; compose gate-clean
  sanity. Note: `define behavior` ATTACHMENT semantics (what references a
  bound behavior) are exposed via story.boundBehaviors for hosts — a
  language-level referencing construct wasn't specified by design.md §5.6
  and is deliberately not invented here (Phase C/grammar-log candidate if
  Zoo's Phase 7 authoring needs it).

### Phase 7: Integration gate — `zoo.story` authored, event-selector CI fixture, golden transcripts green
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: End-to-end Phase B acceptance — the "second gate"
  (design.md §5.9): `friendly-zoo.story` interpreted by `story-loader`,
  proving AC-2, AC-4, AC-9 against real transcripts, not just fixtures.
- **Entry state**: Phases 2–6 complete; all Phase B constructs work through
  direct `story-loader` calls on synthetic Zoo-shaped fixtures; Phase 1's
  golden-gate-suite strategy decision is in hand.
- **Deliverable**:
  - `stories/friendly-zoo/zoo.story` authored from the design.md §3.3/§3.4
    examples plus the remainder of Zoo's actual content (rooms, entities,
    NPCs, PA sequence, scoring) transcribed from `stories/friendly-zoo/src/
    *.ts` — living alongside the existing TS `src/`, which is **not**
    modified or removed (same non-destructive pattern as Cloak in Phase A).
  - At least one hatch wired per AC-2's explicit requirement — per the
    Phase 1 audit's recommendation, bind `dynamic-text.ts`'s
    `registerDynamicText` producers (Optional/Choice ADR-196 consumers,
    already hatch-shaped) via `define text X from`, or David's alternative
    choice from the Phase 1 checkpoint.
  - The Phase 1 golden-gate suite (existing 3 test transcripts + 5
    walkthroughs, augmented with a hatch-exercising transcript per the
    audit) run against the Chord-interpreted `zoo.story` via `node dist/
    cli/sharpee.js --test` — fixed until green. This is AC-2.
  - Event-selector CI fixture (AC-9): an automated test verifying the map
    from language event-verb forms to `if.event.*` types/payloads stays in
    sync with stdlib's actual emissions — fails CI if a referenced stdlib
    event type or payload field is renamed/removed. Scope: the event verbs
    Zoo's `zoo.story` actually uses (at minimum `enters`; more if Phase 1/2
    adopted event-verb growth).
  - AC-4 sweep against the real `zoo.story`: confirm the pure-IR profile
    genuinely refuses it (since it has at least one hatch) while a
    hatch-stripped variant loads under pure-IR.
  - `docs/architecture/chord-grammar-changes.md` updated with a dated entry
    for any grammar delta discovered during Phases 2–7 that wasn't already
    normative in design.md or approved at the Phase 1 checkpoint — expected
    to be empty/unchanged-beyond-Phase-1-entries if implementation stayed
    within the approved scope.
  - Full regression: `pnpm --filter '@sharpee/chord' test`, `--filter
    '@sharpee/story-loader' test`, the Cloak golden gate (still green, not
    regressed), the Dungeo unit + walkthrough suites (one-good-run rule),
    `./repokit build` clean.
- **Exit state**: `node dist/cli/sharpee.js --test` on the augmented Zoo
  golden transcript suite is green against the Chord-interpreted
  `zoo.story`; AC-2, AC-4, AC-9 all have a passing, named test/run backing
  them; Phase B is ready to report as gate-complete against ADR-210.
- **Status**: COMPLETE (2026-07-11). `stories/friendly-zoo/zoo.story`
  (~770 lines) authored alongside untouched TS `src/`; 3 `define text`
  hatches bound to new `src/chord-extras.ts` (flavor/aside/gate-status
  producers). **AC-2**: gate corpus frozen at 11 files / 87 assertions
  (existing 8 + timeline/scoring/hatch-text augmentation, authored and
  verified against the TS story first); 4 files excluded by David's
  decision — every failure in them traces to host-shell phrase-algebra
  surfaces Chord doesn't expose yet (initialDescription, ADR-209
  snippets, ADR-195 slot contributors → Phase C backlog); shipped gate =
  **7 files, 61/61 green** (see zoo-gate-audit.md "Gate scope decision").
  **AC-4**: `tests/zoo-pure-ir.test.ts` — pure-IR refuses the real
  zoo.story (3 hatches) before touching any hatch export (Proxy
  tripwire); a hatch-stripped variant builds the full world (maxScore
  100) under pure-IR. **AC-9**: `src/event-contract.ts` (type-only
  stdlib import makes a `toRoom` payload rename a story-loader build
  failure) + `tests/event-selector.test.ts` (map completeness vs chord's
  EVENT_VERBS, pinned type strings); runtime.ts now imports the map.
  Grammar log check: no Phase 2–7 delta beyond the 6 approved entries
  (`define sequence` etc. were already normative in design.md). Full
  regression green: chord 103, story-loader 60, cloak gate 81/81, zoo
  gate 61/61, dungeo unit suite 1697 passed (9 expected failures, 4
  skipped), stdlib 1314, `./repokit build dungeo` + `friendly-zoo` clean.
