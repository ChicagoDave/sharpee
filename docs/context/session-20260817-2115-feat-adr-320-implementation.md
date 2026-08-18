# Session Summary: 2026-08-17 - feat/adr-320-implementation (session b71e04)

## Status: COMPLETE — Phases 10.5, 10.6, and 10.7 DONE (plan updated with evidence); Phase 10's held-open exit CLOSES. Next: Phase 11 (acceptance closure — full AC 1–14 audit, whole-platform regression, ADR-142 supersession confirm).

## Phase 10.7 — DONE (this session)
- **Three threads authored** (stories/ides-of-march):
  - `the-defection` for Kemp, blocking, NPC-opened: `opens when the
    grievance was discussed and the-blow-up is stale`; beat 1 gated on
    the exact complement of the table's too-raw window (negated recency
    `is not fresh and is not recent` — preserves the day-one
    player-initiated path); beats: sounding-out → his price → `then asks
    the-offer`; `on refusing:` authored ("THIS first"); conclusion gated
    on Kemp's sworn state (sworn/cooled variants). Table keeps the
    too-raw refusals + brush-off and gains an `is concluded` settled row.
  - `the-suspicion` for Shakespeare, passive: beat 1 carries the old
    book row's body verbatim (steering-noticed variant + on-the-book +
    the plain question), beats 2–3 new (reads-you, the book's weight);
    `on parting` renders per D14's table; resumes across scene close,
    night, and room ("You always come back to it"); conclusion (read to
    the end) + `is concluded` testimony row.
  - `the-drilling` for Burbage, blocking with NO `on refusing:`
    (repeat-second — he says it again word for word), day-3 gated,
    NPC-opened on opening morning.
  - Humorous/irrelevant topic rows added per David's direction: Kemp on
    ale and the bear-baiting, Burbage and Shakespeare on the weather.
- **Platform fix surfaced by the rework** (story-loader): the tick-path
  surplus-phrase leak — a multi-alternative body (gated conclusion)
  rendered the LOSING phrase into player prose, because
  deliverSeizureBody returned surplus chord.phrase events raw and the
  engine's ADR-097 domain-message handler renders ANY event carrying
  data.messageId. Surplus now re-typed `character.author.phrase_surplus`
  with `surplusMessageId` (no top-level messageId). Behavior Statement
  produced; unit test asserts winner-in-sounds / loser-absent /
  re-typed event shape. The dispatch path was verified clean (probe).
- **Design note**: D14's transition table says passive "parks, rendering
  `on parting` if authored" — that IS the live behavior (the parting
  line renders to the player on the parking turn); the 10.4 session
  note's wire-only framing was the deviation, already flagged for
  David's review. Transcripts assert the rendered parting line.
- **Transcripts** (all at seed 42): threads-defection (28 steps — the
  blocking matrix with `on refusing:`, NPC self-open, all prompt paths,
  exchange-holds precedence, is-concluded false-before/true-after),
  threads-suspicion (20 — passive park with rendered parting, resume
  same-sitting and across the day boundary into a different room,
  prompt-driven conclusion), threads-drilling (11 — repeat-second
  without `on refusing:`, inert after conclusion), thread-save +
  thread-restore (mid-thread $save/$restore golden pair; the save file
  is gitignored like every `saves/` artifact — the pair runs in one
  invocation, save leg writing what the restore leg reads, the
  p8-mid-exchange convention), cornered reworked
  (legal-exit half + thread-parks-on-his-exit) + cornered-locked (new,
  fresh-state locked-door half). Ides unit suite: 204 steps across 17
  transcripts passing.
- **wt-01 reworked** (34 steps passing): Kemp opens the defection
  himself after the cooling waits, "tell me more"/"go on" advance to
  the offer, sworn + finished-WELL conclusion; day 3 crosses Burbage's
  drilling without breaking.
- **Evidence (all run 2026-08-17)**: story-loader 561, stdlib 1633,
  engine 633, character 563 passing; repo-wide tsc clean; ides 204
  unit + 34 walkthrough; thealderman, Dungeo chain, character-acceptance
  p8/p9/p10 all green. AC13 discharged; Phase 10 complete.

## Goals
- ADR-320 Phase 10.5: `packages/parser-en-us` continuation-prompt forms —
  the frozen list ("tell me more" / "continue" / "go on" / "and?") as
  thread-advance input, routed to Phase 10.4's dispatch precedence.
  David confirmed phase start ("phase 10.5").
- ADR-320 Phase 10.6: engine mid-beat save/restore + D12 wire
  consumption. David confirmed ("continue").

## Phase 10.6 — DONE (this session)
- **thread-affordances channel** (stdlib/channels/scene.ts): replace-mode,
  emit-always, gatedBy authorChannels — pure projection of the Phase 10.4
  `threadContinuability` snapshot from the scene store (advertise on
  open/beat/resume, cleared on park/conclude, `continuable: false` on a
  held gate); registered in standard.ts + STANDARD_CHANNEL_IDS + barrel.
  The five `thread-*` wire kinds already rode the `scene` channel's
  prefix projection — no change needed there.
