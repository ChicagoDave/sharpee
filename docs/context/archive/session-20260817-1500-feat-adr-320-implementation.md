# Session Summary: 2026-08-17 - feat/adr-320-implementation

## Status: COMPLETE (Phase 9 landed and green — plan DONE with evidence; mutation-verification's one warning closed same session; work uncommitted pending David's word)

## Goals
- ADR-320 Phase 9: the D12 wire schema — scene event stream and exchange
  response affordances as channel data, consumed by the IDE testing
  surface (David: "continue" → discussion → "proceed"; contract
  amendment + world-model/story-loader widening: "confirmed").

## Completed
- Platform-change discussion held and confirmed; two design points
  ratified by David: (1) the Phase 1 affordance schema's `verbal.messageId`
  amended to a `topic` filter (entity | text primary+aliases) — compiled
  Chord rows have no message id, the filter IS the enumerable "what could
  the player say"; (2) affordances snapshotted onto `ExchangeState.responses`
  at open time (persisted scene state → mid-exchange restore re-advertises;
  channel is a pure projection).
- world-model: `AffordanceTopic` + amended `ResponseAffordance`
  (scene-wire.ts); `ExchangeState.responses` (conversation-scene.ts);
  barrel exports.
- story-loader: `exchangeResponses()` enumerates compiled rows
  (rowId `<exchangeId>#<index>`, entity ids resolved to world ids,
  exactly one silence — authored or appended per D8); both open-exchange
  sites snapshot it.
- stdlib: `scene` channel (append/sparse; `character.scene.*` +
  `character.exchange.*` rows) and `exchange-affordances` channel
  (replace/always; one ExchangeAffordances per live scene with an open
  exchange, empty array when none) — both `gatedBy: 'authorChannels'`
  (AC11); registered in STANDARD_CHANNELS/IDS.
- engine test: player-profile manifest filters both channels (AC11 at the
  channel layer, beside the ADR-310 precedent test).
- IDE testing surface: new `scene.ts` (scene rows + affordance groups →
  ExplainGroup lines); `ExplainLine.claimChannel` so click-to-assert pins
  the line's own channel (`character`/`scene`/`exchange-affordances`);
  panel merges character + scene + affordance groups; surface bundle
  rebuilt into IDE Resources.
- New fixture: `p9-wire.transcript` — the built bundle emits both
  channels under transcript channel claims (4 commands passing).

## Evidence (all run 2026-08-17)
- stdlib scene channel tests: 9 passing; stdlib full: 1633 passing, 27 skipped.
- story-loader adr-320-phase9: 4 passing (real loader/actions/SaveRestoreService);
  story-loader full: 535 passing.
- character full: 540 passing. world-model full: 1489 passing, 10 skipped.
- engine full: 633 passing, 7 skipped (incl. new AC11 filter test).
- testing-surface: 84 passing (8 new scene tests); tsc clean.
- Bundle: `./repokit build dungeo` green; p9-wire + p8 suite: 19 passing;
  b-suite per-story: all passing; Dungeo walkthrough chain: 952 passing
  in 17 transcripts at pinned seed.

## Key Decisions
- Scene wire channels ship author-gated only this phase; ungating for a
  chat-style client (Reflections-class) is that client's future decision.
- Dedicated `scene` channel rather than widening the `character` channel's
  prefixes — interior explain vs presentation stream are different consumers.
- Affordances are state (ExchangeState), not an event feed — survives
  save/restore; `exchange-affordances` emits the empty array (never stale).
- Fragment discipline: sceneId (runtime-minted) deliberately not pinned in
  click-to-assert fragments; exchangeId (authored) is.

## Open Items
- Work uncommitted (awaiting David's word).
- Mutation-verification: one warning (the click-to-assert line→delegate→
  addChannel hop untested for non-character channels) — closed same
  session with a model.test.ts round-trip case (surface 85 passing).
  Everything else traced GREEN.

## Files Modified
- packages/world-model/src/capabilities/scene-wire.ts, index.ts
- packages/world-model/src/traits/character-model/conversation-scene.ts
- packages/story-loader/src/runtime.ts
- packages/stdlib/src/channels/scene.ts (new), standard.ts, index.ts
- packages/stdlib/tests/channels/scene.test.ts (new)
- packages/story-loader/tests/adr-320-phase9.test.ts (new)
- packages/engine/tests/integration/channel-bootstrap.test.ts
- packages/character/tests/conversation/{scene-runtime,scene-scoring,scene-dispatch}.test.ts (fixture responses)
- tools/ide/web/testing-surface/src/scene.ts (new), character.ts, cards.ts, main.ts
- tools/ide/web/testing-surface/tests/scene.test.ts (new)
- tools/ide/web/testing-surface/tests/model.test.ts (D12 claim round-trip case)
- tools/ide/SharpeeIDE/Resources/testing-surface (rebuilt bundle)
- stories/character-acceptance/tests/transcripts/p9-wire.transcript (new)
- docs/work/adr-320-conversation/plan.md (Phase 9 → CURRENT)

## Notes
- Session started: 2026-08-17 ~15:00 (session 045c55)
- Audit correction: the audit's "three sessions uncommitted" flag was
  stale — Phases 6/7/8 are committed (49051566, 484be733, b77b38e3).
- The b-suite "51 failures" during regression was a harness mistake
  (wrong --story); each b-transcript pairs with its own .story file and
  all pass with the right one.
