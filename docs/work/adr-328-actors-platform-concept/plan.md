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
- *(Added 2026-08-28, Phase 1 landing.)* `docs/architecture/adrs/adr-089-pronoun-identity-system.md`
  amended in place: Part 3 confirmed to stand (`NarrativeSettings` remains the story-level
  narrative person of the player, unchanged); Phase D's string pre-pass is now scoped as the
  player-voice resolver only, not the resolver of record for every actor.

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
  ADR-089 amended in place (amend-after-code, not a re-interview). **Corrected at landing:**
  Part 3 is *not* superseded — `NarrativeSettings` remains the story-level narrative person of
  the player, immutable after game start, exactly as written. What this phase supersedes is
  Phase D's string pre-pass as the resolver of record for every actor: it stays as the
  player-voice resolver; non-player actors go through the phrase algebra.
- **Status**: DONE (2026-08-28, session d6dc2b) — landed as designed, with one simplification:
  no Assembler player-pronoun rule was needed. `renderTemplate` branches on whether the bound
  actor is the player (`referableId` vs `ctx.narrative.playerId`): the player takes the unchanged
  ADR-089 pre-pass (byte-identical output, 3rd-person pronouns preserved); anyone else takes
  `expandActorPlaceholders`, which rewrites the `{You}` family and bare verbs into
  `{capitalize the __actor__}` / `{verb:<3sg> __actor__}` forms the Assembler agrees (ADR-199).
  Possessive lands as `{the __actor__}'s`; reflexive as `{pronoun:reflexive}` (last-mentioned) —
  the "unshipped" pieces from the design needed no new phrase kinds. The engine binds the
  actor at one chokepoint (`renderViaPhrase`, `ACTOR_PARAM_KEY` from if-domain) from
  `event.entities.actor`, passed by the `domain-message` and `generic` handlers; an emitter's own
  binding wins. Templates untouched except the four actor-voice literals (`going.ts:24`,
  `taking.ts:24,:28`, `asking.ts:32`); the 420 `{You}` sites are sugar and did not change.
  **Evidence (2026-08-28):** `pnpm --filter '@sharpee/lang-en-us' run test:ci` — 26 files, 444
  passing (14 new in `tests/actor-voice.test.ts`, incl. rendered assertions for the four
  rewritten templates, player byte-identical + third person); `pnpm --filter '@sharpee/engine' run test:ci`
  — 64 files, 646 passing, 7 skipped (pre-existing; 3 new mock-level in `phrase-render.test.ts`,
  6 new REAL-PATH in `tests/prose-pipeline/actor-voice.test.ts` — domain-message and generic handlers both: real `WorldModel`, real
  `EnglishLanguageProvider` with the shipped `if.action.closing.closed` template, real
  `ProsePipeline` — "The thief closes the brass lamp." and "You close the brass lamp." in one
  turn); engine `tsc --noEmit` clean; `./repokit build dungeo` then
  `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` —
  **952 passing across 17 transcripts, every golden matched** (byte-identical, as required
  before any non-player actor runs). ADR-089 carries the dated amendment.

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
- **Design as approved (David, "Go", 2026-08-28 00:42 CDT)** — corrects four details above,
  each verified against source before the edit:
  1. **The chokepoint is the engine's enrichment funnel**, `enrichEvent` in
     `packages/engine/src/turn-event-processor.ts:63`, reached by both funnels
     (`game-engine.ts:1129` action, `:2252` plugin) and by Phase 3's execution entry. The funnel
     is blind today: the loader mints every `chord.phrase` with `entities: {}`
     (`runtime.ts:4549`), and enrichment then defaults `entities.actor` to the **player** and
     `entities.location` to the **player's room** (`turn-event-processor.ts:88-93`). So the
     contract is two-sided: **producers** (loader entity-turn `:3336` / trait-turn `:3396`
     daemons; character propagation `tick-phases.ts:674`) stamp `entities.actor` = owner and
     `entities.location` = the room it happened in (room owner → the room, region owner → the
     region, else the containing room — the owner-side half of `playerPresentAt`, `:3563`);
     the **funnel** stamps `presence` only on events that arrived with a producer-stamped
     `entities.location`, checked before the player-location default is applied. Story-owned
     daemons (`:3352`) stay untagged — not actor-sourced, and untagged means "show".
     **Corrected at implementation (2026-08-28):** player action events are NOT unlocated —
     the action context stamps `entities.location` at context creation
     (`action-context-factory.ts:87-99`), so they reach the funnel producer-located and tag
     `present`. Because the location is captured *before* execute, a `going` event sits at the
     origin room after the move and would have tagged `absent`; the funnel therefore treats an
     event whose `entities.actor` is the player as `present` by identity, before consulting
     `presenceOf`. Rendering reads none of this, so goldens stay byte-identical (verified:
     walkthrough chain below).
  2. **`location` reuses `entities.location`** (`core/src/events/types.ts:45`, "A location
     where the event occurred") — a top-level sibling would duplicate it. Only `presence` is new.
  3. **Presence is co-location + concealment, not `canPerceive`.** `canPerceive` is a sense
     check (darkness/blindness); D3 keeps darkness a transform. New
     `IPerceptionService.presenceOf(observer, locationId, world)` in `if-services`, implemented
     on stdlib's `PerceptionService`, folds the loader's room/region/containing-room rule with
     character's `resolvePlayerPresence` (`visibility.ts:137` — exported, **zero callers**;
     `tick-phases.ts:650,674` hardcode `'present'`) for the `concealed` case
     (`TraitType.CONCEALED_STATE`). Bootstrap always wires a `PerceptionService`
     (`bootstrap/src/index.ts:273`).
  4. **The type lives in `core`.** `ISemanticEvent` cannot import from `character`
     (dependency runs the other way); `Presence` is declared beside `ISemanticEvent` and
     `character` re-exports it as `PlayerPresence` — the union is verbatim.
  Also recorded: `narrate` is written in eight places and read by nothing downstream (grep over
  all `packages/*/src`; `runtime.ts:3422`'s "must narrate to reach the transcript" is stale) —
  the tag is not modelled on it. And a **fourth drop site**: `tick-phases.ts:674`'s
  `roomId === playerLocation` gate on the propagation `witnessed` event, reaching the engine via
  the character phase registration (ADR-310 D15) → `NpcPlugin` → `processPluginEvents`; its
  control flow retires in 2b with the other three, and ADR-328 D3 is amended to say four.
- **Entry state**: none — independent of D1/D2/D5/D6. Present the emit-boundary design to
  David first: which single chokepoint stamps `location`+`presence` on every actor-sourced
  narration event (the entity-daemon path in `story-loader`, and, once Phase 3/4 land, the
  execution-entry path too — this phase's mechanism must not be actor-source-specific).
  **Done — see "Design as approved" above.**
- **Deliverable**: every actor-sourced narration event carries `location` (the room it
  happened in) and `presence` (computed via `PerceptionService.canPerceive` against the current
  player) alongside the existing `narrate` hint. **No dropping** — this phase does not touch
  the story-loader presence gate's control flow yet (Phase 2b does); it only adds the tag. The
  engine's `filterEvents` call in `processPluginEvents` likewise keeps dropping until 2b, but
  the events it passes are already tagged here. *(Corrected 2026-08-28: `entities.location`
  and `presence` via `presenceOf`, per the approved design.)*
- **REAL-PATH test (rule 13a)**: this phase is the emit-time half of one landing unit with
  2b, and 2b's real-path test (an entity daemon firing off-stage through a real Chord story
  and the real transcript-tester) is the unit's acceptance. Its own check, real path: the
  tagged events are asserted on the real engine's emitted event payloads — `location` and
  `presence` present and correct — for an on-stage and an off-stage daemon firing, no
  emitter double. *(Corrected 2026-08-28: 2a leaves the Chord gate closed, so an off-stage
  Chord clause emits nothing; the 2a real-path check is a TS test story registering a daemon on
  the real scheduler plugin for an NPC in another room, through the real engine and the real
  `PerceptionService`, asserting `presence: 'absent'` and the NPC's room on the emitted payload,
  with the on-stage case asserting `'present'`. The Chord off-stage case stays 2b's.)*
- **Exit state**: `pnpm --filter '@sharpee/core' run test:ci`, `pnpm --filter '@sharpee/character' run test:ci`,
  `pnpm --filter '@sharpee/stdlib' run test:ci`, **`pnpm --filter '@sharpee/engine' run test:ci`,
  `pnpm --filter '@sharpee/story-loader' run test:ci`** (added 2026-08-28 — the funnel and the
  producer stamp live there) green with new tag-stamping coverage. **Not
  independently shippable** — the tag exists on the event but nothing downstream reads it yet,
  and the daemon presence gate at `runtime.ts:3322` still silently drops off-stage firings
  exactly as before. This is intentional mid-landing state, the same shape as ADR-327 Phase 1's
  "corpus not expected to parse yet" — Phase 2b closes the loop in the same landing.
- **Status**: DONE (2026-08-28, session 13615f). Evidence: core 176, stdlib 1647 (27 pre-existing skips), character 568, engine 656 (7 pre-existing skips), story-loader 963 — all passing after the last edit; `./repokit build dungeo` + walkthrough chain 952 passing, goldens byte-identical; `mutation-verification` clean. Uncommitted at time of writing.

### Phase 2b: D3 — Perception tagging, client-facing half + daemon-gate retirement
- **Tier**: Large
- **Budget**: 350
- **Domain focus**: `packages/text-blocks/src/types.ts` (`ITextBlock`, `:117` — gains
  `location`/`presence`; verified this session it carries neither today), the prose pipeline
  (copies the tag from event to block), `packages/channel-service/src/channel-service.ts`
  (the packet carries the tag per ADR-163's "channels carry every story→UI signal"), the
  default client renderer (hides `absent`, shows `present`/`concealed`), transcript-tester
  (renders through the default so existing goldens keep their meaning; an omniscient test mode
  shows all actor emissions labelled by location), the engine's `processPluginEvents` gate (`game-engine.ts:2238` — **corrected 2026-08-28:
  `filterEvents` never dropped; it transforms (darkness → `perception.blocked`, per-sense
  renderings selection) and returns one event per input. The plugin-side drops are
  `NpcService`'s decision logic (`stdlib/src/npc/behaviors.ts:114`, `npc-service.ts:500`),
  retired in Phase 5. The 2b engine-side change is ADR-069's amendment: an `absent`-tagged
  event passes through `filterEvents` untouched, so darkness in the player's room never
  rewrites an off-stage line**), and
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
- **Status**: DONE (2026-08-28, session 5c0980). Scope as landed, beyond the text above: the
  goal-step gate (`tick-phases.ts:827`, `step-evaluator.ts` ×5, `propagation-evaluator.ts:46`
  — folded on David's "go", stated as an assumption) and the influence
  `expired`/`resisted`/`applied` room gates (`tick-phases.ts:917/1037/1047`, same pattern) also
  retire onto the tag; the loader's timer named-turn prose gate (`timerOwnerPresent`) retires
  with `playerPresentAt`; a placeless owner is tagged `absent` by `sourced()` directly.
  Evidence (all 2026-08-28 03:03–03:10 CDT, after the last source edit): stdlib 1651 passing
  (27 pre-existing skips), engine 659 (7 pre-existing skips), channel-service 119,
  platform-browser 145, transcript-tester 282, story-loader 963, character 570 (incl. the new `off-stage-narration.test.ts` written for the mutation-verification gap); root `tsc`
  clean; `./repokit build dungeo` green; REAL-PATH `stories/presence-test` default 4 passing /
  omniscient 3 passing through `dist/cli/sharpee.js`; Dungeo chain 952 passing (unchanged);
  friendly-zoo chain 56 passing across wt-01..07 with `timeline.transcript`, `wt-04`, `wt-05`
  re-pinned (explained in each header) — wt-01's `examine yourself` is a pre-existing
  ADR-327 `yourself` failure (GH #319, noted there), exercised with a diagnostic substitute.
  Re-pinned unit fixtures: story-loader `region-daemon`, `region-forest`, `ownership-runtime`,
  `zoo-surfaces-phase3`, `places-runtime`, `timers-runtime`; character `goals`, `propagation`.
  Pre-existing, unrelated: `scripts/__tests__/cli-chord-seed.test.ts` uses the removed
  `create the player` grammar (GH #320). ADR-328 D3 amended (2026-08-28); ADR-213 §Witnessed,
  ADR-325 D2 + Non-goals, ADR-069 (new amendment), ADR-070 `:538` (correction) stamped.
  **Story consequence to flag**: friendly-zoo's four `on every turn while after-hours, once`
  confessions are now spent on the first after-hours turn wherever the player is, so in
  normal play they are heard only if the player is standing there at closing — the
  ADR-predicted outcome, but the zoo may want `after the player entering while after-hours,
  once` instead (David's call, not made here).

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
- **Status**: DONE (2026-08-28, session f6b1e5). Evidence: `ActionContext.actor` added
  (stdlib `enhanced-types.ts`; `player` stays the player); both context factories
  (`stdlib/src/actions/enhanced-context.ts`, `engine/src/action-context-factory.ts`) take an
  `actor` defaulting to the player and derive `currentLocation`, every scope helper, `event()`'s
  `entities.actor/location`, `emitSound`'s source, and the implicit-take sub-context from it.
  `CommandExecutor.executeAsActor(ActorCommand)` (`command-executor.ts`) and `execute()` share one
  private `runPhases(command, actor, …)`; `TurnResult.actorId` added; hook `actorId` and the
  ADR-104 inference scope read the actor. Correction to the domain-focus line above: `:50` was
  `BeforeActionHookData.actorId`, not an executor option — there was nothing dormant to make
  live; and the parser world-context read (`:188`) stays player-bound because it is on the parse
  half, which is player-only by construction. Pilot: `taking.ts` reads `context.actor` (4 sites),
  and the lifecycle engine it consults (`stdlib/src/actions/lifecycle/lifecycle-engine.ts`, 6
  sites — the actor-consultation slot and every interceptor hook's `actorId`) flipped to
  `context.actor` after mutation-verification showed an NPC's take would still consult and
  inform interceptors as the player.
  REAL-PATH: `packages/engine/tests/execute-as-actor.test.ts` (11 tests) through the real
  `CommandExecutor`/`StandardActionRegistry`/`EventProcessor`/`EngineRandomService` — NPC take
  moves the lamp into the NPC (`world.getLocation`), `entities.actor` and `data.actorId` are the
  NPC, real scope rejection when the NPC is in another room, real `SceneryTrait` rejection, hook
  `actorId`, an item interceptor vetoing by `actorId` and told the NPC (then the player), the
  ADR-327 D1 actor-consultation slot consulting the acting NPC and not the player, unknown
  actor/action → `command.failed` with no mutation, parser baseline unchanged.
  Runs 2026-08-28 04:04–04:07 CDT after the last source edit (the lifecycle flip):
  `./repokit build dungeo` green; root `npx tsc --noEmit` clean; engine 670 passing (7
  pre-existing skips); stdlib 1651 passing (27 pre-existing skips); story-loader 963 passing
  (thirteen hand-rolled `context: any` fixtures gained `actor: player`); character 570 passing;
  Dungeo chain 952 passing; presence-test transcripts passing. Not done here by design: a `GameEngine` wrapper (Phase 5's NpcService
  design decides how an NPC action folds into the turn).

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
  Carried from Phase 3's mutation-verification (2026-08-28): two shared reads the pilot did not
  reach and this sweep must — `stdlib/src/helpers/multi-object-handler.ts` (`expandMultiObject`/
  `expandAll`/`expandList` build the candidate set from `context.player`'s scope, so an NPC's
  "take all" filters the wrong room) and a test gap for the engine factory's `emitSound` source
  and implicit-take sub-context under a non-player actor (both thread `actor`; no test drives
  them with one). Also: thirteen story-loader test fixtures hand-roll `context: any` and now
  carry `actor: player` — a sweep that reaches an action they drive needs nothing more, but any
  new hand-rolled fixture must include `actor`.
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
- **Status**: DONE (2026-08-28, session a19b44). Evidence: 133 `context.player`/`getPlayer()`
  reads flipped to `context.actor` across 50 files (49 under `stdlib/src/actions/**` plus
  `helpers/multi-object-handler.ts`); seven reads survive under the path, each commented with
  its reason — `attacking.ts` victim-is-player branch and `deadly-room-death.ts` (`killPlayer`
  is the player-death primitive; Chord's only death statement is `kill the player`),
  `concealment-break.ts` (hidden-player mechanic; Chord's `concealed` is an item marker),
  `context-adapter.ts` (if-domain's `IActionContext` declares no `actor`), and the two
  `markVisited` guards in `going.ts`/`looking.ts` (`visited` backs Chord's `first time` prose —
  the reader's first look — so only the player's own arrival/look marks it; `after <actor>
  entering` binds to `actor_moved`, not `first_entered`, so NPC heads lose nothing). Decisions
  and the Chord-seam reading are in the "Actor Sweep Decisions" artifact
  (https://claude.ai/code/artifact/cdfbdcd5-b9d2-43b3-b5fa-45c5bd02be27); David accepted all
  seven recommendations.
  Tests from the Behavior Statements: `engine/tests/execute-as-actor.test.ts` +2 (implicit take
  inside wearing as the NPC; `emitSound` sourced from the NPC and its room),
  `stdlib/tests/unit/helpers/multi-object-actor.test.ts` (3: NPC `take all`/`drop all` expand from
  and land in the NPC), `stdlib/tests/unit/actions/visited-guard.test.ts` (2),
  `story-loader/tests/adr-327-ac2-execution-entry.test.ts` (4 — ADR-327 AC-2's non-player half
  through the real `CommandExecutor.executeAsActor`: the guards fire `on the guards taking` and
  `after the guards taking`, never the player's heads, with the sword's location and occurrence
  keys asserted), `story-loader/tests/adr-328-npc-dialogue-scene.test.ts` (3 — from
  mutation-verification's one warning: an NPC addressing an NPC opens the scene seated on
  itself, the player nowhere in it). `@sharpee/event-processor` and `@sharpee/parser-en-us`
  added as story-loader devDependencies for those two tests. Seven more hand-rolled
  `context: any` loader fixtures gained `actor: player` (David: "continue").
  Runs 2026-08-28 20:00–20:35 CDT after the last source edit: root `npx tsc --noEmit` clean;
  stdlib 1656 passing (27 pre-existing skips); engine 672 (7 skips); story-loader 970; character
  570; `./repokit build dungeo` green; Dungeo chain 952/17 passing and **byte-identical** to the
  pre-sweep baseline (full-output diff with `ms` timings masked: 0 lines); presence-test
  transcripts passing. ADR-327 AC-2 satisfied (stamped); ADR-328 Acceptance item 3 stamped for
  the AC-2 half — see the ADR for the AC-5 half.

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
- **Entry state (added 2026-08-28, session a19b44)**: Phase 4 shipped; every standard action
  reads `context.actor`. Carried, not forgotten: ADR-327 AC-5 (`change the player to`) has no
  real-path test on either half — nothing references `game.pc_switched` — and its "old PC's
  own-block clause still fires when the old PC acts" half now has its dependency
  (`executeAsActor`); write it where the PC switch lands. NPC-visited semantics and NPC death
  are open by design (see the Phase 4 survivor comments); D7's child ADR gives them words.
- **Status**: DONE (2026-08-28, session 1d6ae5) — landed as presented (twelve calls, all accepted:
  "keep going"). The seam is `NpcContext.act(actionId, slots) → ActResult` (the engine's
  `executeAsActor`, curried per NPC) plus `narrate(message | {text}, params)` → one `game.message`
  sourced by the NPC at its current room; hooks return `void`. `NpcAction`, the seven executors,
  `announceMovement`/`npc.moved.witnessed`, the combat-resolver registry, and the runtime-dead
  `onSpokenTo`/`onAttacked`/`onObserve` + `onPlayerSpeaks`/`onNpcAttacked` are deleted. The engine
  registers `ActorTurnPlugin` (`packages/engine/src/actor-turn-plugin.ts`, id `sharpee.engine.actors`,
  priority 100) in its constructor and exposes `getNpcService()`; `plugin-npc` is deleted from the
  workspace, the umbrella, the ADR-178 baseline (stamped), repokit, and seven package configs.
  `ActorCommand.direction` → `parsed.extras.direction`; `TurnResult.refused` (set on the blocked
  branch) is what `ActResult.success` reads — `success` alone reports a `blocked()` refusal as
  success (`take_blocked` carries no `blocked: true`). `going` narrates a witnessed mover through
  its own `actor_exited` (`if.action.going.departs`, at the origin) and `actor_entered`
  (`if.action.going.arrives`, at the destination — `context.event(type, data, { location })` is
  the new override, both context implementations) and emits no arrival perception for a
  non-protagonist; `lang-en-us/src/npc/npc.ts` keeps three behavior lines (D4 amended).
  `canActorLeave` runs `going.validate()` per direction for the scene leaver
  (`dialogue-selector.ts`); `hasTraversableExit` stays for `runtime.ts`'s two Phase 9 sites.
  basic-combat: `basicNpcResolver` deleted; `BasicCombatInterceptor` draws the villain point for
  a non-player attacker; `applyCombatResult` leaves the player's lethal flag to `killPlayer`, whose
  guard now keys on the `dead` flag rather than `isAlive` (health ≤ 0 silenced
  `if.event.player.died` on every combat-death path — the ordering trap the resolver had worked
  around by hand). Save state: `pluginStates['sharpee.engine.actors']`; a `sharpee.plugin.npc`
  entry restores through a read-side alias in `save-restore-service.ts`. act-detection reads
  `if.event.taken`/`if.event.attacked` only.
  **Evidence (2026-08-28, 21:35–21:55 CDT, after the last source edit):** stdlib 1660 passing
  (27 pre-existing skips; new `going-witnessed.test.ts` 3, `exit-legality` +4 `canActorLeave`,
  `npc-service.test.ts` rewritten 25, ADR-203 AC-1/2/4 rewritten onto the real going action);
  engine 679 passing (7 skips; new `actor-turn-plugin.test.ts` 7 REAL-PATH: real `GameEngine`,
  real `PerceptionService`, real player turn — take moves the lamp and is tagged present, a
  scenery take comes back `success: false` with nothing moved, an NPC entering the player's room
  is `absent` at exit and `present` at entry with no room description, `narrate` renders,
  onPlayerLeaves/Enters fire only for the player's own move, the legacy save id restores);
  lang-en-us 447 passing (+3 template tests); character 570 passing; basic-combat 32 passing
  (new `npc-attack-through-attacking.test.ts` 3 REAL-PATH: the real attacking action as the
  ogre through the real interceptor — `if.event.player.died` via `killPlayer`, `if.event.death`
  for an NPC victim, `violence_not_the_answer` with no interceptor); story-loader 971 passing
  (the six suites drive the engine's own phase through `tests/helpers/boot-engine.ts` — a real
  `GameEngine`, `setStory`, `getById('sharpee.engine.actors')`; `npc-behaviors` adds a full real
  turn; 12 other suites' engine stubs gained `getNpcService: () => createNpcService()`); chord
  1064 passing (two alias-catalog entries); baseline 8 passing; plugins 13 passing. Type checks
  per package clean (note: root `npx tsc --noEmit` is vacuous — `tsconfig.json` has `files: []`
  and only references, so it checks nothing; prior sessions' "root tsc clean" lines were empty
  evidence). `./repokit build --no-genai` green (platform + 4.1 MB bundle; genai-api regenerated
  by hand). Bundle smoke, all through `dist/cli/sharpee.js`: presence-test 7 passing;
  character-acceptance (Chord, real character phase through the engine's actor phase) b1 15,
  p10 21, b3 62 passing + 1 failing (`b3-seek-out-recycle` second confession); cloak-of-darkness
  80 passing + 2 failing (bar-darkness golden banner divergence, `examine yourself`). **All three
  failures reproduce byte-for-byte on a HEAD (`593945a8`) worktree build — pre-existing, not this
  phase's.** Dungeo does not compile, as this phase's exit state says.

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
- **Entry state (added 2026-08-28, session 1d6ae5)**: the shape is `onTurn(context): void`
  with `context.act(IFActions.X, { directObject | direction })` and `context.narrate(...)`;
  `onSpokenTo`/`onAttacked` no longer exist (they were never called — cyclops/robot/dungeon-master's
  `onSpokenTo` and thief/troll/cyclops's `onAttacked` are dead code to drop, not port). Dungeo's
  `meleeNpcResolver` (`dungeo/src/index.ts:578`, `combat/melee-npc-attack.ts`) has no registry to
  register into: NPC blows are `attacking` through the target's `CombatantTrait` interceptor —
  fold it into Dungeo's interceptor the way basic-combat did (villain-vs-hero point on the
  attacker; the player's lethal flag belongs to `killPlayer` in attacking's report, never to the
  interceptor). Story handlers on `if.event.taken` (treasure scoring) now see the thief's takes —
  check the actor. The thief's `custom` lair-deposit is direct mutation inside `onTurn` (still
  allowed) or `dropping` per item. Dungeo's `say-action`/`bat-handler`/`exorcism-handler` emit
  their own `npc.emoted`; `npc.no_response` and the `npc.attacks…` family are Dungeo's own
  `addMessage` overrides and keep working. `moveTo` had no live user.
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
- **Progress (2026-08-28, session 1d6ae5 — committed WIP at finalize)**: all five behaviors, the
  melee interceptor's villain branch, the `stealing` action, the guardian exemption on the axe, and
  `NightVisionTrait` (world-model, David's ruling: seeing in the dark is its own trait) are written;
  Dungeo unit tests 46 passing at the pre-trait build; chain 267/268 through wt-07 at that build.
  Two one-liners left broken at finalize: `world-model/src/traits/implementations.ts:84` needs the
  `NIGHT_VISION` registry entry; `night-vision.test.ts` must declare darkness with
  `requiresLight: true`. Then rebuild → chain → re-pin explained diffs. 6a and 6b are landing
  together (the thief was rewritten in the same pass).
- **Status**: DONE (2026-08-28, session 1d6ae5) — 6a and 6b landed together. **The chain did
  not re-pin: `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`
  → 952 passing across 17 transcripts, every golden matched** (23:55 CDT, after the last
  source edit). Three findings, each answered at its own layer, are what made byte-identity
  possible: (1) the thief's theft from the player is not a `taking` — `taking`'s scope refuses
  an item inside another actor — so Dungeo's `stealing` action (`actions/stealing/`,
  `DUNGEO_STEAL`; reports `if.event.taken` + `fromLocation`, silent refusal) is what he acts;
  (2) the underground residents act in dark rooms — `NightVisionTrait` (world-model; David:
  "wouldn't seeing in the dark be its own trait?"), honored at `VisibilityBehavior`'s two
  darkness gates, on the thief/troll/cyclops/robot/DM; (3) the carousel is the player's puzzle
  (MDL CAROUSEL-EXIT; ROBBER never traverses exits) — the Round Room resolver defers a non-player
  mover to static topology so the thief no longer draws on `dungeo.round-room.exit` under the
  player. A fourth was Phase 5's own: `going`'s witnessed-mover narration is gated on
  `NpcTrait.announcesMovement` again (David: "we're adding non-corpus text to dungeo?") — the
  opt-in the retired `announceMovement` honored; Chord's `announces-movement` still lowers to it.
  Villain blows: the real `attacking` through `MeleeInterceptor`'s villain branch (resolver
  folded in; `VILLAIN_RECOVERS`/`VILLAIN_NO_STRENGTH` refusals; hero death via `killPlayer`
  inside the interceptor, emitted from `postReport`); `melee-villain-blow.test.ts` 4. The troll
  takes his own axe (guardian exempt from the white-hot refusal). `onSpokenTo`/`onAttacked`
  were never called — dropped, not ported. Evidence: Dungeo unit tests 46 passing; stdlib 1661,
  engine 679 (+actor-turn 7), story-loader 971, world-model 1496 (+night-vision 4) passing.
  Dungeo unit transcripts, classified against a `593945a8` worktree build (baseline 1742
  passing, 1 failing — `info-channel-baseline`, pre-existing): first run 1733/9 surfaced one
  real regression — `trophy-case-scoring`, because `taking` awarded ADR-129 take-points to
  whoever took (the thief's room thefts scored for the player); fixed with a protagonist guard
  in `taking.ts` + `taking-points-actor.test.ts` (2). Final: 1738 passing, 5 failing = the
  pre-existing one, an unpinned-seed flake (`implicit-take-put`), and three explained
  assertion-shape changes owed David's ruling: `troll-interactions.transcript:75,:80` assert the
  troll's blow as a `game.message` (it is `if.event.attacked` with the same prose now);
  `wave-rainbow.transcript:42,:76` assert no `if.event.actor_moved` on a blocked `east` and now
  see an NPC's real step that turn. Mutation-verification's five story-side gaps closed:
  `stealing-action.test.ts` (4), `thief-lair-deposit.test.ts` (2), `troll-axe-behaviors.test.ts`
  (2), `carousel-exit-resolver.test.ts` (2), `melee-villain-blow.test.ts` +2 forced outcomes —
  Dungeo vitest 58 passing (11 files); stdlib 1663; chain re-run after the guard: 952/17.


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
- **Status**: DONE (2026-08-28, session 1d6ae5) — landed with 6a; see 6a's status for the evidence (952/17 byte-identical, no re-pin).

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
- **Entry state (added 2026-08-28, session 1d6ae5)**: `stories/family-zoo-tutorial` and
  `packages/devkit/fixtures/basic-story` already rewrote in Phase 5 (`narrate({ text })` replaces
  the `speak`/`emote` + `npc.speech`/`npc.emote` pair; `engine.getNpcService()` replaces the
  plugin). Still owed here: `docs/book/v2.0.0/parts/part-6/20-non-player-characters.md` and its
  `code-snippets/ch20-*` (and the v1.5.0 copies), plus `tutorials/familyzoo/v1.5.0` and `v2.0.0`
  whose `package.json`s still depend on `@sharpee/plugin-npc`.
- **Status**: CURRENT (since 2026-08-28)

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