- **AC11**: channel-bootstrap.test.ts exclusion extended — a player
  profile (authorChannels absent) provably carries no
  `thread-affordances`; author-profile presence rides the
  STANDARD_CHANNEL_IDS sweep automatically.
- **Platform fix surfaced by the acceptance transcript**: a dispatch-path
  resume (authored `on resuming:`) now stamps the pair's thread cycle
  key in serveThreadDispatch, so the same-cycle tick-side owner floor
  turn stands down — before, resume + next beat bunched into one turn
  and "continue" after a resume skipped a beat. Aligns dispatch with
  `readyThreadMove`'s one-move-per-turn. Behavior Statement produced;
  unit test asserts cursor unchanged after same-cycle tick, beat-two on
  the next cycle.
- **Real save/restore proof** (story-loader, real SaveRestoreService):
  ACTIVE mid-beat save restores deep-equal `conversationThreads`,
  re-advertises continuability identically, continues byte-identically
  (beat-two, matching the live control); PARKED save restores and
  resumes with `on resuming:` exactly as after a live gap.
- **Bundle proof** (seed 42): p10-save/$save + p10-saved-restore/$restore
  through the platform engine (restored run serves the golden lines
  through conclusion); p10-park-across-day — passive park, Archive day
  turn (quiet-day→next-day story states), resume renders the resuming
  line, cursor held. Fixture story gained the Archive room + states.
- **Testing surface** (tools/ide/web/testing-surface): five thread-kind
  describers with click-to-assert threadKey fragments;
  `threadAffordanceGroupsOf` renders "has more to say" / "holds — waits
  on its gate" lines claiming on `thread-affordances`; main.ts consumes.
- **Integration Reality Statement produced (rule 13a)**: all OWNED
  dependencies (SaveRestoreService, bundle $save/$restore, trait/store
  serialization, manifest, tick) have real-path tests; the only stubs
  are testing-surface capture fixtures, backed by real-path channel
  tests and the transcripts.
- **Evidence (all run 2026-08-17)**: story-loader 560 (+6), stdlib 1633,
  engine 633, testing-surface 89 passing; repo-wide tsc clean; 21
  transcript steps across 4 p10 transcripts; baselines green — ides 132
  unit + 34 walkthrough, thealderman, Dungeo chain, character-acceptance
  p8/p9 (incl. the p8 save/restore pair).

## Completed
- **Grammar (parser-en-us)**: "tell me more", "continue", "go on" added as
  literals under `define action talking` in `grammar/standard-en-us.story`;
  `src/grammar.ts` regenerated via `./repokit grammar` (413 rules; website
  grammar-blocks.ts regenerated alongside). "and?" added platform-side in
  `src/platform-grammar.ts` beside the `?` → help ruling — tokenization is
  whitespace-only, so it arrives as the single literal token `and?`.
  No collisions: `go the direction` matches only direction words; no
  existing transcript typed any of the four forms.
- **Routing (stdlib)**: a targetless `if.action.talking` firing resolves
  its partner implicitly — new `resolveImplicitThreadPartner` in
  `actions/helpers/dialogue-selector.ts` walks co-located actors and asks
  the pure `threadGrips` probe with a `talk-to` intent (true exactly when
  the pair's active thread has a ready beat, so held beats, open
  exchanges, and no-thread cases resolve nothing). `talking.ts` routes all
  four phases + the lifecycle slot through a `talkTarget()` helper
  (parsed direct object ?? sharedData.implicitTarget); no claimant falls
  to the existing `no_target` path. lang-en-us untouched (no new text).
- **Fixture**: `stories/character-acceptance/chord/p10-threads.story`
  (frozen mechanical fixture, plain story language, no ADR refs) — one
  Prompter, four-beat thread, conclusion-gated topic row — plus
  `tests/transcripts/p10-continuation-prompts.transcript` (9 steps).
- **Tests (all first-run green, 2026-08-17)**:
  - parser-en-us `tests/adr-320-continuation-prompts.test.ts`: 13 tests —
    four forms → `if.action.talking` with no direct object,
    case-insensitive, no-widening pins (go north/go out/tell about/bare
    "and"/talk to guard).
  - story-loader `adr-320-phase10-threads.test.ts` new describe (5 tests,
    real dispatch through the real talking action): targetless advance
    moves the real trait cursor and concludes past the last beat; inert
    with no thread (no_target, no state touched); held `beat, when` gate
    and open exchange both refuse the advance; a second thread-bearing
    NPC co-located cannot activate while the player is seated (the
    resolver's claimant is unique — closes mutation-verification's one
    observation about the untested tie-break, whose branch no current
    path reaches; helper comment corrected to say so).
  - Bundle proof: the p10 transcript passes via `dist/cli/sharpee.js` at
    seed 42 — all four forms advance one beat each, the conclusion gates
    the ledger row, prompts inert before activation and after conclusion.
- **Evidence (all run 2026-08-17)**: parser-en-us 324 passing, stdlib
  1633 passing, story-loader 554 passing; repo-wide `npx tsc --noEmit`
  clean; bundle rebuilt (`./repokit build dungeo`); baselines green —
  ides-of-march 132 unit + 34-walkthrough chain, thealderman 75, Dungeo
  walkthrough chain, character-acceptance p8/p9 transcripts. Mutation
  verification clean.

