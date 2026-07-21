# Session Summary: 2026-07-20 ~21:25 - chord-foundations (session 171837)

## Goals
- ADR-248 (RESTART via platform events — client reboot) : author, interview,
  accept, and implement per docs/work/adr-248-restart-reboot/plan.md.

## Completed
- **ADR-248 authored + ACCEPTED**: from David's "why aren't we just nullifying
  the engine instance?" / "isn't this why we have platform events?" — RESTART
  becomes QUIT-symmetric: hook → ack final packet → stop('restart') → client
  reboots via its own boot path. All 4 open questions interviewed (autosave
  deleted on confirm; ack-stop-reboot sequence, no pre-emptive
  restart_completed(true); factory-only story export; harness in scope).
  adr-review's 4 gaps folded in. Old proposal marked SUPERSEDED.
- **Plan written** (session-planner): docs/work/adr-248-restart-reboot/plan.md,
  5 phases; plan-review: 1 advisory tension (ADR-035 needs one-line
  cross-reference to the RESTART exception — fold into Phase 1).

## In Progress
- **Phase 1 COMPLETE**: restartGame() deleted; stop() union +'restart';
  both call sites ack-then-stop, no restart_completed(true); core unions
  widened; 4 restart tests (2 new meta-path); core 158 + engine 518 green;
  typecheck clean; mutation-verification clean; ADR-035 addendum added.
- **Phases 2-4 COMPLETE**; Phase 5 (verification) in progress:
  - Phase 3 (browser): BrowserClientConfig.reboot; pendingReboot deferred
    dispose+reboot after executeTurn; autosave deleted on confirm AND
    per-turn autosave gated during restart turn; connectEngine reboot path
    (re-point world, re-subscribe channel renderer, no DOM double-bind);
    SaveManager.setWorld; menu-path restart reboots directly; 4 new tests
    (restart-reboot.test.ts) — platform-browser 85 green.
  - Phase 4 (harness): assembleGame(story, {freshStory}) with boot()
    closure + live engine/world getters + auto-confirm hook + deferred
    in-place reboot; loadStory/bundle-entry/author-game pass freshStory
    (purge+re-require / Chord recompile); runner playerId re-resolved per
    command; bootstrap 34 green (2 new assemble-restart tests, via dist
    require — vite overflows on index import); smoke transcript green.
  - Acceptance: fernhill restart transcript (original repro) 5/5 PASS;
    dungeo restart transcript (with state-reset proof) 7/7 PASS.
  - Piped-REPL: CONFIRMED pipe artifact — piped play mode drops commands
    after the first typed one with or without restart; restart acks fine.
  - ext-testing packaging quirk found: exports "import" → dist-esm that
    its build never produces; bootstrap vitest.config aliases around it.
- **Phase 2 details** — dungeo daemon closures done
  (troll/sword-glow/balloon/forest daemons + balloon-handler world-derived
  lookup; dead reader exports removed); dungeo createStory() + config
  unexported; bootstrap.loadStory factory-only; bridge (2 sites); devkit
  story+browser templates + basic-story fixture; engine Story docs.
  Dungeo 31, bootstrap 32, devkit 39 green. Module-state audit: NO live
  hazards (20 benign counters, 9 safe-reseeded, dead code: river/gas-room/
  basket handlers — basket has hazard pattern in dead code). Agents:
  cloak done (11 pre-existing test failures flagged, stash-verified);
  5-story agent (armoured/thealderman/channel-service-test/concealment/
  friendly-zoo) still running.

## Phase 5 verification (HEAD)
- Full repokit build (dungeo --browser) clean x2.
- Suites: core 158, engine 518, bootstrap 34, platform-browser 85,
  devkit 39, dungeo 31 — all green.
