# Session Plan: Implement ADR-328 — Actors are a platform concept

**Created**: 2026-08-27
**Plan Status**: ACTIVE
**Overall scope**: Land ADR-328's umbrella program — one `(action, actorId)` execution path for
anyone who acts (D1/D2), perception that tags actor-sourced narration instead of dropping it
(D3), actor voice as a per-actor rendering property (D4, leads by David's ruling), the
NpcService decision/execution split with `plugin-npc` dissolved (D5), Dungeo's five NPCs
rewritten onto the pipeline in the same cutover with the 952-test walkthrough chain re-pinned
(D6 — and, ruled in-program 2026-08-27, the book's chapter 20, the zoo tutorial and the devkit
fixture, which sit on the same deleted surface), and the Chord acting-surface child ADR + implementation (D7). Nothing lands under
ADR-328 itself — this plan and its own children carry the phases, per the ADR-266 umbrella
pattern the ADR names for itself. **On Acceptance item 1** ("a child ADR/plan exists per
phase… before any phase implements"): this one plan is the child for every phase except D7,
whose child ADR is Phase 8's deliverable — read under ADR-266's umbrella pattern, where one
program plan carrying per-phase real-path acceptance satisfies the item; recorded here rather
than left implicit (review, 2026-08-27).
**Bounded contexts touched**: Sharpee Platform (`packages/engine`, `packages/stdlib`,
`packages/world-model`, `packages/lang-en-us`, `packages/core`, `packages/text-blocks`,
`packages/channel-service`), Chord Story Language (`packages/chord`, `packages/story-loader`,
`packages/character`), Dungeo (`stories/dungeo`) — the same three layers the impact analysis
scoped.
**Key domain language**: actor (whoever runs the four-phase action — player, NPC, future
rotating PC), execution entry (the programmatic `(action, actorId)` path D2 builds), presence
(`present | absent | concealed` — D3's tag, never a drop), perception tag (the `location` +
`presence` pair stamped at emit time), actor voice (grammatical person resolved per actor at
render time, not authored into templates), decision/execution split (D5 — NpcService's
behaviors decide, the pipeline executes), acting surface (D7 — the Chord syntax for an NPC
performing a story-authored action).

## References consulted
- `docs/architecture/adrs/adr-328-actors-are-a-platform-concept.md` — the subject of this
  plan. D4 leads the program by David's explicit ruling regardless of relative size; D3 lands
  whole with the daemon-presence gate not retired until the tag rides the full chain to
  clients in the same landing (no interim); D5 dissolves NpcService's execution half outright
  (no compatibility shim); Acceptance item 1 gates every phase behind its own child ADR/plan
  existing first; D7 requires a dedicated child ADR (not yet written) designing Chord's acting
  syntax, separate from this plan's own scope.
- `docs/work/actor-platform/impact-analysis-20260825.md` — the file:line facts ADR-328
  compresses; this plan independently re-verified them against current source (2026-08-27) and
  several have moved or grown since 2026-08-25 — see the Verified facts note below each
  relevant phase.
- `docs/work/adr-327-explicit-references/plan.md` — its Phase 6 ("D7 — non-player actors fire
  their own heads") is PENDING, explicitly blocked on this plan existing. This plan's Phase 4
  (D2's actor-threading sweep) is the literal unblock: ADR-327's AC-2 and AC-5 go green through
  it, closing ADR-328's own Acceptance item 3 at the same time.
- `docs/architecture/adrs/adr-089-pronoun-identity-system.md` — ACCEPTED, Phases A-D already
  implemented (2026-01-05/16). This is the load-bearing prior art for D4: the `{You}`/`{Your}`/
  `{verb}` placeholder mechanism and English conjugation table already exist and are already
  used by 49 of 51 `packages/lang-en-us/src/actions/*.ts` message files (verified this
  session). The gap D4 must close is narrower than the ADR's own framing suggests — see Phase 1.
- `docs/architecture/adrs/adr-070-npc-system.md` / `docs/architecture/adrs/adr-120-engine-plugin-architecture.md`
  — the two ADRs ADR-328's Acceptance item 4 requires amendment stamps on. Verified this
  session: ADR-070 carries an unrelated 2026-06-23 amendment already and needs a second, new
  one; ADR-120 has never been amended and — separately worth flagging to David — its own
  Status line still reads `PROPOSED`, never `ACCEPTED`, which is an odd thing to formally
  supersede-in-part.
- `docs/context/project-profile.md` — mutation-signature bar for Domain Modeling / Engine work
  (assert on real `WorldModel` state or emitted event payloads, never "didn't throw"); CLAUDE.md's
  platform-change discussion-first discipline restated here for `packages/`.
- `docs/context/session-20260827-0233-feat-adr-321-world-index.md` — most recent session; its
  Open Items confirm ADR-327 Phase 6's block is current and name no other open item bearing on
  this program.
- *(Added by the 2026-08-27 review folds.)* `docs/architecture/adrs/adr-213-removed-from-play-signal.md`
  (§Witnessed, `:37-39`), `adr-325-chord-presence-and-duration.md` (D2, Non-goals `:556`),
  `adr-069-perception-event-filtering.md` (`filterEvents`, incl. the 2026-06-23 per-sense amendment),
  `adr-178-story-runtime-baseline.md` (`plugin-npc` in the always-shipped list, `:148`),
  `adr-326-adjacent-room-place-expression.md` (adjacency draw independent of
  `hasTraversableExit` — unaffected), `CLAUDE.md:77` (Logic Location: NPC turn phase is the
  engine's — the tick-home ruling), `docs/core-concepts/README.md:48` (says the opposite;
  corrected in Phase 5), `docs/book/v2.0.0/code-snippets/CATALOG.md` (snippet extraction and
  the by-hand assembly method).

No unplanned ACCEPTED proposal items apply — `docs/proposals/*.md` was scanned; every item in
every templated file is already PLANNED, DONE, or (one case, `docs-consolidation.md` P-9)
unrelated to this program's scope.

## Scope-correcting finding: D4 is not the size the ADR feared

The ADR frames voice as "the largest single cost… the honest long pole." Verified this session:
**49 of 51 files under `packages/lang-en-us/src/actions/`** already use the `{You}`/`{Your}`/
`{verb}` placeholder family (`grep`, 2026-08-27); only `taking.ts` and `restarting.ts` still
carry literal `"You "` text. ADR-089 Phase D already built `resolvePerspectivePlaceholders` and
`conjugateVerb` (`packages/lang-en-us/src/perspective/placeholder-resolver.ts`), with full
irregular-verb and singular/plural agreement handling. **The template sweep the ADR frames as
the long pole is, for practical purposes, already done.**

What ADR-089 built and D4 still needs are different shapes of the same problem:
- ADR-089's `NarrativeSettings`/`NarrativeContext` is **one value for the whole story**, set at
  `StoryConfig` time and "immutable after game start" (ADR-089 Part 3, its own words) or via
  `LanguageProvider.setNarrativeSettings()` (`language-provider.ts:110`, called exactly once,
  from `game-engine.ts:1847`). D4 needs perspective resolved **per rendered event, from that
  event's actor** — the player narrated in 2nd person and a witnessed NPC's action narrated in
  3rd person inside the same turn, not a single story-wide setting.
- ADR-089's 3rd person always substitutes a **pronoun** (`pronouns.subject`, e.g. "they") —
  correct for a rotating-PC narrator referring to itself, wrong for a witnessed NPC. D4's own
  example (`"The thief takes"`) needs a **name**, which the placeholder resolver has no path to
  today.

So D4's real work is: thread the acting entity through every `getMessage`/`formatMessage` call
site instead of reading one provider-wide setting, and add name-substitution for non-player 3rd
person. This is plumbing, not prose-rewriting — smaller than the ADR estimated, though it still
leads by David's ruling and Phase 1 below is sized accordingly (Medium, not the giant sweep the
ADR's own text implies).

## Phases

### Phase 0: Paper trail — ADR-070/120 amendment stamps (Acceptance item 4)
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: `docs/architecture/adrs/adr-070-npc-system.md`,
  `docs/architecture/adrs/adr-120-engine-plugin-architecture.md`.
- **Child artifact**: none — this is a hand-edit of two already-existing ADRs, not new design.
- **Entry state**: none — no code dependency. **Pulled ahead of Phase 1 (2026-08-27, David's
  ruling, plan-review CONTRADICTION 3).** ADR-328 §Consequences records these stamps as landing
  "at acceptance," and ADR-328 has been ACCEPTED since 2026-08-25 while neither stamp exists —
  ADR-070's only amendment is dated 2026-06-23 and is unrelated; ADR-120 has none. The
  supersession is already *decided*, so the stamp records a decision, not a landing, and
  deferring it behind the program would leave the record wrong for the whole of it.
- **Deliverable**: both ADRs carry a new amendment section recording ADR-328's
  supersession-in-part (the shadow NPC-action system these ADRs originally specified is now
  gone). ADR-120's Status line reads `PROPOSED` and always has, but the ADR shipped in full —
  `packages/plugins/{turn-plugin,plugin-registry,turn-plugin-context}.ts` are the three
  interfaces it proposed, wired into `game-engine.ts`, with `plugin-npc`, `plugin-scheduler`,
  `plugin-state-machine` and `scene-evaluation-plugin` built on them (verified 2026-08-27).
  Stale Status line, not an open decision: stamp it like any other accepted ADR. The Status
  line itself is left alone — flipping ADR statuses is not this plan's call.
- **Exit state**: Acceptance item 4 satisfied.
- **Status**: DONE (2026-08-27, session d6dc2b) — both stamps appended as dated "Superseded in
  part by ADR-328" amendment sections. ADR-070's stamp covers both halves (the execution table
  and §Visibility and Perception), so Phase 2b's ADR-070 stamp item is already satisfied.
  ADR-120's stamp retires the `plugin-npc` extraction and the NPC priority row; its Status
  line left as-is. ADR-328 Acceptance item 4 marked satisfied in place.

### Phase 1: D4 — Actor voice as a per-actor rendering property (leads, David's ruling)
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: `packages/lang-en-us` (`perspective/placeholder-resolver.ts`,
  `language-provider.ts`), `packages/engine` (`prose-pipeline/handlers/*` — 13 handler files,
  the chokepoint where `languageProvider.getMessage()`/`formatMessage()` is called per rendered
  event; `domain-message.ts:109` is the generic dispatcher's call site).
- **Child artifact**: this plan (Acceptance item 1) — no new ADR needed. ADR-328 D4 and
  ADR-089 together already specify the mechanism; the gap (per-actor resolution instead of
  provider-wide, name substitution for non-player 3rd person) is bounded enough to plan and
  implement directly. Present the call-site threading design to David first (CLAUDE.md
  discussion-first for `packages/` changes) before editing `lang-en-us`/`engine`.
- **Entry state**: none — independent of every other phase in this program. **Corrected
  2026-08-27 (review):** this phase first claimed Chord's `move` supplies a real non-player
  event to render in third person. It does not: `moveWithLifecycle` (`runtime.ts:4071`) →
  `witnessMove` (`:4090`) → `channelEvent` (`:4327`) builds a phrase event from the story's own
  `<irId>.exited` block — author prose, never a lang-en-us template — and emits no
  `actor_moved` (the only mention in `runtime.ts` is the doc comment at `:4122`). No
  prose-pipeline handler or lang-en-us file references `actor_moved`; `domain-message.ts` never
  reads `entities.actor`; `language-provider.ts:210,:306` resolve against the one stored
  `narrativeContext`. A non-player *action* event only exists once Phase 3 lands, so this
  phase's real-path test is built on a real action event supplied as input (below).
- **Deliverable**: `resolvePerspectivePlaceholders`/`conjugateVerb` callers thread the
  triggering event's `entities.actor` (already present per event-contract, A5) instead of
  reading `LanguageProvider`'s single stored `NarrativeContext`; person resolves per actor
  (player → the story's configured 2nd/1st person default, any other actor → 3rd); 3rd-person
  subject substitution gains a name path (the actor's `IdentityTrait` name / `ActorTrait`
  `briefDescription`) alongside the existing pronoun path, used whenever the actor isn't the
  player. The residual literal second-person text — 21 lines across 9 files (grep 2026-08-27),
  not the two files first counted — is triaged, not blanket-rewritten: quoted NPC speech
  (`asking.ts:28-40`, `talking.ts:33,:38`, `telling.ts:29`) and meta messages (`about.ts`,
  `help.ts`, `restarting.ts`, `reading.ts:15`) are second person whoever acts and stay; the
  actor-voice residue — `going.ts:24` (the grue line), `taking.ts:24,:28`, `asking.ts:32` — is
  converted to placeholders.
- **REAL-PATH test (rule 13a)**: a real `if.event.taken` action event whose `entities.actor`
  is a non-player entity, fed through the **real** engine prose pipeline and the **real**
  lang-en-us provider (no formatter double, no handler stub) renders third person with the
  actor's name ("The thief takes the lamp.", not "You take" and not "They take"); a player-
  actored event of the same type in the same turn renders second person. The event is input
  data, not a stand-in for an owned dependency — the system under test is the rendering
  layer, and it runs unmodified. The end-to-end scene, with the event *produced* by a
  non-player action, is Phase 6b's (Acceptance item 2).
- **Exit state**: `pnpm --filter '@sharpee/lang-en-us' run test:ci` and
  `pnpm --filter '@sharpee/engine' run test:ci` green with new per-actor-voice coverage. Zero
  *actor-voice* literal second-person sites under `packages/lang-en-us/src/actions/` — quoted
  speech and meta messages exempt by name (the Deliverable's triage list); a "0 literal `You`"
  metric would force rewriting NPC dialogue and is not the criterion.
  ADR-089's Part 3 amended in place: its own words call `NarrativeSettings` "immutable after
  game start," a decision this phase directly supersedes with per-actor render-time
  resolution — the amend-after-code pattern this plan uses elsewhere (ADR-070/120 in Phase 0),
  not a re-interview, since ADR-089 stays ACCEPTED throughout.
- **Status**: CURRENT (since 2026-08-27)

### Phase 2a: D3 — Perception tagging, emit-time half (core → character → story-loader)
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: `packages/core/src/events/types.ts` (the `narrate?: boolean` field at
  `:73` gains `location`/`presence` siblings), `packages/character/src/propagation/visibility.ts`
  (the `PlayerPresence` type — `'absent' | 'present' | 'concealed'`, already exists at `:20` —
  reused verbatim, not redefined), `packages/stdlib/src/services/PerceptionService.ts`
  (`canPerceive`, `:96`, becomes the presence-computation source at emit time), `packages/story-loader/src/runtime.ts`
  (the entity every-turn daemon presence gate, currently at `:3322` inside
  `buildSchedulerDaemons`, alongside the ADR-327 D9 role gate that already runs ahead of it),
  and — **added 2026-08-27 (review)** — `packages/engine/src/game-engine.ts:2238`
  `processPluginEvents`, which calls `perceptionService.filterEvents(…, this.context.player, …)`
  on every plugin/NPC event: the engine's own drop-not-tag gate, where all 39 `npc.*` messages
  are filtered today. D3 has **three** drop sites (this one, the loader daemon gate, and
  `witnessMove` in 2b); ADR-328 D3 names one and is amended to enumerate all three.
- **Child artifact**: this plan. The tag's vocabulary (`PlayerPresence`) and the computation
  source (`PerceptionService.canPerceive`) both already exist — this phase wires them together
  at the emit boundary rather than inventing new concepts.
- **Entry state**: none — independent of D1/D2/D5/D6. Present the emit-boundary design to
  David first: which single chokepoint stamps `location`+`presence` on every actor-sourced
  narration event (the entity-daemon path in `story-loader`, and, once Phase 3/4 land, the
  execution-entry path too — this phase's mechanism must not be actor-source-specific).
- **Deliverable**: every actor-sourced narration event carries `location` (the room it
  happened in) and `presence` (computed via `PerceptionService.canPerceive` against the current
  player) alongside the existing `narrate` hint. **No dropping** — this phase does not touch
  the story-loader presence gate's control flow yet (Phase 2b does); it only adds the tag. The
  engine's `filterEvents` call in `processPluginEvents` likewise keeps dropping until 2b, but
  the events it passes are already tagged here.
- **REAL-PATH test (rule 13a)**: this phase is the emit-time half of one landing unit with
  2b, and 2b's real-path test (an entity daemon firing off-stage through a real Chord story
  and the real transcript-tester) is the unit's acceptance. Its own check, real path: the
  tagged events are asserted on the real engine's emitted event payloads — `location` and
  `presence` present and correct — for an on-stage and an off-stage daemon firing, no
  emitter double.
- **Exit state**: `pnpm --filter '@sharpee/core' run test:ci`, `pnpm --filter '@sharpee/character' run test:ci`,
  `pnpm --filter '@sharpee/stdlib' run test:ci` green with new tag-stamping coverage. **Not
  independently shippable** — the tag exists on the event but nothing downstream reads it yet,
  and the daemon presence gate at `runtime.ts:3322` still silently drops off-stage firings
  exactly as before. This is intentional mid-landing state, the same shape as ADR-327 Phase 1's
  "corpus not expected to parse yet" — Phase 2b closes the loop in the same landing.
- **Status**: PENDING

### Phase 2b: D3 — Perception tagging, client-facing half + daemon-gate retirement
- **Tier**: Large
- **Budget**: 350
- **Domain focus**: `packages/text-blocks/src/types.ts` (`ITextBlock`, `:117` — gains
  `location`/`presence`; verified this session it carries neither today), the prose pipeline
  (copies the tag from event to block), `packages/channel-service/src/channel-service.ts`
  (the packet carries the tag per ADR-163's "channels carry every story→UI signal"), the
  default client renderer (hides `absent`, shows `present`/`concealed`), transcript-tester
  (renders through the default so existing goldens keep their meaning; an omniscient test mode
  shows all actor emissions labelled by location), the engine's `processPluginEvents` gate (`game-engine.ts:2238` — `filterEvents` stops
  dropping — it tags `presence` and keeps ADR-069's per-sense selection, since darkness
  stays a transform under D3; ADR-069's `filterEvents` contract is amended accordingly), and
  finally two hand-rolled mechanisms the ADR's own D3 text names for retirement onto this path: `story-loader/src/runtime.ts`'s
  entity/story/trait every-turn daemon presence gate (`:3322` and its story-owned/trait-owned
  siblings — **removed**), and `witnessMove` (`runtime.ts:~4095-4110`, called from
  `moveWithLifecycle`), which hand-checks `playerRoom === fromRoom`/`toRoom` and silently
  drops the `exited`/`entered`/`disappeared` channel event when neither matches — verified this
  session as the exact drop-not-tag pattern D3 replaces. `witnessMove`'s channel enqueue is
  replaced by the location+presence tag on the underlying event; `move`'s own mutation
  semantics (ADR-325) are untouched, only how the player learns about it changes.
- **Child artifact**: this plan, continuing Phase 2a's design.
- **Entry state**: Phase 2a shipped (every actor-sourced event already carries the tag).
- **Deliverable**: the tag rides `core` → `engine` (prose pipeline) → `text-blocks` →
  `channel-service` → the default client in one landing; the daemon presence gate is deleted
  the same session the last consumer lands — per the ADR's explicit "no interim work" ruling,
  this program never ships a state where an untagged off-stage line could reach a player, nor
  a state where the gate is gone but a client doesn't yet know to hide `absent`.
- **REAL-PATH test (rule 13a)**: through a real Chord story and the real transcript-tester — an
  entity-owned `on every turn` daemon fires every turn regardless of the player's room (state
  mutates off-stage); the default-rendered transcript shows the on-stage instance and omits the
  off-stage one; an omniscient-mode run of the same transcript shows both, tagged by location.
- **Exit state**: `pnpm --filter '@sharpee/text-blocks' run test:ci`,
  `pnpm --filter '@sharpee/channel-service' run test:ci`,
  `pnpm --filter '@sharpee/story-loader' run test:ci` all green. Every in-repo story/fixture
  whose goldens depended on the old drop-not-tag behavior re-pins here (explained diff, per the
  ADR-295 re-record precedent D6/D3 both cite). Three more ADRs are falsified by this phase and
  are stamped at its landing (added 2026-08-27, review): **ADR-213** §Witnessed (`:37-39` —
  "unwitnessed transitions narrate nothing and *consume nothing*": under D3 the `(owner,
  channel)` Choice counters advance off-stage, itself a determinism re-pin for any story with
  strategy variants on witness rows), **ADR-325** D2 ("fires… when the player shares the
  room") and its Non-goals bullet at `:556` ("no change to the `disappeared`/`entered`
  observers' semantics"), **ADR-069**'s `filterEvents` contract, and **ADR-070** §Visibility and Perception ("Player
  elsewhere → Nothing reported") — already stamped by Phase 0 (2026-08-27), nothing further owed — Dungeo is untouched at this point (its daemons
  don't yet drive NPC actions; Phase 6b is where its chain actually moves).
- **Status**: PENDING

### Phase 3: D1/D2a — The programmatic execution entry
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: `packages/engine/src/command-executor.ts`. Verified this session, current
  line numbers: `actorId?: string` at `:50` (dormant, unchanged since the ADR's 2026-08-25
  citation); `world.getPlayer()` at `:188`; `actorId: context.player?.id` at `:268`;
  `world.getVisible(world.getPlayer()!)` at `:308` (a fourth player-bound read the ADR's own
  text didn't enumerate).
- **Child artifact**: this plan. Present the entry's shape to David first — the parse/validate
  split (ADR-231 D2a) already puts actor-relative checks in `validate()`, so the entry threads
  the actor and nothing else changes shape; this is a platform change (`packages/engine`) and
  needs the discussion-first pass regardless of how small it is.
- **Entry state**: none — independent of D3/D4. *Starts* the unblock of
  `docs/work/adr-327-explicit-references/plan.md` Phase 6 (one pilot action carries a
  non-player actor end-to-end); Phase 4's sweep *completes* it — ADR-327's own Phase 6 names
  the full sweep as its dependency.
- **Deliverable**: a new programmatic entry point — `(actionId, resolvedEntities, actorId) →`
  the four phases, no parser — built on `CommandExecutor`'s existing (currently ignored)
  `actorId` option; `world.getPlayer()` at `:188` and the three other player-bound reads above
  become reads of the passed actor, gated so parser-driven calls (still player-only today)
  behave identically to before.
- **REAL-PATH test (rule 13a)**: through the real `CommandExecutor` (not a hand-built double)
  — invoke the entry with a non-player `actorId` on a standard action (`taking`); assert
  `validate()` rejects when that actor can't reach the target (a real interceptor/trait fires,
  proving this isn't the shadow system's no-validate path) and the real events emit with that
  actor's id when it can.
- **Exit state**: `pnpm --filter '@sharpee/engine' run test:ci` green with new entry coverage. The
  entry exists and is exercised by one pilot action; the remaining 53 files are Phase 4.
- **Status**: PENDING

### Phase 4: D2b — Actor threading across the standard-action library (mechanical sweep)
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: `packages/stdlib/src/actions/**`. Verified this session:
  **150 `context.player`/`getPlayer()` occurrences across 54 files** (the ADR's own
  2026-08-25 figure was 126/49 — grown since; this phase's scope is the current count, not the
  ADR's snapshot).
- **Child artifact**: this plan.
- **Entry state**: Phase 3 shipped (the entry exists and threads an actor end-to-end for at
  least one action — this phase repeats that pattern 53 more times).
- **Deliverable**: every `context.player`/`getPlayer()` read in `packages/stdlib/src/actions`
  becomes a read of the command's actor. Mechanical per action, but every touched file is
  regression-gated by the Dungeo walkthrough chain, which is still player-only at this point
  (no NPC yet runs through the entry) so it must come back byte-identical — a clean checkpoint
  before Phase 5/6 puts real NPCs on the path.
- **REAL-PATH test (rule 13a)**: the Dungeo walkthrough chain itself — the real bundle, the
  real engine, every rewritten action exercised by the player at the pinned seed — is this
  phase's real-path gate, byte-identical because no non-player actor runs yet.
- **Exit state**: `pnpm --filter '@sharpee/stdlib' run test:ci` green.
  `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`
  (after `./repokit build dungeo`) unchanged at 952/17 — any diff here is a defect, not a
  re-pin, since nothing about NPC execution has landed yet. **ADR-327's AC-2 and AC-5 go
  green** through this phase (its Phase 6 unblocks); **ADR-328 Acceptance item 3 is satisfied**.
- **Status**: PENDING

### Phase 5: D5 — NpcService's decision/execution split; `plugin-npc` dissolves
- **Tier**: Large
- **Budget**: 350
- **Domain focus**: `packages/stdlib/src/npc/npc-service.ts` (838 lines verified this
  session, was 832 at the ADR's writing — grown slightly), `packages/stdlib/src/npc/types.ts`
  (the `NpcAction` union, `:51-59`), `packages/plugin-npc` (104 lines — **not a
  shell; see the open design question below**), `packages/character/src/tick-phases.ts` (`actionEvents`, `:104`/`:449-457`
  — the arbiter's existing feed into the shadow system, redirected).
- **The tick's home is the engine (David, 2026-08-27, confirming `CLAUDE.md:77`'s Logic Location
  table — "NPC turn phase" is an engine responsibility; ADR-328 D5 is amended to say so).**
  `NpcPlugin.onAfterAction` is today the only per-turn caller of `npcService.tick()` and — per its own
  docblock — the only runtime caller of `onPlayerEnters`/`onPlayerLeaves`; it also carries the
  ADR-310 Phase 5 `actionEvents` observation feed, the ADR-320 Phase 8 `emitSound` feed,
  behavior-state `getState`/`setState`, and `getNpcService()` (the registration hook
  `loader.ts:1078` uses). All of that moves into an engine-owned actor turn phase; `plugin-npc`
  dissolves outright, as the ADR's header says. ADR-120's priority ordering (NPC 100 →
  state-machine 75 → scheduler 50; `state-machine-plugin.ts:4,:16,:24` defines itself relative
  to NPCs) becomes engine sequencing — the actor phase runs, then the remaining plugins.
  Migration sites owed by this phase: the umbrella exports `packages/sharpee/src/index.ts:110` and
  `runtime-surface.ts:119` (ADR-178 baseline, `:57,:148,:374`), `story-loader/src/loader.ts`'s
  auto-wiring, `stories/dungeo/src/orchestration/index.ts`,
  `stories/family-zoo-tutorial/src/index.ts:70,:353`, `packages/devkit/fixtures/basic-story`, six
  `story-loader` test suites, and `docs/core-concepts/README.md:48`, which says the opposite
  ("plugs into the turn cycle rather than being built into the engine") and is corrected here.
- **Child artifact**: this plan. Present the split boundary to David first: which of
  `npc-service.ts`'s current members are decision-layer (survive — `canNpcAct` at `:430`,
  `onTurn`/behaviors/tick-phase registration) versus execution-layer (deleted outright per D5 —
  `executeMove`/`executeMoveTo`/`executeTake`/`executeDrop`/`executeAttack`, `:558-838`, and
  the `NpcAction` union itself). No `NpcAction` shim survives — this is dissolve, not adapt
  (David, session 8ae644: "we don't keep compatibility layers").
- **Entry state**: Phases 3-4 shipped (the execution entry exists and every standard action
  reads its actor from it).
- **Deliverable**: `NpcAction`'s hand-rolled executors are deleted; the decision surface
  (`canNpcAct`, `onTurn`, tick-phase registration, the ADR-310 Phase 5 `actionEvents` feed)
  survives and its output becomes a real `(action, actorId)` call against Phase 3's entry;
  `plugin-npc`'s *execution* wrapper retires — but **not "outright, nothing else
  references it"**, which is what this plan first said and is false (corrected 2026-08-27,
  David). Verified: `story-loader/src/loader.ts` imports and auto-wires it
  (`npc-behaviors.test.ts:68` asserts "NpcPlugin auto-wired with no `use` line");
  `packages/sharpee/src/{index,runtime-surface}.ts` re-export it as published umbrella API;
  `stories/dungeo/src/orchestration/index.ts`, `stories/family-zoo-tutorial/src/index.ts` and
  `packages/devkit/fixtures/basic-story/` consume it; six `story-loader` test suites drive the
  real plugin. Every one of those is a migration site this phase owes. The conversation layer's
  exit-legality pre-check — the **call** at `packages/stdlib/src/actions/helpers/dialogue-selector.ts:305`,
  which guesses via `hasTraversableExit` whether an NPC's scene-exit would succeed — is
  replaced by actually running the real `going` action for that NPC through the entry: its
  `validate()` becomes the one truth (impact analysis §B1). **The helper itself stays**
  (corrected 2026-08-27, review): `hasTraversableExit` is also called from
  `story-loader/src/runtime.ts:1337` and `:2373`, Chord-side pre-checks of the same class that
  are owed by Phase 9 (the Chord acting surface — whatever syntax D7 lands is what replaces a
  loader-side legality guess with a real action), not by this phase. ADR-326's adjacency draw
  (`evaluator.ts:667`) does its own exit reads and is unaffected. Also deleted here:
  `packages/lang-en-us/src/npc/` (39 `npc.*` messages) — the interim third-person NPC dialect
  ADR-328 D4 says must not be built already exists, and its only producers are the executors
  this phase removes; ADR-328 D4 is amended to name it.
- **REAL-PATH test (rule 13a)**: the six `story-loader` suites that today drive the real
  `NpcPlugin` (`adr-320-phase8`, `adr-320-phase10-threads`, `character-dialogue`,
  `character-loading`, `gatehouse`, `npc-behaviors`) migrate to the engine-owned actor phase
  and stay real-path — a Chord NPC's behavior decision runs through the real engine turn and
  its chosen act runs the real standard action, asserted on world state. The program-level
  acceptance for this landing unit is 6b's re-pinned chain.
- **Exit state**: `pnpm --filter '@sharpee/stdlib' run test:ci` and
  `pnpm --filter '@sharpee/character' run test:ci` green; ADR-178's "story-opt-in but always
  shipped" plugin list (`:148`) stamped for `plugin-npc`'s removal. **Not independently shippable** —
  Dungeo's five `NpcBehavior`s still return the now-deleted `NpcAction` shape and will not
  compile until Phase 6, exactly like ADR-327 Phase 1's "corpus not expected to parse yet"
  mid-cutover state. This phase and Phase 6 are one landing unit for commit-cutover purposes
  even though they're separate session-sized phases for planning (the same split ADR-327's own
  plan used for its Phases 1-4).
- **Status**: PENDING

### Phase 6a: D6 — Dungeo's four lighter NPCs rewrite onto the pipeline
- **Tier**: Large
- **Budget**: 300
- **Domain focus**: `stories/dungeo/src/npcs/{troll,robot,cyclops,dungeon-master}/` (troll
  123+114 lines behavior/receiving-behavior, robot 194, cyclops 187, dungeon-master 285+244 —
  verified this session, ~1147 lines across the four combined), `stories/dungeo/src/combat/melee-npc-attack.ts`
  (the resolver consuming bare `npc.attacked` events), `stories/dungeo/src/orchestration/npc-setup.ts`.
- **Child artifact**: this plan.
- **Entry state**: Phase 5 shipped (the decision/execution split exists; these four NPCs'
  `NpcBehavior`s are what's currently broken by it).
- **Deliverable**: all four NPCs' behaviors emit `(action, actorId)` invocations directly
  instead of `NpcAction` values; each take/drop/attack/move now runs the real standard action
  and honors its interceptors for the first time — a documented behavior change wherever the
  shadow system previously let one through unchallenged.
- **REAL-PATH test (rule 13a)**: the walkthrough transcripts that exercise these four
  (troll, cyclops, robot, dungeon-master) run green through the real chain at the pinned
  seed; explained diffs re-pin. The full 952/17 chain is 6b's gate, since the thief is still
  on the old system here.
- **Exit state**: these four NPCs' walkthrough coverage passes; the thief (Phase 6b) is the
  only piece still on the old system, so the full chain is not yet expected green.
- **Status**: PENDING

### Phase 6b: D6 — The thief rewrites; the 952-test walkthrough chain re-pins
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: `stories/dungeo/src/npcs/thief/` — `thief-behavior.ts` (574 lines, the
  patrol/theft/combat/RNG deep case, verified this session as the largest single NPC file by a
  wide margin), `thief-entity.ts` (161), `thief-helpers.ts` (260).
- **Child artifact**: this plan.
- **Entry state**: Phase 6a shipped.
- **Deliverable**: the thief's patrol movement, theft, and combat all run through the real
  pipeline; its RNG draws (patrol pathing, steal chance, combat rolls) are the chain's known
  sensitivity class ("thief-RNG cascade") and are the sizing driver for this phase's budget.
- **REAL-PATH test (rule 13a)**: `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`
  after `./repokit build dungeo` — the full 952-test/17-transcript chain, re-recorded at its
  pinned seeds. Every diff reviewed: an explained diff (traced to a real behavior/order change
  from this program) is a re-pin; an unexplained diff is a defect and is fixed, not accepted
  (the ADR-295 precedent, and D6's own text, both name this explicitly). A single run is
  sufficient — the chain is deterministic at the pinned seed.
- **Exit state**: chain green at re-pinned seeds. **ADR-328 Acceptance item 2 is satisfied
  here**: an NPC (the thief, or any of the four from 6a) performs a standard action through the
  pipeline; a trait refusal blocks it where the shadow system couldn't; the player witnesses it
  in third person from the same room (Phase 1's voice work) and — via the default renderer
  hiding `absent` (Phase 2b) — sees nothing from another room, while the event itself still
  fired and mutated state. This is the program's one demonstrable scene.
- **Status**: PENDING

### Phase 6c: D6 — The book's chapter 20, the zoo tutorial, and the devkit fixture rewrite onto the pipeline
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: `docs/book/v2.0.0/parts/part-6/20-non-player-characters.md` (342 lines, 13
  `NpcAction`/`NpcPlugin`/`createNpcService` sites) and its seven `code-snippets/ch20-non-player-characters/*.ts`
  (132 lines; `04-writing-a-custom-behavior.ts` returns `NpcAction` values, `05`–`07` register
  `NpcPlugin`); `stories/family-zoo-tutorial/src/index.ts:70,:353`;
  `packages/devkit/fixtures/basic-story/src/index.ts`.
- **Child artifact**: this plan. Chapter rewrite ruled in-program by David (2026-08-27) over a
  named deferral — the book is tested and complete, and a chapter whose code no longer compiles
  is a regression in a published work, not a doc lag.
- **Entry state**: Phase 5 shipped (the engine-owned actor phase and the registration hook that
  replaces `new NpcPlugin()` exist — the chapter must teach the real surface, not a projected one).
  Not sequenced behind 6a/6b: this phase and Dungeo's rewrite consume the same Phase 5 API and
  can run in either order.
- **Deliverable**: chapter 20 teaches NPC behaviors that emit `(action, actorId)` invocations —
  "actors that take turns" becomes literally true, since an NPC now runs the same four-phase
  action the player does; the plugin-registration sections (`05`–`07`) become the engine's
  registration hook. The book builds runnable code incrementally, so every ch20 snippet compiles
  and the chapter's checkpoint runs. `family-zoo-tutorial` and the devkit `basic-story` fixture
  migrate the same way. Code and snippets are mechanical; prose edits to the chapter are content
  work — the pattern is David's, and edits stay within his clearance for the book.
- **REAL-PATH test (rule 13a)**: **there is no book checkpoint harness** (corrected
  2026-08-27 — `docs/book/v2.0.0/testing/` holds the June QA logs only;
  `scripts/extract-book-snippets.cjs` extracts snippets verbatim, and the June pass assembled
  them by hand). The real path is that method repeated: the ch01–ch20 *author* snippets
  assembled in reading order into a scratch story project (`CATALOG.md`'s stated assembly),
  built with the real toolchain, and played — the parrot NPC acts through the real pipeline.
  `family-zoo-tutorial` builds and its transcripts pass under `./repokit build`.
- **Exit state**: zero references to `NpcAction`/`NpcPlugin`/`createNpcService` under
  `docs/book/v2.0.0/parts` and `code-snippets` (48 today across the tree, the `testing/` logs
  excluded — they are historical records); the zoo tutorial and devkit fixture green.
- **Status**: PENDING

### Phase 8: D7a — Write the Chord acting-surface child ADR
- **Tier**: Medium
- **Budget**: 200
- **Domain focus**: a new ADR under `docs/architecture/adrs/` (**ADR-329** — verified
  2026-08-27: the directory holds 332 `adr-*.md` files but the highest *number* is 328;
  project-profile's "ADR count now 336" is a file count, not a maximum). No existing ADR covers this surface — verified this session
  (grepped `docs/architecture/adrs/*.md` for "acting surface" and Chord/NPC-action-syntax
  language; no hits outside ADR-327/328 themselves).
- **Child artifact**: this phase's own deliverable IS the child artifact D7 requires — ADR-328
  names it explicitly ("a child ADR designs the syntax alongside the platform phases"), distinct
  from Acceptance item 1's four-item list (execution entry, witnessing, NpcService+Dungeo,
  voice), which this ADR sits outside of.
- **Entry state**: Phases 3-4 shipped (D1/D2's execution entry exists — the syntax this ADR
  designs must call into something real, not a stub). Not blocked on Phase 5/6/7.
- **Method**: the lessons-learned approach D7 specifies — write the story block first (the
  mercenaries taking the sword back is the ADR's own worked example), then list what it needs;
  run as an `adr-interview` (rule 11a) with David, one question at a time, when he is ready to
  start it. **This phase cannot be pre-written by session-planner** — it requires David's design
  participation, the same external-dependency shape as ADR-327 Phase 6 before this plan existed.
- **Deliverable**: a new, ACCEPTED ADR designing Chord's syntax for an NPC performing a
  story-authored standard action (e.g. `the mercenaries take the sword`), including its
  relationship to `move` (ADR-325 — teleportation stays separate) and to ADR-327's
  actor-explicit heads (which actor fires when the syntax's action itself completes).
- **Exit state**: the child ADR is ACCEPTED. Its own phases (Phase 9 below) inherit whatever
  scope/tier it specifies — this plan cannot size Phase 9 yet.
- **Status**: PENDING (blocked on David's availability to run the ADR interview — not
  sequenced behind Phases 5-7, only behind Phases 3-4)

### Phase 9: D7b — Implement the Chord acting surface
- **Tier**: unknown — re-plan once Phase 8's ADR is ACCEPTED
- **Budget**: unknown
- **Domain focus**: `packages/chord` (grammar), `packages/story-loader` (runtime), scope
  otherwise set entirely by Phase 8's ADR.
- **Entry state**: **External dependency, not just sequential** — Phase 8's ADR must be
  ACCEPTED before this phase's scope is even knowable, exactly like ADR-327 Phase 6 before this
  plan existed. Run `session-planner` again for this phase specifically once Phase 8 lands.
- **Deliverable**: TBD by Phase 8's ADR.
- **Exit state**: TBD. The impact analysis marks this surface "elective until a story wants
  it" (§ Sizing and shape) — Acceptance item 2's demo scene does not require it (Phase 6b
  already satisfies that item using existing Dungeo NPCs), so this phase is the program's
  natural tail, not a blocker for calling the umbrella complete otherwise.
- **Status**: PENDING (blocked on Phase 8)

## Note on session-state tracking

No `docs/context/.session-state-{id}.json` exists for this session (checked
`docs/context/.active-session` — absent — and a direct file check for the session id given in
this task's framing). Per the session-planner's own instructions, the phase-tracking merge step
is skipped rather than creating a new, unnamespaced state file.
