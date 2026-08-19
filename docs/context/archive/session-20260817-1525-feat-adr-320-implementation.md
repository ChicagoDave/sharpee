# Session Summary: 2026-08-17 - feat/adr-320-implementation

## Status: COMPLETE — committed and pushed (c56fed83 on origin/feat/adr-320-implementation). Phase 10 story green; D14 threads amendment accepted + frozen; Phases 10.1–10.2 DONE. Next: Phase 10.3 (packages/character thread runtime + #273 fix + ContinuationEntry retirement), awaiting David's confirmation.

## Goals
- ADR-320 Phase 10: Theatre Company demonstration story — authoring
  (David: "proceed"; title **The Ides of March**; content control
  granted to Claude — "test material").

## Completed
- New story vehicle `stories/ides-of-march/` (Chord-only, like
  thealderman): 1599 Globe, Shakespeare/Burbage/Kemp, 3-day clock via
  story states + lodging night handlers, both objectives (Kemp sworn +
  play-book out) resolved by `select on` state dispatch at the
  opening-night reckoning; win/lose endings.
- Every Phase 2 beat mapped and exercised: greetings/absence words,
  blocking identity probe (exchange overlay + fall-through), manner
  beats/voice on the wire, recency-gated refusal (blow-up), authored
  initiative (open-floor, on-harm forcing, stung suppression), NPC↔NPC
  scenes (day-2 blow-up transfer; confer goal-say with earshot),
  TELL-claim propagation with Kemp's contradiction comeback, threading
  (grievance-gated offer; subject-change steering), wire channels,
  $save/$restore mid-exchange, full win walkthrough.
- Transcripts: 132 passing in 11 unit transcripts + 34 passing in
  wt-01-the-errand (all seed 42, via dist/cli/sharpee.js); the
  checkpoint's earshot judgment call closed with a dedicated
  earshot-effects transcript (blow-up witnessed + unheard confer's
  effect read back from Burbage).
- Traceability: docs/work/adr-320-conversation/phase10-story-traceability.md
  (beat→transcript map, deviations, authoring lessons).

## Key Decisions
- **ADR-320 D14 amendment written** (conversation threads): David's
  five design answers — `define conversation`; `on parting`/`on
  resuming`; `is concluded`; blocking refusal = authored `on refusing:`
  row first, re-serve current beat second; beats advance on BOTH the
  NPC's floor turns and player continuation prompts ("tell me more" /
  "continue" / "go on" / "and?"). AC14 added; parser-en-us carve-out
  narrowed once for the prompt forms. Design record + freeze worksheet:
  docs/work/adr-320-conversation/conversation-threads-design.md.
- Content authority for this story granted to Claude (memory:
  ides-of-march-content-authority).
- `./repokit build <slug>` deliverable phrasing satisfied by the
  bundle path — Chord-only stories aren't repokit targets (recorded
  deviation, matches thealderman precedent).
- Exchanges open from topic rows only (never initiative bodies) — #273.

## Platform issues filed (story-side workarounds in place)
- #273 initiative `then asks` wedges engine on tick-side seize.
- #274 win/lose ending phrase double-prints (pre-existing).
- #275 subject-change occasion clock-mirror off-by-one (condition form
  works; occasion form dead for player scenes).

## Phase 10.1 (chord grammar) — DONE (evidence run 2026-08-17)
- `define conversation` block: AST/parser/IR/analyzer + `is concluded`
  predicate (interception with declared-key validation); inline-prose
  registration extended to thread bodies; conversation-target walk
  covers beats/transitions/conclusion.
- CHORD_LANGUAGE_VERSION 3.2.0 → 3.3.0; chord.ebnf productions added;
  surface pin re-recorded (ad0219…3715).
- Tests: adr-320-threads.test.ts 16 passing; chord full suite 909
  passing (4 goldens moved on languageVersion only); repo-wide tsc
  clean.

## Phase 10.2 (world-model persistence + wire) — DONE (2026-08-17)
- ConversationThreadState/Status (partnerId → threadKey → cursor/status)
  on ICharacterModelData, schema v3 versioned reader; five thread-*
  wire kinds + ThreadContinuability; barrels. world-model 1492 passing;
  repo-wide tsc clean.

## Finalize / Commit
- `commit-remote`'s test gate caught a real break: story-loader's
  `evalCondition` switch (packages/story-loader/src/evaluator.ts:155)
  was non-exhaustive against chord's new `concluded` IRCondition kind —
  the loud-fail evaluator gate working as designed. The earlier
  repo-wide tsc pass had been clean only because it ran against
  chord's stale dist. David approved the fix; the `concluded` case
  landed as the real D14 per-pair trait read mirroring the existing
  `discussed` case — this is Phase 10.4's evaluator-case deliverable
  arriving early, worth carrying into the Phase 10.4 session's context.
  Verified after the fix: story-loader build 21/21, story-loader suite
  535 passing, repo-wide `turbo test:ci` 65/65.
- Committed and pushed as c56fed83 (265f7d5a..c56fed83) to
  origin/feat/adr-320-implementation: 40 files, +3430/−49.
  Session-end cleanup done (event log archived, session state
  retired). `tools/ide/SharpeeIDE/Resources/docs-tab/docs-index.json`
  deliberately excluded (parallel IDE session artifact) and left
  untouched on disk.

## Open Items
- Phase 10's exit stays held open until Phase 10.7 reworks the story
  onto threads (per the amended plan); the D14 design itself is RESOLVED
  and its vocabulary FROZEN (David, "frozen go") — no open questions
  remain in conversation-threads-design.md.
- Next action: Phase 10.3 (packages/character thread runtime, #273
  seize-runner fix, ContinuationEntry retirement) — needs David's
  platform confirmation at phase start.

## Files Modified
- stories/ides-of-march/chord/ides-of-march.story (new, ~640 lines)
- stories/ides-of-march/tests/transcripts/*.transcript (10 new)
- stories/ides-of-march/walkthroughs/wt-01-the-errand.transcript (new)
- docs/work/adr-320-conversation/phase10-story-traceability.md (new)
- docs/work/adr-320-conversation/plan.md (Phase 10 → CURRENT)
- packages/story-loader/src/evaluator.ts (evalCondition `concluded`
  case — real D14 per-pair trait read, mirrors `discussed`)
- packages/chord/{src/ast,parser,ir,analyzer,version}.ts, chord.ebnf,
  tests/adr-320-threads.test.ts (new), language-version.test.ts,
  4 golden snapshots (Phase 10.1)
- packages/world-model/src/traits/character-model/{conversation-scene,
  characterModelTrait,index}.ts, src/capabilities/{scene-wire,index}.ts,
  tests/unit/traits/character-model.test.ts (Phase 10.2)
- docs/architecture/adrs/adr-320-conversation-and-complex-dialogue.md
  (D14, AC14, amendment scope, Session note)
- docs/work/adr-320-conversation/conversation-threads-design.md (new,
  RESOLVED + FROZEN)

## Notes
- Session started: 2026-08-17 15:25 (session 13a3e0)
- Fixed references: theatre-story-task.md (Phase 2, CONFIRMED).
- Authoring lessons recorded in the traceability doc (scene decay gaps,
  silence-row immortalizer, act categories, claims-tag semantics,
  leave semantics, handler declaration order).
