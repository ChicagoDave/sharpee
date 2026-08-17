# Session Plan: Implement ADR-320 (conversation and complex dialogue)

**Created**: 2026-08-16
**Plan Status**: ACTIVE
**Overall scope**: Land ADR-320 — the conversational surface that reads the ADR-310/318
character interior instead of merely gating it. Two levels (scene, exchange point);
manner-shaped delivery; time-as-words; disposition-driven initiative; world-bounded
agency with silence as the inalienable move; two-word threading; multi-party floor and
interruption; the player's own utterances as witnessed claims; a presentation-agnostic
wire schema; and a new theatre-company demonstration story whose player task is
specified before mechanism is built. Nine packages change (`chord`, `character`,
`world-model`, `stdlib`, `engine`, `story-loader`, `platform-browser`/`devkit`, the IDE
testing surface) plus the demonstration story; `parser-en-us` and `lang-en-us` are
deliberately untouched (ADR-320 Implementation).
**Bounded contexts touched**: Chord Story Language (grammar/analyzer/manifest for the
new constructs), Character subsystem (`@sharpee/character` scene runtime — floor,
interruption, manner selection, conversation memory), stdlib NPC/dialogue dispatch
(exchange overlay, D15 socket, witnessed-claim feed), World Model (scene/memory
persistence shape), story-loader (load-time instantiation, evaluator coverage), engine
(NPC↔NPC scene scheduling in the turn phase, save/restore), platform-browser/devkit +
IDE testing surface (D12 wire schema and its consumption), and the Theatre Company
demonstration story as its own content vehicle.
**Key domain language**: scene · exchange point · boundary block · manner block / beat ·
floor · interruption (`passive`/`assertive`/`blocking`) · initiative (disposition-under-
circumstance) · discussed-ness / subject-change (threading) · witnessed claim · wire
affordance.

## References consulted
- `docs/architecture/adrs/adr-320-conversation-and-complex-dialogue.md` — the plan's own
  source: D1–D13 fix the mechanism (scene/exchange two-level model, manner fallback,
  time-as-words, disposition-driven initiative, world-bounded agency, threading,
  multi-party floor/interruption, witnessed player claims, presentation-agnostic wire,
  the theatre demonstration story); the Implementation section names the nine packages
  that change and the two that deliberately don't; the 13 Acceptance criteria are the
  trace target every phase's exit state must aim at; D1 forbids smuggling new interior
  state into `packages/character`'s model — any gap found here is raised as an ADR-310/318
  amendment, never patched in place.
- `docs/architecture/adrs/adr-142-conversation-system.md` — SUPERSEDED by ADR-320, but its
  `conversation/lifecycle.ts` machinery (`ConversationIntent`, `ConversationStrength`,
  `ContinuationEntry`, `InitiativeTrigger`, attention decay, redirect results) is the D4
  scene's runtime skeleton to wire live, not reinvent; its Layers 1/2/4 (topic registry,
  constraint evaluator, ACL) are explicitly NOT reused — ADR-320 replaces them with the
  Chord topic-table + D15 dialogue-selector-socket path, so any phase that finds itself
  resurrecting `topic-registry.ts`/`constraint-evaluator.ts`/`acl.ts` logic is off the
  ADR-320 path.
- `docs/architecture/adrs/adr-090-entity-centric-action-dispatch.md` — capability dispatch
  (trait declares capability, behavior implements validate/execute/report/blocked) is the
  extension idiom; the stdlib integration phase's D15 socket registrant and the exchange
  overlay must follow this registration pattern (per-world binding map, idempotent), not
  an ad-hoc hook, and any new capability-effect messageId must be fully-qualified.
- `docs/architecture/adrs/adr-316-multi-turn-actions.md` — the turn-cost/elapsed-time
  model (single-tick "model A" vs. multi-turn "model B") is still open; D6's "one clock
  seam" discipline must read time through `@sharpee/character`'s existing clock-access
  seam exactly as ADR-310 D6 already does, and no ADR-320 phase may assume ADR-316's
  eventual phrasing.
- `docs/architecture/adrs/adr-180-build-test-devkit.md` — fixes the build-CLI split this
  plan's every implementation phase must honor: `./repokit build dungeo` for the in-repo
  platform/story build, `./sharpee` only for an author's own out-of-repo story project;
  transcript testing always runs against `dist/cli/sharpee.js`, never the package tree.
- `docs/context/project-profile.md` — the Mutation Signatures section fixes what a
  real-path assertion means per domain this plan touches: `@sharpee/character`
  (`conversation state advances`, arbiter decisions actually applied via `apply.ts`),
  Chord (`story-loader` interpreting IR into a runnable Story, diagnostics actually
  pushed), Domain Modeling/Engine (`WorldModel` mutations via `*Behavior` classes,
  capability-effect re-minting), and Testing Intelligence/IDE (`testing-surface`
  click-to-assert and `authorChannels` visibility flips) — every phase's Deliverable
  below is written to that bar, not to return values or "didn't throw."
- `docs/context/session-20260816-2315-feat-ide-explain-npc-turn.md` (newest session) —
  no open items or blockers carried into this plan; the session's sole recorded goal is
  this plan itself.

## Phases

