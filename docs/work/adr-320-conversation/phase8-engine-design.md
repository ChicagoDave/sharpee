# Phase 8 Design — NPC↔NPC Scene Scheduling and Save/Restore

**Status**: CONFIRMED (David, "confirmed", 2026-08-17) and IMPLEMENTED —
see "Implementation outcomes" at the end for the deltas discovered in
construction.
**Phase**: ADR-320 Phase 8 (`docs/work/adr-320-conversation/plan.md`)
**Confirmation on file**: "start phase 8" (David, 2026-08-17, session 48ac57) —
platform-change confirmation for `packages/engine`; `character`, `world-model`,
`stdlib`, `story-loader` confirmations carried forward from Phases 1–7.

## 1. What Phase 8 closes

- **AC8** — NPC↔NPC scenes observable: text only when the PC can observe,
  effects always land; PC intrusion produces participant reactions.
- **AC9** — player claims travel: the propagation / NPC↔NPC-scene leg
  (Phase 6 landed the claim in the hearer's ledger).
- **AC12** — mid-scene save/restore, byte-identical continuation at the
  pinned seed, through the real `SaveRestoreService` (rule 13a).
- Plus the loose end Phase 7 left waiting by design: the authored-initiative
  hook's **occasion wiring** — witnessed-act, subject-change, and silence
  occasions now reach `authoredInitiativeFor` from the turn cycle
  (`buildAuthoredInitiative`'s own doc: "Witnessed-act occasions arrive with
  Phase 8's scheduling").

## 2. Where the code actually lands (the scope note)

The plan names `packages/engine`, but "the engine's NPC turn phase" is, by
the shipped architecture, a delegation chain: engine invokes `NpcPlugin`
(priority 100, ADR-070/120) → stdlib's `NpcService.tick` → the character
package's registered `character-model` tick phase (ADR-310 D15). Scene
scheduling therefore lands as a **new sub-step of the character-model
phase** (`packages/character/src/tick-phases.ts`), exactly where decay/
observe/influence/propagation/goals already live — not as new engine code.

Most of the engine's half is already generic and shipped: plugin events
merge into the turn event stream, and the world snapshot
(`WorldModel.toJSON`) carries the scene store (`character.scenes` world-state
key), trait conversation memory, occurrence keys, and the clock mirror;
RNG stream states ride the save (ADR-293 D7). **Engine source changes are
two small, additive pieces**, both in service of the earshot surface (§3a):
`TurnPluginContext` gains an optional `emitSound` so the tick can feed the
engine's per-turn sound buffer (the sound-dispatch site's own comment
anticipates exactly this: "runs after the plugin tick so any sounds
emitted by NPC actions in a future plugin extension would also land in
the buffer"), and the audibility prose handler gains the player-listener
filter its header already schedules for the moment NPC listeners exist.
Engine's larger deliverable remains the proof: the AC12 real-path
save/restore tests (§7).

Packages touched: `character` (scenes sub-step, binding extensions),
`world-model` (binding contract additions, §8), `stdlib` (PC intrusion at
dispatch; `TickContext` mirror), `story-loader` (initiative runner
registration), `engine` + `plugins` (sound plumbing above), test vehicles
(`stories/character-acceptance` + suites). Chord grammar: untouched.

## 3. The scenes sub-step (`packages/character`)

New sub-step order: decay → observe → influence → propagation → goals →
**scenes**. Scenes run last because they consume both the propagation
sub-step's applied transfers and the goal sub-step's completions from the
same turn. Internal refactor: `runPropagationSubStep` and `runGoalSubStep`
surface what they did this turn (applied transfers; say-step completions
and moves) to the scenes sub-step inside the phase closure — no contract
change, no new registration.

D10's own framing is the design: **an NPC↔NPC scene is propagation made
visible** — one machinery, two faces. The sub-step adds scene bookkeeping
and observability around the existing machinery; it does not generate
dialogue content of its own.

1. **Open on transfer.** A propagation transfer applied between co-located
   NPCs where neither party is seated opens a scene (`openedBy:
   { kind: 'initiative', openerId: speaker }`), seating speaker + listeners,
   floor to the speaker. Parties already co-seated in the same scene just
   get move bookkeeping. A transfer touching a participant seated in a
   *different* scene still lands (effects always) but gets no scene
   bookkeeping — the one-live-scene invariant holds.
2. **Open on goal `say`.** A completed `say` step whose `target` is a
   co-located modeled NPC opens a scene the same way (opener = the pursuing
   NPC, floor to opener); the say's messageId is the opening move. This is
   the "seek out, then speak" driver the ADR names (seek-out is shipped).
3. **Move bookkeeping.** Every scene-wrapped transfer stamps
   `recordSceneMove` + `noteTopicMove(topic)` and sets the floor to the
   speaker; discussed-pair recording rides the existing memory access.
   Every modeled participant gets `markConversationTurn` stamped, so D16
   suppresses their goal pursuit from the next turn — seated NPCs don't
   wander off mid-scene, and a decayed scene releases them (emergent, no
   new rule).
4. **Close on exit.** A seated participant whose goal moved it out of the
   scene's room this turn closes the scene on the `exit` boundary — exit
   legality held by construction (the world already accepted the move).
5. **Close on silence.** The sub-step calls `ageScenes` (Phase 5, until now
   caller-less at runtime): no on-floor move for the threshold closes on
   `silence`, folding per-pair memory.
6. **Initiative occasions (D7).** The sub-step offers occasions to
   co-located modeled NPCs and consults the registered hook:
   - *witnessed-event*: from this turn's detected acts (the observe
     sub-step's `detectActs` results, surfaced in the closure), with the
     committed action id feeding the hook's `witnessedAction`.
   - *subject-change*: a scene whose `subjectChangedTurn` stamped this turn.
   - *silence*: a scene one turn from the decay threshold, before
     `ageScenes` would close it.
   An authored **forcing** row seizes the moment: its body runs through the
   loader-registered runner (§5) — opening a scene with the occasion's
   principal (the act's actor, the scene's participants) when not already
   seated. `suppresses` withdraws. **Disposition alone does not seize a
   content-bearing occasion in Phase 8** — an unauthored seizure has no
   line to speak (D8: nothing in the platform compels speech); disposition
   keeps deciding the shipped open-floor path (Phase 6's `floorWinnerFor`).
7. **World-act interruption (D8's exemption).** A detected act in a room
   with a live scene is a `worldAct` challenge: any grip — `blocking`
   included — yields. The scene closes on the `exit` boundary with a
   `character.scene.interruption` wire event carrying the challenge (no new
   boundary word; the wire event carries the distinction for Phase 9).

### 3a. Observability = spatial sound propagation (AC8, D10's "present or in earshot")

The eavesdropping surface rides the shipped ADR-172 sound subsystem
whole — it was built for exactly this ("the contract L2+ ADRs (NPC voice,
conversation choreography, stealth observation) ride on"):

- **Every scene move emits an `ISound`** (kind `'conversation'`, content =
  the move's messageId + params — the propagation visibility message or
  the say line) through the plugin context's new `emitSound` (§2). The
  engine's existing dispatcher then delivers per-listener
  `sound.audibility.heard` events, and the existing prose handler renders
  `sound.heard.conversation.<tier>` with the content embedded.
- **"Present" and "in earshot" are one gate**: same room short-circuits to
  `full` (verbatim); adjacent spaces grade through the real acoustic graph
  — open door `muffled`/`fragments`, closed door damped, walls and
  dampeners per ADR-173 — and out-of-budget listeners get `silent`, i.e.
  no event at all. Tier-degraded content ("key words, broken phrases") is
  already the language layer's job; lang-en-us ships per-tier defaults and
  the theatre story can override per kind.
- **Volume is runtime-owned over existing words**: the speaker's authored
  propagation *coloring* maps to a volume tier (`conspiratorial`/`fearful`
  → `whisper`, `dramatic` → `raised`, else `normal`) — ADR-310 D6
  discipline, no new vocabulary, nothing to freeze.
- **Effects always land**: every mutation (facts, beliefs, ledgers,
  memory, scene state) is computed before and independent of sound
  dispatch; a `silent` result suppresses only text. Scene wire events
  (`character.scene.*`, `character.exchange.*`) ride the author channel
  ungated — tooling sees everything; player-facing isolation is the
  shipped channel discipline (re-asserted in Phase 9/AC11).
- **One surface, no double render**: a scene-wrapped move's observable
  text is the sound path *only* — the legacy same-room-gated
  `character.propagation.witnessed` event keeps firing solely for ambient
  (non-scene-wrapped) transfers. Consequence: existing acceptance
  transcripts where co-located NPC transfers now become scenes will
  re-render through `sound.heard.conversation.full`; those goldens (our
  own character-acceptance/thealderman fixtures) get updated deliberately
  and enumerated at implementation. Dungeo has no modeled NPCs — the
  walkthrough chain is untouched.
- **NPC listeners**: NPCs still hear conversations through the trait/
  knowledge machinery (transfers), not `ListenerTrait` — nothing changes
  there. But since stories may opt NPCs into `ListenerTrait`, the
  audibility prose handler gains the `target === playerId` filter its
  header already anticipates (§2).

## 4. PC intrusion (`packages/stdlib` + binding)

`runConversationScene` currently treats any scene seating the addressed
NPC as the player's own (it stamps the move clock on a foreign scene, and
its comment defers intrusion to this phase). Phase 8:

- When the addressed NPC is seated in a scene **not** containing the
  player, the action consults the new binding surface (§8)
  `resolveIntrusion(sceneId, interrupterId, worldAct: false)`:
  - **yields** — the NPC↔NPC scene closes (exit boundary +
    `character.scene.interruption` wire), then the normal open path runs:
    the player's scene opens, greeting/topic dispatch proceeds unchanged.
  - **protests** — same as yields, plus a `character.scene.protest` wire
    event naming the protester, so Phase 9 rendering and Phase 10 authored
    reactions (rows and manner — AC8's "participant reactions") have the
    moment on the wire.
  - **blocks** — nothing closes, nothing opens, the selector is not
    consulted; a `character.scene.intrusion_blocked` author event rides the
    stream and the action's existing default response stands. The player's
    *world acts* still break the scene — that is §3.7, not this path.
- Grip derivation: `sceneGrip(scene, strengthFromIntent(intent))` with the
  holder's continuation intent derived by the runtime (neutral → `passive`
  unless a strength is authored on the exchange/scene) — Phase 5's shipped
  derivation, no new numbers.
- Fix folded in: the foreign-scene `recordMove` stamp goes away — the move
  clock only stamps for scenes the player participates in.

## 5. Initiative runner registration (`packages/story-loader`)

The Phase 7 hook answers *whether* a row forces or suppresses; running a
forcing row's **body** needs the loader (bodies are IR; execution is
`execStatements` under the owner's frame). `SceneBindingOptions` gains an
optional `seizeInitiative(participantId, occasion, witnessedAction?)`
callback; `registerCharacterScenes` passes it through, and the loader
implements it: find the row via `authoredInitiativeFor`, exec its plain
body under the owner's occurrence key (same pin/claims/delivery rules as
every serve path — `serveConversationBody`'s machinery), return the events
and any opening line. The scenes sub-step gates the returned text on
observability like everything else; mutations land regardless.

## 6. Claim travel closure (AC9)

No new machinery — the leg is proven, not built:

- Phase 6's statement site lands the player's TELL as told/believes facts +
  claim values in each modeled hearer (`witnessStatement`).
- `transferFact` already moves a held **belief value** with the topic
  (ADR-310 AC5: "propagation moves a claim, not a token") and never
  displaces a belief the listener already holds.
- Phase 8's scenes wrap exactly these transfers (§3.1), so the claim
  travels through NPC↔NPC scenes and the ambient propagation graph with
  one mechanism; a hearer holding contradicting knowledge keeps it, and
  authored rows read the contradiction through the shipped belief/knowledge
  predicates.

The AC9 test (§7) asserts the full chain on trait/ledger state: TELL a
lie → hearer seeks out a third NPC (seek goal) → scene opens → transfer →
third NPC's trait holds the topic + the traveled value with `told`
provenance; contradiction leg asserts the held belief survives.

## 7. Save/restore (AC12) and the Integration Reality Statement

Everything a mid-scene continuation needs rides the world snapshot today:
the scene store (scenes + open exchange + manner rotation cursors + id
sequence, all under `character.scenes`), trait conversation memory and
ledgers (schema v2), occurrence keys, the character clock mirror; RNG
stream states ride `streamStates` (ADR-293 D7). Phase 8 proves the round
trip on the real path — twice:

1. **Engine-level real-path suite** (lives in `story-loader` tests — it
   already depends on `engine`; engine cannot dev-depend downward):
   compile a conversation story → load → drive real actions to mid-scene
   with an exchange open → `SaveRestoreService.createSaveData` → fresh
   engine + `loadSaveData` → assert the restored scene store, open
   exchange, memory, and rotation cursors deep-equal the saved state, then
   drive the same continuation commands on both engines and assert
   identical event streams.
2. **Bundle-level transcript leg**: `stories/character-acceptance` gains a
   scene/exchange fixture and a transcript using the tester's `$save`/
   `$restore` directives mid-exchange — the CLI's own save path, byte-
   compared against the uninterrupted golden at the pinned seed.

The rule 13a statement (OWNED: engine save/restore, the bundle, the loader
chain; REAL-PATH TESTS: the two above; stub justification: none — no stubs)
is produced in-conversation before the phase is declared complete.

## 8. Phase 1 contract amendments (the ask)

1. **`SceneRuntimeBinding.resolveIntrusion(sceneId, interrupterId,
   worldAct): { outcome; wireEvents }`** — stdlib consults it across the
   package boundary (§4); character implements over `sceneGrip` +
   `resolveInterruption`. The `InterruptionOutcome` union
   (`yields | protests | blocks`) moves to the world-model binding file
   with a character-side alias, the same §7-rename idiom Phases 5–6 used.
2. **`SceneBindingOptions.seizeInitiative`** (§5) — optional, loader-bound;
   absent = authored occasions never run (builder stories unaffected).
3. **`SceneWireEvent`** gains `interruption` and `protest` kinds (§3.7,
   §4) — additive; Phase 9 renders them.
4. No new boundary word: interruption closes ride `exit` with the
   interruption wire event alongside; `SceneBoundaryKind` stays frozen.
5. **`TurnPluginContext.emitSound?` + `TickContext.emitSound?`** (§3a) —
   optional and additive on both mirrors (`@sharpee/plugins`, stdlib's NPC
   service context, character's `TickContext`); absent = no sounds, so
   unit harnesses and non-engine callers are unaffected. All three
   signatures are platform-internal.
6. Propagation/goal surfacing to the scenes sub-step is closure-internal —
   no contract.

## 9. What Phase 8 deliberately does not do

- **No new volume/acoustic vocabulary** — earshot (§3a) rides the shipped
  ADR-172 tiers and the runtime-owned coloring→volume mapping; if the
  theatre story wants authored per-scene volume words, that is a Phase 10
  finding that comes back through a freeze review, not a quiet addition.
- **No NPC↔NPC exchange blocks** — exchanges remain the player-facing
  inner primitive; NPC↔NPC moves are transfer-shaped (D10's one machinery).
- **No Chord grammar or vocabulary** — zero language surface; nothing to
  freeze.
- **No rendering** — wire events land in the turn stream; the D12 channel
  schema and its consumption are Phase 9.
- **No platform prose** — every observable line is an authored messageId
  (propagation visibility messages, say-step witnessed keys, greeting/topic
  rows).
- **No disposition-only content seizure** (§3.6) — disposition decides the
  shipped open-floor path; content-bearing occasions require an authored row.

## 10. Test plan (mutation-signature bar, rules 12/13/13a)

Behavior Statements precede every suite; all assertions land on scene
store / trait / ledger / occurrence state, never return values alone.

- **character** (`tests/tick-phases/`, `tests/conversation/`): scene opens
  on transfer (store state, participants, floor); opens on goal-say; move
  bookkeeping (`lastMoveTurn`, `currentTopic`, discussed pairs, D16 marker
  stamped); exit close when a seated NPC's goal moves it away (memory
  folded); silence close via `ageScenes` at threshold; occasion offers
  (witnessed-act id reaches the hook; subject-change and silence occasions
  fire exactly once per stamp); world-act challenge closes a `blocking`
  scene; scene moves emit `ISound` through the context seam (asserted on
  the collected buffer: kind, volume-from-coloring, content messageId);
  a run with no listener in budget mints no text events while mutations
  land byte-identically (AC8's two faces, asserted in one test pair).
- **stdlib**: intrusion yields/protests/blocks against a real registered
  binding + store (scene closed vs held, player scene opened vs not,
  wire/author events); foreign-scene move-stamp fix (regression leg).
- **story-loader real-path**: `seizeInitiative` runs a forcing row's body
  (occurrence key advanced, pins respected, events delivered); AC9 chain
  (§6) end-to-end over real actions; AC12 engine-level suite (§7.1).
- **bundle**: character-acceptance fixture + transcripts — walk-in on an
  NPC↔NPC scene (same-room `full` leg), **earshot legs** (adjacent room
  through an open door renders `sound.heard.conversation.muffled`/
  `fragments`; closed door degrades or silences per the acoustic budget),
  out-of-earshot effects leg exposed by a follow-up ASK, intrusion legs,
  `$save`/`$restore` mid-exchange chain (§7.2). Affected legacy goldens
  (§3a's rendering migration) enumerated and updated in the same change.
- **Regression**: full Dungeo walkthrough chain, character-acceptance,
  thealderman, `pnpm test:scripts`, repo-wide `npx tsc --noEmit`,
  `./repokit build dungeo` — all via the bundle where transcripts run.

## Implementation outcomes (2026-08-17, session 48ac57)

Deltas between the confirmed design and what construction found:

1. **No new wire kinds.** `SceneWireEvent` already carried `interruption`
   with the outcome word (Phase 1 anticipated it); a protest rides
   `interruption` + `outcome: 'protests'` — the planned separate `protest`
   kind was never needed. §8 item 3 is discharged as written-by-Phase-1.
2. **Sound kind is `speech`, not `conversation`.** ADR-172's shipped
   `speech` family already embeds content at `full`/`muffled` and degrades
   at `fragments`/`presence-only`; a `conversation` kind would have needed
   new lang-en-us prose — a package ADR-320 deliberately does not touch.
   The utterance's template params (speaker/listener names, topic) ride
   `ISoundContent.params`.
3. **Prose-pipeline isolation gate (engine).** The domain-message renderer
   and generic fallback rendered ANY event carrying `data.messageId` —
   including scene wire events, whose `messageId` is channel data.
   `routeToHandler` now returns no prose for `character.scene.*` /
   `character.exchange.*` (AC11's isolation made real at the pipeline
   boundary). This also closed a latent Phase 6/7 bundle-level double
   render of exchange-gripped serves.
4. **The leverage gate is retired (David's ruling, option 1, 2026-08-17).**
   ADR-144's `playerCanLeverage` blocked EVERY told-sourced fact from
   re-spreading — no gossip chain exceeded one hop and AC9's travel leg
   was unsatisfiable in any Chord story (no leverage surface was ever
   frozen). Per ADR-320 D11's symmetry ("the PC is an ordinary witnessed
   actor... one ledger discipline"), hearsay now spreads like any
   knowledge; selectivity remains the authored surfaces (`spreads
   nothing`, whitelists, `withholds`, audiences). The flag is dead config,
   stamped RETIRED in `propagation-types.ts`. Follow-on idea filed:
   per-hop rumor degradation — GitHub issue #272.
5. **`ConversationSceneState.abandonedTopic`** (world-model): written by
   `noteTopicMove` beside `subjectChangedTurn`, so the subject-change
   occasion can carry the abandoned topic. Platform-internal, rides the
   snapshot like the rest of the scene store.
6. **Scene clock discipline**: every scenes-sub-step clock comparison goes
   through `dialogueTurn` (mirror + 1) — scene stamps and occasion checks
   share one scale with the dispatch surfaces.
7. **Legacy-golden impact was zero.** No existing transcript exercised the
   migrated surface (their says target the unmodeled player; no fixtures
   had co-located NPC gossip pairs) — Dungeo chain, character-acceptance,
   and thealderman all pass byte-identically. The new
   `phase8-scenes.story` + `p8-*.transcript` fixtures are the first
   bundle-level coverage of earshot grading, intrusion, effects-land, and
   the `$save`/`$restore` mid-exchange chain.