- Acceptance: fernhill restart 5/5, dungeo restart 7/7; smoke green.
- cloak + friendly-zoo transcript suites green.
- Walkthrough chain (wt-*, --chain --stop-on-failure): ALL PASSED.
- mutation-verification (phases 2-4): GREEN overall; 2 gaps closed same
  session — connectEngine reboot-branch test added (manager identity +
  setWorld + re-subscribe; platform-browser now 86 green) and the
  duplicated purge+re-require+createStory logic collapsed into exported
  bootstrap.moduleFreshStory (one tested implementation for loadStory AND
  the CLI bundle; bundle rebuilt, batch + both acceptance transcripts
  re-verified green). Remaining noted gap: zero-test stories
  (thealderman/armoured/concealment-test) predate ADR-248 — listed in
  Open Items.
- 113-transcript batch: 4 fully-green runs; intermittent royal-puzzle-basic
  "Engine is not running" cascade (post-turn death mid-maze) in 3 of 7 runs.
  **PROVEN PRE-EXISTING**: pristine 35258ad3 worktree reproduced the same
  failure 2/15 solo runs (12-fail cascade + 1-fail). Same class as the
  17e36e residual (RNG death near danger); NOT an ADR-248 regression.
  Worktree removed after. Remedy needs David's ruling (transcript logic
  gate à la GDT ND per never-turn-off-randomness policy; transcript was
  nominally "working" so not modified unilaterally).

## ADR-245 amendment (post-ADR-248, David-driven)
- Proposed Chord language example added to ADR-245 at David's ask, then
  corrected to his shape: a phrasebook is ordinary story phrase
  definitions (`<key>[, strategy]:` + `or` variants) inside
  `define phrasebook <name> [while <condition>] … end phrasebook` — NOT a
  platform-messageId override pack (Q-2 "any key" ruling flagged for
  companion re-confirmation, David hasn't re-ruled).
- Rulings folded in: `import phrasebook "<file>"` (author file
  organization; import site = arbitration position); `use phrasebook
  <name> [while <cond>]` distribution spelling (registry-disambiguated
  from `use <extension>`; stacking multiple lines with varying
  predicates verified with David); single kebab book names; variant
  state per (book, key) — save-shape relevant; generalized `import`
  PARKED for its own ADR (companion must not foreclose it).
- Syntax workability verified against packages/chord/src/parser.ts
  (define-dispatch exact-word, define-phrase header machinery reusable,
  TOP_KEYWORDS gains `import`, use-line one-word grammar untouched).
- Next step per ADR's own gate: design-level companion (grammar, IR/
  registry shapes, unreliable-narrator E2E) + David's go-ahead.

## Key Decisions
- ADR-248 ACCEPTED (see ADR for contracts).
- Plan-level seams: BrowserClientConfig.reboot callback = story's own start();
  deferred reboot after executeTurn resolves; all 7 in-repo stories migrate.

## Open Items / Next
- **royal-puzzle-basic pre-existing RNG death flake** — needs David's
  ruling on a transcript logic gate (GDT ND?); reproduced at baseline.
- **Residual module-level state (David to rule)**: 20 benign eventCounter
  monotonic counters + 9 safe-reseeded refs remain module-level in dungeo
  (audited: no live hazards); dead code with hazard pattern:
  handlers/basket-handler.ts (never-registered actions), river-handler /
  gas-room-handler dead setters. tools/shite + zifmia test fixtures still
  export `story` singletons (shite abandoned; zifmia in design — its loader
  will adopt the factory contract at design time).
- armoured/thealderman browser entries use the window.location.reload
  fallback (no reboot callback wired; both have pre-existing tsconfig DOM
  drift). cloak's 11 pre-existing stale unit tests flagged (agent-verified
  against stash baseline).
- ext-testing exports map points "import" at dist-esm it never builds
  (worked around via bootstrap vitest alias) — packaging fix candidate.
- ADR-247 implementation still unblocked/unscheduled (separate work).

## Session Metadata
- **Status**: COMPLETE (ADR-248 implemented, Phases 1-5); work uncommitted
  on chord-foundations atop 35258ad3.
- **Test state**: core 158 / engine 518 / bootstrap 34 / platform-browser 85
  / devkit 39 / dungeo 31 green; full repokit build (dungeo --browser)
  clean; fernhill+dungeo restart acceptance transcripts green; walkthrough
  chain green; cloak + friendly-zoo suites green; batch green x4 (royal
  puzzle flake pre-existing, see above).