## Key Decisions
- The prompts ride `if.action.talking`, not a new action: the deliverable
  freeze ("no new player-facing text") rules out a new action's
  requiredMessages, and `serveThreadDispatch` already treats `talk-to` as
  thread-advance — the only new machinery is implicit-partner resolution.
- Implicit resolution scopes to threads only (the `threadClaims` probe),
  not to "any scene partner": a prompt with no ready thread is inert on
  the existing no-target path, matching D14's held-beat rule on both
  paths for free.
- Multiple claimants (two active threads with two co-located NPCs in a
  multi-party scene): first in containment order wins, documented in the
  helper header.

## Open Items
- Phase 11 (acceptance closure) is next: full AC 1–14 audit with dated
  inline evidence, whole-platform regression, byte-identical
  no-constructs compile check, ADR-142 supersession confirm.
- Observation for David (kept as-is, now visible in-story): a blocking
  thread's off-topic refusal/re-serve does not stamp the cycle key, so
  the same turn's tick advances the thread a beat — the NPC refuses,
  then presses on (Kemp: "THIS first" + "So ask it" in one turn;
  Burbage's re-served instruction + next order likewise). Reads well
  dramatically and the transcripts pin it, but it's the same bunching
  shape the resume fix closed — one for the transition-turn review.
- A day-one rose ask (after the grievance chat) activates the defection
  thread before the blow-up exists — the preserved equivalent of the
  old row's day-one offer path; once active, a day-two resume bypasses
  the too-raw window (the raw gates guard first approach, not
  resumption). Noted as intended reading; David may want the raw window
  to guard resumes too.
- Pre-session audit flagged (not this phase's scope): 23 stranded
  `.devarch-events-*.jsonl` logs in docs/context/ (SessionEnd archival
  path broken); two stale plans needing disposition
  (adr-280-chord-writer-project-model Phase 3, live-derived-state
  Phase 1 — the latter's closing commit says "SHIPPED").
- `tools/ide/SharpeeIDE/Resources/docs-tab/docs-index.json` modified by
  the parallel IDE session — left uncommitted, out of scope.

## Files Modified
- packages/parser-en-us/grammar/standard-en-us.story (three literals + comment)
- packages/parser-en-us/src/grammar.ts (regenerated)
- packages/parser-en-us/src/platform-grammar.ts (`and?` rule + header)
- packages/parser-en-us/tests/adr-320-continuation-prompts.test.ts (new)
- packages/stdlib/src/actions/helpers/dialogue-selector.ts
  (resolveImplicitThreadPartner + header)
- packages/stdlib/src/actions/standard/talking/talking.ts (talkTarget
  routing, implicit resolution in validate)
- packages/story-loader/tests/adr-320-phase10-threads.test.ts (4 new tests)
- stories/character-acceptance/chord/p10-threads.story (new fixture)
- stories/character-acceptance/tests/transcripts/p10-continuation-prompts.transcript (new)
- website/src/app/chord/stdlib/reference/grammar-blocks.ts (regenerated)
- docs/work/adr-320-conversation/plan.md (10.5 and 10.6 → DONE with evidence)

Phase 10.6 additions:
- packages/stdlib/src/channels/scene.ts (threadAffordancesChannel),
  standard.ts (registration + id constant), index.ts (barrel)
- packages/story-loader/src/runtime.ts (resume cycle-stamp fix)
- packages/story-loader/tests/adr-320-phase10-threads.test.ts (+6 tests)
- packages/engine/tests/integration/channel-bootstrap.test.ts (AC11 leg)
- tools/ide/web/testing-surface/src/scene.ts (thread describers +
  threadAffordanceGroupsOf), src/main.ts (consumption),
  tests/scene.test.ts (+4 tests)
- stories/character-acceptance/chord/p10-threads.story (Archive room,
  day states), tests/transcripts/p10-park-across-day.transcript,
  p10-save.transcript, p10-saved-restore.transcript (new)

Phase 10.7 additions:
- stories/ides-of-march/chord/ides-of-march.story (three conversation
  blocks, table rework, ~20 new phrases, humorous rows)
- stories/ides-of-march/tests/transcripts/threads-defection.transcript,
  threads-suspicion.transcript, threads-drilling.transcript,
  thread-save.transcript, thread-restore.transcript,
  cornered-locked.transcript (new); cornered.transcript (reworked)
- stories/ides-of-march/chord/saves/ides-mid-thread.json (runtime save,
  gitignored by design — written by thread-save.transcript each run)
- stories/ides-of-march/walkthroughs/wt-01-the-errand.transcript (reworked)
- packages/story-loader/src/runtime.ts (surplus-phrase re-typing)
- packages/story-loader/tests/adr-320-phase10-threads.test.ts (+1 test)
- docs/work/adr-320-conversation/plan.md (10.7 → DONE; Phase 10 closes)

## Notes
- Session started: 2026-08-17 21:15 (session b71e04)