### Phase 1: TS-level contracts — scene, memory, wire, and scoring shapes
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: cross-package type contracts (no behavior change) — the scene and
  conversation-memory state shapes (`@sharpee/character`), the wire affordance schema
  (D12 — response kinds a scene advertises), the D15 socket registration signature
  extended for exchange-aware selection, and the floor/interruption scoring interface
  (D7/D10). The same discipline ADR-310/318 used for their Phase 1 (`docs/work/archive/
  adr-310/contracts.md`).
- **Entry state**: ADR-320 ACCEPTED (2026-08-16). Platform-change discussion held with
  David and confirmed for `packages/character` and `packages/world-model`, the two
  packages this phase's type declarations land in (CLAUDE.md: platform changes require
  discussion before implementation — this is the first platform-touching phase).
- **Deliverable**: a `contracts.md` in this work directory (mirroring ADR-310's), plus
  the actual TS declarations: (1) scene state shape — participants, contested floor,
  open exchange or none, lifecycle boundary markers (first-meeting/return/exit/silence),
  per-pair visit/absence counters; (2) conversation-memory state shape — per-pair
  discussed-topic set (D9), recency reads keyed through the existing clock seam (D6);
  (3) the wire affordance schema (D12) — speaker/addressee/phrase/manner-beats/floor-
  change/interruption/rendered-silence as structured events, plus the advertised-
  response-kind shape (verbal row / act-event row / silence); (4) the D15 socket
  registration signature, extended to accept exchange-overlay selection alongside the
  existing topic-table selection, without breaking the zero-registrant default path;
  (5) the floor/interruption scoring interface — disposition-under-circumstance inputs
  (D7) and the `passive`/`assertive`/`blocking` strength vocabulary (D10), expressed as
  the same forces-feed-arbitration idiom ADR-318 uses, not a new scoring mechanism. No
  Chord grammar and no runtime wiring in this phase — types and interfaces only, so
  every later phase codes against a fixed target the way ADR-310 Phase 1 fixed the
  arbiter/trait contract for ADR-310 Phases 2–7.
- **Exit state**: `packages/character` and `packages/world-model` compile clean under
  `tsc` with the new types present and unconsumed; no runtime behavior differs from
  today; `contracts.md` is the fixed reference every later phase's Entry state cites.
- **Status**: DONE (2026-08-16, session 8e2f49, branch
  `feat/adr-320-implementation`). Evidence: `contracts.md` written and
  **APPROVED** by David 2026-08-16 — §1.3 scene home ruled (world-state key
  `character.scenes` over per-trait mirroring), §7 `ContinuationIntent` rename
  approved for Phase 5, and §2.1 folded in from the same review (the PC may
  carry `CharacterModelTrait`; no state-bearing PlayerTrait). Types declared
  and unconsumed in `world-model` (`conversation-scene.ts`, `scene-wire.ts`,
  D15 socket extension in `dialogue-selector-binding.ts`) and `character`
  (`conversation/scene-scoring.ts`); leaf barrels updated; repo-wide
  `npx tsc --noEmit` clean (run 2026-08-16 this session, exit 0, no output).
  No runtime behavior change — types only.

### Phase 2: Theatre Company demonstration story — the player task, specified before mechanism
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: content design, not code — the D13/Consequences discipline ("the
  player task is specified before mechanism is built," the *City of Secrets* lesson
  already applied once via thealderman before ADR-310/318).
- **Entry state**: ADR-320 D13 names the premise (a Shakespeare-era theatre company,
  rehearsal through performance, a new vehicle — not thealderman, not Reflections).
  **David provides every story element** (per standing instruction — Claude never
  invents story or creative content); this phase's job is to ask the questions and
  record the answers, not to fill gaps. **REQUIRES DAVID'S CONTENT INPUT** — this phase
  cannot close without a working session to gather: the company's cast (roles, names,
  personalities as D7 initiative dispositions would need them), the play-within-the-
  story (title, plot beat the rehearsal is building toward), the player's own role and
  task (what they are trying to accomplish and how "winning" is recognized), the
  locations and the rehearsal-to-performance timeline (D6's clock structure), and which
  of D4–D12's constructs each story beat is meant to exercise per the Acceptance
  criteria (1–13) they trace to. **Story artifacts stay plain** (David, 2026-08-16):
  the story's own files — Chord source, transcripts, in-story requirement notes —
  state requirements in straightforward story language and never cite ADRs or
  D/AC numbers; the construct-to-beat traceability table lives in this work
  directory's design doc and the Phase 11 audit, not in the story.
- **Deliverable**: a `theatre-story-task.md` design document in this work directory:
  premise and cast (David's answers, recorded verbatim where given), the player's task
  stated as a City-of-Secrets-style one-paragraph goal, the location/timeline map, and a
  construct-to-beat table (which scenes exercise scene lifecycle/boundary, exchange
  overlay, manner fallback, time words, initiative, interruption, world-bounded exit/
  silence, NPC↔NPC scenes, player-claim propagation, and threading — Acceptance 1–10,
  13). No Chord source, no dialogue prose — this phase specifies the task, later phases
  author against it.
- **Exit state**: the design document exists, is confirmed by David as complete enough
  to author against, and is the fixed reference Phase 10 (story authoring) and Phase 11
  (acceptance closure) cite for what the demonstration story must exercise.
- **Status**: DONE (2026-08-16, session 8e2f49). Evidence:
  `theatre-story-task.md` CONFIRMED by David ("confirmed - close Phase 2") —
  cast (Shakespeare, Burbage, Kemp; sketches confirmed), *Julius Caesar* at the
  1599 Globe, Kemp's departure as the crisis, player = Henslowe's agent in
  disguise with both objectives (poach Kemp + steal the play-book), 3-day
  clock, 4-location set, and the full construct-to-beat table tracing AC1–13.
  All content David's, gathered by interview this session; story files will
  carry plain requirements only (no ADR references, David's standing ruling).

### Phase 3: Chord grammar — scene, boundary, manner, and time/threading constructs
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: Chord Story Language — `define manner` (D5), boundary blocks
  (`define greetings` or its final spelling — D4), the time-word predicates (D6 —
  recency like `when program-shown is fresh`, absence words at boundaries), and the
  threading predicates (D9 — `when <topic> was discussed`, `when the subject changes`).
- **Entry state**: Phase 1 done (scene/memory state shape fixed as the compile target).
  Platform-change discussion held and confirmed for `packages/chord`. Every new
  vocabulary slice (time words, threading words) goes through the freeze review with
  David before it ships as compatibility surface (ADR-320 Implementation, echoing
  ADR-310/318 D-discipline) — flag rather than silently pick a word list.
- **Deliverable**: lexer/parser/analyzer support for `define manner` (beat rotation
  without back-to-back repeats, `voice` markers, most-specific-wins against hand-authored
  state-conditioned rows); boundary blocks selected by first-time/return/absence words;
  the recency and absence predicate vocabulary reading through the one clock seam; the
  `was discussed`/`the subject changes` predicates tracked per-pair across scenes. New
  diagnostics for each (unknown manner state, malformed boundary condition, unknown time/
  threading word). Compiled-story IR wire shapes carrying these constructs, agreed with
  story-loader's existing manifest idiom since Phase 7 depends on it. Behavior Statements
  (rule 12) for any new mutation-bearing analyzer/IR functions before their tests.
- **Exit state**: ADR-320 Acceptance 1 (scene lifecycle round trip) and Acceptance 3
  (manner fallback, including the byte-identical-with-no-manner-blocks cost leg) and
  Acceptance 4 (time words) and Acceptance 10 (threading words) pass at the Chord-compile
  level — Chord source in, IR out, matching the Phase 1 contract for each construct.
- **Status**: DONE (2026-08-17, session 8e2f49). Evidence: vocabulary frozen by David
  ("frozen as proposed - go", 2026-08-17 — `vocabulary-freeze-phase3.md` FROZEN, all
  five decisions as recommended). Grammar/IR landed: `define manner` + `define
  greetings` blocks (parser, analyzer folds with duplicate/host gates, deterministic
  beat phrase-key minting), recency/discussed/subject-changes/asked lowered to
  dedicated `IRCondition` kinds, disjointness axes added (recency, asked). Tests:
  `tests/adr-320-phase3.test.ts` — 16 tests derived from Behavior Statements, all
  asserting on emitted IR/diagnostic codes; full chord suite 870 passing, 60 files
  (run 2026-08-17). Cost leg: golden IR snapshots diff ONLY in the deliberate
  `languageVersion` stamp (4 lines, verified via git diff). Surface pin moved
  together per ADR-257 D5: `chord.ebnf` updated, `CHORD_LANGUAGE_VERSION` 3.0.0 →
  3.1.0 (first ordinary minor after the freeze; 3.0.0 shipped with platform 5.0.x),
  pin hash re-recorded. Repo-wide `npx tsc --noEmit` clean. Note: the frozen
  time/threading word lists are closed grammar (parser-owned, like `at least`), not
  manifest-gated open vocabularies — the manifest pipeline stays for open lists
  (moods, personalities); `voice` is open and carried as data.

### Phase 4: Chord grammar — exchange, initiative, agency, and multi-party constructs
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: Chord Story Language — exchange blocks and row outcomes (D4 —
  `then asks`/`then invites`, `deflect to`, `leave`), act/event response rows (D4/D8),
  initiative/occasion authoring (D7 — explicit authored rows that force or suppress a
  seizure), and multi-party strength markers (D10 — `passive`/`assertive`/`blocking` on
  an exchange).
- **Entry state**: Phase 3 done — shares the boundary/predicate grammar machinery Phase
  3 builds, and the exchange overlay's relationship to the topic table (D4's
  innermost-active-context-wins-outright rule, D16) needs the boundary-block parsing
  Phase 3 lands. Platform-change discussion held and confirmed for `packages/chord`
  (carried from Phase 3's confirmation unless David revokes it).
- **Deliverable**: full exchange-block grammar (opening from a topic row, its rows
  overlaying the topic table while open, closing reverting the floor); act/event response
  rows alongside verbal rows; `deflect to`/`leave` as row outcomes consulting the world
  model (leaving is movement, obeys the world — D8); authored initiative/occasion rows;
  strength markers on an exchange. Diagnostics for each (unauthorized deflect target,
  malformed strength marker, exchange row shadowing table row incorrectly). Compiled IR
  wire shapes for all of the above.
- **Exit state**: ADR-320 Acceptance 2 (exchange overlay, including its never-crash/
  never-silent-swallow rejection leg), Acceptance 5 (initiative by disposition — the
  authored-row-forces leg), Acceptance 6 (interruption vocabulary present in the grammar,
  full behavior lands in Phase 5), and Acceptance 7 (world-bounded exit; silence renders
  — the grammar/IR half; full behavior lands in Phase 6) pass at the Chord-compile level.
- **Status**: DONE (2026-08-17, session a53a28). Evidence: vocabulary frozen by
  David ("all section 6 decisions are confirmed as stated", 2026-08-17 —
  `vocabulary-freeze-phase4.md` FROZEN, all six decisions as recommended: named
  `define exchange` block holding responses only, `answer`/`on`/`on silence`
  row heads, BOTH `then asks` and `then invites` with the word as wire data,
  `deflect to`/`leave`, header comma-modifier strength, `define initiative`
  with `hold their tongue`). Grammar/IR landed: `define exchange` (answer/act/
  silence rows, topic-table duplicate+collision rules reused, header strength
  matching the shipped `ConversationStrength` union verbatim), `define
  initiative` (four occasion heads mapped from the Phase 1 `SceneOccasion`
  kinds, `, when <condition>` refinement, `hold their tongue` suppression with
  the alone-gate), the four conversation-row statements parse-gated to
  conversation contexts, `analysis.then-target` (same-owner exchange) and
  `analysis.deflect-target` (owner's-own-table) validation walking nested
  bodies. Tests: `tests/adr-320-phase4.test.ts` — 23 tests derived from
  Behavior Statements, all asserting on emitted IR/diagnostic codes; full
  chord suite 893 passing, 61 files (run 2026-08-17). Cost leg: golden IR
  snapshots diff ONLY in the deliberate `languageVersion` stamp (4 lines,
  verified via git diff). Surface pin moved together per ADR-257 D5:
  `chord.ebnf` updated, `CHORD_LANGUAGE_VERSION` 3.1.0 → 3.2.0, pin hash
  re-recorded. Repo-wide `npx tsc --noEmit` clean. Acceptance 2/5/6/7 hold at
  the Chord-compile level (full behavior lands Phases 5–6 per the exit state).

### Phase 5: `@sharpee/character` — the scene runtime
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: Character subsystem — the D4 scene as an engine-visible construct,
  wiring the stranded `conversation/lifecycle.ts` machinery live instead of reinventing
  it; floor and interruption scoring (D7/D10, the forces-feed-arbitration idiom); manner
  selection with beat rotation (D5); conversation-memory state (visits, per-pair
  discussed topics, recency reads) reading through the one clock seam (D6).
- **Entry state**: Phases 1, 3, and 4 done — the scene/memory contract (Phase 1) and the
  compiled Chord IR for scene/exchange/manner/time/threading constructs (Phases 3–4) are
  both fixed inputs this phase codes against. Platform-change discussion held and
  confirmed for `packages/character` (carried from Phase 1 unless David revokes it).
- **Deliverable**: `lifecycle.ts`'s `ConversationIntent`/`ConversationStrength`/
  `ContinuationEntry`/`InitiativeTrigger`/attention-decay/redirect machinery consumed by
  a new scene evaluation path (not `topic-registry.ts`/`constraint-evaluator.ts`/
  `acl.ts`, which stay dead — ADR-142's Layers 1/2/4 are not reused); disposition-under-
  circumstance scoring for initiative (D7) and floor selection under open address (D10),
  including interruption (an `assertive` scene yields after protest, a `blocking` scene
  holds against everything except a world act — D8's exemption); manner-beat selection
  with no-back-to-back-repeat rotation, most-specific-wins against hand-authored rows
  (D5) — silence is a manner-colored rendered response like any other delivery, never a
  bare absence (D8); conversation-memory tracking (D6/D9) as scene-scoped state.
  Behavior Statements for every new mutation-bearing function (scene open/close, floor
  change, interruption, beat selection) before tests; tests assert on actual scene/memory
  state, not return values (project-profile's `@sharpee/character` mutation signature).
- **Exit state**: `packages/character` compiles clean; its test suite is green and graded
  (rule 12/13) against ADR-320 D4/D5/D6/D7/D8/D9/D10 behavior — floor selection,
  interruption, manner fallback with rotation (including silence rendering), recency/
  absence aging, and threading state all asserted on real scene/memory objects, not
  mocks. Acceptance 6 (interruption) passes against real scene state. No other package
  yet consumes this runtime (that is Phase 6's entry state).
- **Status**: DONE (2026-08-17, session 1b5886). Evidence: §7 renames landed
  (`ContinuationIntent`; `ConversationStrength` = alias of world-model
  `SceneStrength`; `RedirectResult` = alias of `InterruptionOutcome` — no
  external consumer of the old lifecycle name existed, verified by repo grep).
  Scene runtime landed in `src/conversation/`: `scene-store.ts` (world-state
  key `character.scenes` per contracts §1.3, single-writer; scenes + manner
  rotation cursors + id sequence, all inside the world save), `scene-runtime.ts`
  (open/close/move/directives/ageScenes — ADR-142 attention decay wired live as
  the `silence` boundary off `DEFAULT_DECAY_THRESHOLDS`, closes fold per-pair
  memory), `conversation-memory.ts` (per-pair records behind the
  `ConversationMemoryAccess` seam Phase 7 re-homes onto the trait; runtime-owned
  word curves for recency/absence/asked), `manner.ts` (declaration-order row
  match, beat rotation with no back-to-back repeats, cursor persisted for
  save-identical replay; `renderSilence` — silence is a rendered delivery,
  never a bare absence), `initiative.ts` (authored occasion matcher; lone
  hold-tongue suppresses; goal-step never matches), and scoring in
  `scene-scoring.ts` (`scoreFloor` forces-wins/suppresses-withdraws/highest
  live motivation with deterministic tie-break, `resolveInterruption` with the
  D8 world-act exemption, `sceneGrip` exchange-innermost, `strengthFromIntent`
  — blocking never derived). Modeled-PC tick coverage per contracts §2.1
  (decay sub-step only). Behavior Statements before tests; 46 new tests in 6
  files, all asserting on store/memory/trait state; full character suite 491
  passing, 40 files (run 2026-08-17 this session); mutation-verification agent
  clean (every mutation traced to a state-asserting test). Repo-wide
  `npx tsc --noEmit` clean; `tsf build --package character --all` clean
  (local/esm/npm). Acceptance 6 passes against a live store-resident scene.
  No other package consumes the runtime yet (Phase 6's entry state).

### Phase 6: `packages/stdlib` — dispatch integration and witnessed player claims
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: stdlib NPC/dialogue dispatch — topic dispatch consulting the scene
  (exchange overlay before table match), the D15 dialogue-selector socket gaining its
  first production registrant, SAY/TELL feeding D11's witnessed player claims at the
  existing act-detection sites, open address entering dispatch (the D10 floor).
- **Entry state**: Phase 5 done — the scene runtime is a fixed, tested unit this phase
  wires into dispatch. Platform-change discussion held and confirmed for
  `packages/stdlib` (mirrors ADR-310's own stdlib-integration gate).
- **Status note**: platform-change confirmation given by David 2026-08-17
  ("start phase 6"); design confirmed same day ("confirmed as proposed - go" —
  `phase6-dispatch-design.md`, three Phase 1 contract amendments).
- **Deliverable**: ASK/TELL/SAY/TALK TO dispatch consults an open exchange before
  falling through to the topic table (D16 innermost-wins), registered through the
  capability-dispatch idiom (ADR-090) rather than an ad-hoc hook; the D15 socket's first
  production registrant, wired per the Phase 1 contract; SAY/TELL sites extended so a
  player statement lands as a claim in each hearer's ledger through the same witnessing
  machinery that already records NPC claims (D11); open, unaddressed remarks entering
  dispatch and resolving to a floor winner via Phase 5's scoring; the `leave` row outcome
  consulting the world model for exit legality (D8 — a restrained, cornered, or blocked
  NPC cannot take it; the scene consults the world model, never a private
  conversation-only physics) at the dispatch boundary, reusing the movement/going
  action's existing legality check rather than a new one. Fully-qualified
  capability-effect messageIds throughout (no bare short keys). Tests assert on real
  dispatched state — an exchange actually overlaying the table, a claim actually landed
  in a ledger, a blocked exit actually rejected against world state — per the project's
  mutation-signature bar.
- **Exit state**: ADR-320 Acceptance 2 (exchange overlay, full behavior including the
  fallthrough rejection leg), Acceptance 7 (world-bounded exit; silence renders — full
  behavior, joining Phase 5's silence-rendering with this phase's exit-legality
  consultation), and Acceptance 9 (player claims travel — the landing-in-a-ledger half;
  propagation/NPC↔NPC-scene travel is Phase 8's) pass against real dispatched state.
- **Status**: DONE (2026-08-17, session 755a11). Evidence: design confirmed by
  David ("confirmed as proposed - go" — `phase6-dispatch-design.md`, all three
  Phase 1 contract amendments as proposed: §1.3 read-side re-home, `close-scene`
  `leaverId`, `{select, exchangeClaims}` registration + floor-shape re-home).
  Landed: scene-store read side + `SceneRuntimeBinding`/floor shapes/`ForceReading`
  declared in world-model (`conversation-scene-store.ts`,
  `scene-runtime-binding.ts`; `registerSceneRuntime` on `WorldModel`); the D16
  exchange grip as a PURE probe consulted in validate — a gripped firing skips
  the interceptor phases so no table bookkeeping runs, probe-miss falls through
  byte-identically (AC2 both legs, asserted against a real interceptor and real
  store); ASK/TELL/TALK dispatch drives scene lifecycle through the registered
  binding (open-on-address, move stamps, directive application) with
  `close-scene`/`exit` checked against going's real exit-legality read points —
  illegal exits drop the directive, scene stays live, `character.scene.exit_refused`
  rides the author channel (AC7's exit leg); D11 statement site in act-detection
  (`witnessStatement` + `if.event.told` observe wiring): hearers record
  told/believes facts, claim values ride (tag first, else modeled speaker's held
  value, never displacing a held belief), modeled speaker mints pinned ledger
  entries per hearer audience with pressure deposits (AC9 landing half, asserted
  on trait/ledger state); open-address floor as mechanism (`floorWinnerFor` —
  speak-propensity curve over the closed personality words, fear/paranoia damp,
  breaking compels, authored rows most-specific-win; no player input surface —
  recorded decision, parser-en-us untouched per ADR-320). Tests: 22 new across
  4 files (character real-path suite drives the REAL stdlib actions over the
  REAL binding and store — rule 13a statement produced); character suite 513
  passing 43 files, stdlib 1624 passing 115 files, world-model 1486 passing,
  bootstrap 43 passing (all run 2026-08-17 this session); `./repokit build
  dungeo` clean, `wt-01` walkthrough byte-identical to golden. The D15
  selector's Chord-production registrant (serving compiled exchange rows)
  arrives with Phase 7's loader instantiation per the confirmed design §7 —
  the registration surface and its consumption are live now.

### Phase 7: `packages/world-model` + `packages/story-loader` — persistence and load-time instantiation
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: World Model's persistence shape for scene/conversation-memory state
  (riding `CharacterModelTrait` versioning per ADR-310 D17 unless this phase's contract
  work finds it needs its own home — flag to David before diverging) and vocabulary
  modules for the new word slices; story-loader's boundary contract for the new compiled
  blocks (scene/exchange/manner/boundary) and evaluator coverage for the new predicate
  kinds (recency, absence, discussed-ness, subject-change).
- **Entry state**: Phases 3, 4, and 5 done — the compiled-story data format (Phases 3–4)
  and the runtime shapes it must instantiate into (Phase 5) are both fixed. Platform-
  change discussion held and confirmed for `packages/world-model` and
  `packages/story-loader`.
- **Status note**: platform-change confirmation given by David 2026-08-17
  ("start phase 7", session 844192); design doc
  `phase7-persistence-design.md` written same day, awaiting confirmation.
- **Deliverable**: `CharacterModelTrait` (or its agreed extension point) carries scene/
  conversation-memory state with a version field; story-loader instantiates compiled
  scene/exchange/manner/boundary blocks onto entities at load; the evaluator gains cases
  for every new predicate kind (loud not-yet-wired failure if one is missed, matching the
  ADR-310 Phase 5 precedent). Tests assert on real loaded/evaluated state.
- **Exit state**: a story compiled with the new constructs loads without evaluator gaps;
  `packages/world-model` and `packages/story-loader` compile clean; no save/restore round
  trip yet (that is Phase 8's).
- **Status**: DONE (2026-08-17, session 844192). Evidence: design confirmed by
  David ("confirmed as proposed - go" — `phase7-persistence-design.md`, §8
  amendment included: `ConversationSceneState` gains `currentTopic`/
  `subjectChangedTurn`, written only by the new `noteTopicMove`). Landed:
  `conversationMemory` on `ICharacterModelData` with schema v2 (v1 reads as
  empty — versioned reader, no hard break) + `createTraitMemoryAccess` as the
  production memory home; loader registers `registerCharacterScenes` (trait
  memory, authored-initiative hook over compiled `define initiative` rows) and
  the D15 production registrant at `applyCharacterBlocks`, with a LoadError
  gate for conversation blocks on unmodeled owners; the registrant serves
  exchange answer rows (grip, own occurrence namespace, pin/mint reuse,
  close-on-serve) and greeting rows (first-time / absence-refined return /
  repetition / bare return off pair memory; content rows win scene-opening
  asks), translating `then-open`/`deflect`/`leave` into directives with real
  exit legality (illegal leave = rendered silence, nothing mutated); the topic
  arm extracts the same statements (then-asks/leave via the registered runtime,
  deflect chains depth-guarded under the target's occurrence key) and stamps
  thread + asked counts in postValidate so `asked`/`subject changes` hold on
  the firing they describe; evaluator implements recency/discussed/asked/
  subject-changes (loud LoadError outside the conversation frame) and
  `execStatements` loud-fails the four conversation statement kinds (closed a
  silent fallthrough). The plan's "vocabulary modules" line was discharged by
  the Phase 3 freeze (closed grammar; `voice` open-as-data) — no module to
  add. Chord has no modeled-PC surface (`analysis.character-line-player`), so
  contracts §2.1 symmetry is asserted at the character-package level. Tests:
  20-test real-path loader suite (compile → load → real asking/talking →
  store/trait/occurrence assertions), 6 character seam tests, 3 world-model
  schema tests, loud-leg rewrite of `conversation-predicates-not-wired`;
  mutation-verification ran and its one warning (deflect runtime path
  untested) was closed with two state-asserting tests same session. Evidence
  (all run 2026-08-17): story-loader 527 passing, character 519, world-model
  1489, stdlib 1624, bootstrap 43; repo-wide `npx tsc --noEmit` clean;
  `./repokit build dungeo` clean; full Dungeo walkthrough chain 952 passing;
  character-acceptance (14 transcripts over 3 story files), thealderman (7
  transcripts), and `pnpm test:scripts` (11) green via the bundle.

### Phase 8: `packages/engine` — NPC↔NPC scene scheduling and save/restore
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: engine's NPC turn phase — scene scheduling driven by goal pursuit
  (D10, already-shipped seek-out), scene events into the turn event stream, observable-
  only rendering (the PC present or in earshot gets the eavesdropping surface; otherwise
  effects land silently), and save/restore for scene state (D17).
- **Entry state**: Phases 5, 6, and 7 done — the scene runtime, its dispatch wiring, and
  its persistence shape are all fixed inputs. Platform-change discussion held and
  confirmed for `packages/engine`.
- **Status note**: platform-change confirmation given by David 2026-08-17
  ("start phase 8", session 48ac57); design doc to follow the Phase 6/7
  confirm-before-implement pattern.
- **Deliverable**: NPC↔NPC scenes scheduled in the NPC turn phase, driven by goal
  pursuit; scene text emitted to the wire only when the PC can observe it, effects
  (facts move, ledgers record) landing regardless of observation; a player claim planted
  in Phase 6's ledger traveling onward through these NPC↔NPC scenes and the existing
  propagation graph (D11 — completing the travel leg Phase 6 started at the ledger); PC
  intrusion handled as the D10 interruption rule with the PC as interrupter; mid-scene
  save/restore (save with a scene and exchange open, restore, continuation byte-identical
  at the pinned seed) through the real `SaveRestoreService`, not a stub. This is an
  owned-dependency integration (rule 13a) — an Integration Reality Statement is produced
  before this phase is declared complete, naming the real save/restore path as the
  REAL-PATH TEST.
- **Exit state**: ADR-320 Acceptance 8 (NPC↔NPC scenes observable — text only when
  witnessed, effects always land), Acceptance 9 (player claims travel — full closure, the
  propagation/NPC↔NPC-scene leg), and Acceptance 12 (mid-scene save/restore) pass against
  the real engine/save-restore path.
- **Status**: DONE (2026-08-17, session 48ac57). Evidence: design confirmed
  by David ("confirmed" — `phase8-engine-design.md`, earshot folded in at
  David's direction: "we def need within hearshot to be factor");
  mid-implementation ruling by David (option 1): ADR-144's told-source
  leverage gate DELETED per ADR-320 D11 symmetry — hearsay spreads onward,
  gossip chains work, `playerCanLeverage` stamped RETIRED (follow-on idea
  filed: rumor degradation per hop, GH #272). Landed: scenes sub-step in
  the character-model tick phase (open on transfer / goal-say, thread +
  floor + D16 bookkeeping, exit/silence closes, witnessed-act +
  subject-change + silence occasion seizures via the loader-bound runner,
  world-act interruption); `SceneRuntimeBinding` gains `resolveIntrusion`
  (applied close on yields/protests) + optional `seizeInitiative`;
  `emitSound` threaded engine → plugins → NPC service → tick (additive);
  observability rides ADR-172 spatial sound whole (kind `speech`,
  volume from a runtime-owned coloring curve, per-tier degradation is the
  shipped lang surface — lang-en-us untouched); PC intrusion at dispatch
  (`resolveSceneIntrusion` in asking/telling/talking; foreign-scene
  move-clock fix; foreign exchanges never grip); prose pipeline gates
  `character.scene./exchange.` wire from prose (AC11 at the boundary —
  also closed a latent Phase 6/7 double render of gripped serves);
  `abandonedTopic` on the scene state (subject-change occasion payload).
  Rule 13a: real-path save/restore proven twice — SaveRestoreService
  round trip in `adr-320-phase8.test.ts` (scene + open exchange
  deep-equal after restore, identical continuation) and the bundle
  `$save`/`$restore` mid-exchange transcript chain. Mutation-verification ran; its two warnings (prose-gate untested;
  TELL not exercised against a foreign scene) closed same session with
  3 pipeline unit tests + 1 TELL intrusion test. Tests (all run
  2026-08-17): character 540 passing (16-test scene-sub-step suite,
  5 intrusion dispatch tests, hearsay rewrite), story-loader 531
  (4-test Phase 8 real-path suite: AC9 travel chain, initiative runner,
  AC12), stdlib 1624, world-model 1489, engine 632, bootstrap 43,
  plugins 13; repo-wide `npx tsc --noEmit` clean; `./repokit build
  dungeo` clean; Dungeo walkthrough chain 952 passing byte-identical;
  character-acceptance all four story groups green incl. the NEW
  `phase8-scenes.story` + six `p8-*` transcripts (earshot full/fragments
  grading, effects-land-unobserved, intrusion-yields, save/restore
  chain); thealderman 7 transcripts green; `pnpm test:scripts` 11
  passing. AC8, AC9, AC12 pass against real dispatched/persisted state.

### Phase 9: D12 wire schema — `platform-browser`/`devkit` and the IDE testing surface
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: the presentation-agnostic wire (D12) — scene event stream and
  exchange response affordances as channel data under the existing channel discipline
  (data only, clients render), and their consumption in the IDE's per-NPC explain panel
  and recording flows (mirroring the ADR-310/318 "explain this NPC's turn" precedent).
- **Entry state**: Phase 6 done (dispatch emits the events this phase's wire schema
  carries) and Phase 1's wire affordance schema is the fixed contract. Platform-change
  discussion held and confirmed for `packages/platform-browser`/`packages/devkit`.
- **Deliverable**: the scene event stream (speaker/addressee/phrase/manner-beats/floor-
  changes/interruptions/rendered-silence) and exchange response affordances carried as
  channel data; the testing-surface (`tools/ide/web/testing-surface`) consuming that data
  for scene/affordance rendering in the explain panel and for recording/click-to-assert
  flows (project-profile's Testing Intelligence mutation signature — a click-to-assert
  must actually update the transcript fixture). Channel isolation preserved: no scene
  internals reach the player-facing build beyond rendered prose.
- **Exit state**: ADR-320 Acceptance 11 (wire affordances and isolation) passes — an open
  exchange's advertised responses are structured wire data consumed by the testing
  surface, and the player-facing build carries no scene internals beyond rendered prose.
- **Status**: DONE (2026-08-17, session 045c55; platform-change discussion held and
  confirmed — David: "proceed", contract amendment + world-model/story-loader widening:
  "confirmed"). Evidence, all run 2026-08-17:
  - Affordance schema amended (David-confirmed): `verbal` rows carry a `topic` filter
    (entity | text primary+aliases), not a messageId; `AffordanceTopic` added to
    `scene-wire.ts`. Affordances snapshotted onto `ExchangeState.responses` at open
    time (persisted scene state — mid-exchange restore re-advertises; entity topic ids
    resolved to world ids; exactly one silence per D8).
  - stdlib `scene` (append/sparse) + `exchange-affordances` (replace/always) channels,
    both `gatedBy: 'authorChannels'`; scene channel tests 9 passing; stdlib full 1633
    passing, 27 skipped.
  - Real-path: `adr-320-phase9.test.ts` 4 passing (live scene store snapshot, channel
    open→advertise/close→clear, dispatch wire rows, SaveRestoreService round trip
    re-advertising); story-loader full 535 passing; character full 540 passing;
    world-model full 1489 passing, 10 skipped.
  - AC11 at the channel layer: `channel-bootstrap.test.ts` player-profile manifest
    excludes both ids (engine full 633 passing, 7 skipped).
  - Testing surface: `scene.ts` explain/affordance projection, `ExplainLine.claimChannel`
    click-to-assert (claims land on the line's own channel and persist through the
    document round trip — model.test.ts D12 case); 85 passing; bundle rebuilt into IDE
    Resources.
  - Bundle real-path: `p9-wire.transcript` 4 commands passing (open → both channels
    advertise; answer → advertisement clears); p8+p9 suite 19 passing; b-suite
    per-story all passing; Dungeo walkthrough chain 952 passing in 17 transcripts at
    the pinned seed.
  - Mutation-verification: 1 warning (line→delegate→addChannel hop for non-character
    channels untested) — closed same session (surface 85 passing).
  - Chat-client ungating deliberately deferred: the stream ships author-gated; a
    player-side rendering channel is a future client decision.

### Phase 10: Theatre Company demonstration story — authoring
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: the demonstration story itself, authored in Chord against the shipped
  mechanism (Phases 1–9), against the task specified in Phase 2.
- **Entry state**: Phases 1–9 done (every construct the story needs to exercise exists
  and is tested in isolation) and Phase 2's `theatre-story-task.md` is confirmed.
  **REQUIRES DAVID'S CONTENT INPUT AT EVERY STEP** — dialogue text, manner beats, scene
  content, and the play-within-the-story's actual lines are David's; Claude authors the
  Chord structure (blocks, predicates, wiring) around content David provides or approves
  line by line, never inventing dialogue or plot content to fill a gap. Where a beat in
  Phase 2's construct-to-beat table needs content David hasn't yet supplied, this phase
  stops and asks rather than drafting placeholder prose that ships.
- **Deliverable**: the theatre company story compiling and playing end-to-end via
  `dist/cli/sharpee.js`, built with `./repokit build <theatre-story-slug>`; every
  construct from Phase 2's table exercised by at least one scene; transcript tests
  (`.transcript` files) covering the acceptance-relevant beats, chained where state
  persists across rehearsal days (D6). Story files carry no ADR references (David,
  2026-08-16) — requirements in plain story language only; traceability lives in the
  work-directory docs.
- **Exit state**: ADR-320 Acceptance 13 (the demonstration story plays end-to-end via
  the bundle, exercising every construct above); the story is a new vehicle under
  `stories/` (or `branch-stories/` per its authoring shape), not an extension of
  thealderman or Reflections, and no platform work builds on Reflections' content
  (ADR-320 D13).
- **Status**: PENDING

### Phase 11: Acceptance closure — full audit, regression, and ADR-142 supersession
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: the acceptance criteria not fully discharged by construction in
  Phases 1–10, whole-platform regression, and closing out ADR-142's supersession stamp.
- **Entry state**: Phases 1–10 done.
- **Deliverable**: a full Acceptance 1–13 audit with evidence inline per criterion (dated,
  re-run — not cited from memory); Dungeo walkthrough chain and any Fernhill transcripts
  confirmed byte-identical at the pinned seed (single run — the run-twice convention is
  retired per ADR-293 Phase D); a story with no manner blocks and no scene constructs
  confirmed to compile byte-identically to today (D2/D5's cost leg, Acceptance 3);
  channel isolation re-confirmed at the channel layer in a built story; ADR-142's Status
  line carries the supersession stamp (already written at ADR-320 acceptance — confirm it
  still reads correctly against the shipped implementation, amend only if construction
  diverged from what D4 promised).
- **Exit state**: ADR-320's Acceptance section fully discharged, evidence inline per
  criterion; whole-platform regression green; ADR-142 supersession confirmed accurate.
- **Status**: PENDING

## Notes for future phases

- **D1's discipline applies across every phase**: if any phase discovers a need for new
  ADR-310/318 interior state (a new belief kind, a new force, a new predicate the
  character model itself must carry), that need is raised as an ADR-310/318 amendment —
  never smuggled into an ADR-320 phase as a side effect.
- **Every implementation phase (3–9, 11) touches `packages/`** and therefore needs its
  own platform-change discussion confirmation with David before work starts, per
  CLAUDE.md — carried forward from an earlier phase's confirmation only where David has
  not revoked it.
- **New vocabulary slices are compatibility surface the moment a story ships on them** —
  every new Chord word list (manner states, time words, threading words, strength
  markers) goes through a freeze review with David before Phase 3/4 closes on it, the
  same discipline ADR-310/318 used.
