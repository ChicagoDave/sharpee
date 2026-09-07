# Session Summary: 2026-09-07 - feat/secret-letter-port

## Goals
- Assess `packages/engine/src/game-engine.ts` (3015 lines) per David's code-review question, then write an ADR on the refactoring opportunity, filed under a GitHub issue.
- Extend that into a package-by-package refactoring survey ("look for other areas of refactoring throughout all of the packages — one at a time"), separate from the Secret Letter port plan.

## Phase Context
- **Plan**: `docs/work/secret-letter-port/plan.md` — "Retarget-port *Jack Toresal and The Secret Letter* ... into a native Chord story" (resolved by fallback: the sessions-root `.current-plan` pointer file does not exist; this was the newest `plan.md` by mtime).
- **Phase executed**: N/A — this session's work was independent of that plan. Phases 4, 6, and 10 (all CURRENT) were untouched; no phase was advanced, closed, or reframed.
- **Tool calls used**: 187 / 100 (Small tier budget in `.session-state-354dfe.json` — set for a different scope than what the session became; the 70%/90%/100% budget banners fired at 06:55, 07:26, and 07:30 CDT, and three more ADRs (337, 338, 339, 340) were written after the 100% banner as the survey continued at David's direction).
- **Phase outcome**: N/A (no plan phase executed) — ran well over its tool-call budget.

## Completed

### Engine turn-cycle assessment (the originating question)
- Read `game-engine.ts` at HEAD `6ad2faeba`: `executeTurn` spans lines 1082-1508 (426 lines, ~25 sequential phases, ordering carried by comments citing seven ADRs); three `switch (platformOp.type)` copies at 1693/2672/2860; the `PlatformOperationHandler` extracted 2026-01-16 (`2d0468c1d`) is imported and declared but never constructed or called; `TurnEventProcessor` is constructed but never invoked (only its standalone `processEvent` function runs, at two enrichment funnels). Growth: 2010 → 1583 lines at the January extraction → 3015 today, across 35 commits since June.
- ADR-334 written, interviewed (Q-1 b, Q-2 a, Q-3 a), reviewed (`adr-review` 19/19 after one fold), and ACCEPTED: `docs/architecture/adrs/adr-334-game-engine-turn-pipeline.md`. GitHub issue #376.

### Package survey (David: "one at a time")
- **story-loader**: ADR-335 (Q-1 a: thirteen modules; Q-2 a: restore hook; review 19/19 after a D4 fold that reversed the draft's generator back to derivation, so ADR-255 D2 stands). `docs/architecture/adrs/adr-335-story-loader-decomposition.md`, GH #377.
- **chord**: analyzer 8500 / parser 8434 lines; six non-exhaustive `stmt.kind` switches; `buildEntity` at 920 lines; `run` carries 45 prose-ordered passes (the class of issue GH #359 already named). ADR-336 (Q-1 a: keyword families; Q-2 b: no measurement phase; review 19/19). Parser left untouched deliberately. `docs/architecture/adrs/adr-336-chord-analyzer-structure.md`, GH #378.
- **stdlib**: lifecycle applied by hand across 42 actions (605 lines, `answering` drift); a validator pipeline duplicated with no caller; `pushing-original.ts` and `actions/removed/` dead; the documented six-file layout isn't real; 27 skipped tests. ADR-337 (Q-1 a: executor-owned lifecycle; multi-object per-item calls stay in five actions; review 19/19 after four folds, one of which added the ADR-228 D4 multi-object path the draft had missed). `docs/architecture/adrs/adr-337-stdlib-lifecycle-and-validator.md`, GH #379.
- **world-model**: `IWorldModel`/`WorldModel`/`AuthorModel` triple surface with 89 delegations; dead `extensions/` (1100 lines) plus `examples/` and a duplicate `IParser`; the character-model trait's 11 mutators; trait registration unpinned; 10 skips. ADR-338 (Q-1: keep `IWorldModel` — David's ruling, an earlier removal broke everything; Q-2 b: the trait is the recorded exception to behaviors-own-mutations; review caught D1's subclass approach as unsound — `WorldModel`'s registries are instance fields — rewritten to a proxy view). `docs/architecture/adrs/adr-338-world-model-surface-and-dead-subsystems.md`, GH #380.
- **character**: healthy (subsystem dirs, 0 skips, 600 passing); `tick-phases.ts` at 1641 lines holds the sub-step bodies; two sub-steps live in `stdlib`/`npc` instead. ADR-339 (Q-1 b: decay sub-step lands beside arbiter/pressure; review 19/19). `docs/architecture/adrs/adr-339-character-tick-sub-steps.md`, GH #381.
- **lang-en-us**: healthy — ~330 lines of unreferenced message tables, 4 stale text-service comments, 2 unreferenced types. Cleanup issue, no ADR: GH #382.
- **transcript-tester + branch-tester** (assessed as a pair): branch-tester's runner is a copy of transcript-tester's — 1,129 identical lines, 20 shared functions, 10 byte-identical, 8 diverged (the fork itself was ruled by ADR-307). ADR-340 (Q-1 a: transcript-tester owns the assertion core, branch-tester depends on it; review 19/19). `docs/architecture/adrs/adr-340-testing-assertion-core.md`, GH #383.
- **parser-en-us**: healthy — dead `tryMatchRule` (175 lines), six unreferenced exports, three skipped tests, two long methods noted. Cleanup issue, no ADR: GH #385.
- Session checkpoint (rule 16) at 03:34 CDT: no scope drift, no blockers, no orphaned artifacts. Two corrections recorded: commit `dc140a48b` (02:06 CDT, from outside this session) had already landed the port's Phase 5-8 work, so this session's tree carried only its own untracked files; `docs/work/refactoring-survey/assessment-20260907-umbrella.md` and `docs/proposals/code-documentation-sweep.md` were **not** written by this session.
- David: "let's stop for the night" (~03:40 CDT). Survey paused after parser-en-us, not finished.

## Key Decisions

### 1. Seven ADRs written and ACCEPTED the same night (ADR-334 through ADR-340)
Each targets a specific package's structural debt (turn-cycle ordering, module decomposition, exhaustive-switch discipline, lifecycle ownership, surface/dead-code cleanup, tick sub-step placement, and a shared test-assertion core). Every one carries a D-last ruling: implementation is its own plan on `main`, opened only after the Secret Letter port plan closes — nothing here is scheduled against this branch.

### 2. `IWorldModel` stays (ADR-338, David's ruling)
An earlier attempt to remove the interface broke everything; the ADR records this as settled rather than reopening it.

### 3. character-model trait is the recorded exception to behaviors-own-mutations (ADR-338)
Its 11 mutators are documented as a deliberate, named exception rather than folded into the general behavior pattern.

### 4. ADR-255 D2 stands — the alias catalog is hand-maintained (ADR-335)
Review caught the ADR-335 draft reversing this into a generator; the fold corrected it back to derivation, with the loader map as the one curated table and the chord side derived from it.

### 5. Deletions require David's confirmation before their phase
Every ADR that names dead code for removal (world-model's `extensions/`, stdlib's `pushing-original.ts` and `actions/removed/`, etc.) defers the actual deletion to implementation time, gated on David's sign-off per CLAUDE.md's no-delete-without-confirmation rule.

## Next Phase
- No plan phase changed. `docs/work/secret-letter-port/plan.md` Phases 4, 6, and 10 remain CURRENT, exactly where they were before this session.
- The refactoring survey's own next step (David's call, not scheduled): resume the package queue in Open Items, or move to implementing one of the seven ACCEPTED ADRs on `main` once the port plan closes.

## Open Items

### Short Term
- I-7f0471-2: Package-by-package refactoring survey (David: "one at a time") is paused, not finished. Remaining queue: devkit, platform-browser, if-domain, core, world-index, event-processor, channel-service, ide-protocol, media, helpers, plugin-state-machine, bridge, bootstrap, plugin-scheduler, queries, runtime, plugins, text-blocks, extensions/testing.

### Long Term
- I-7f0471-1: Implement ADR-334 (engine turn pipeline), ADR-335 (story-loader decomposition), ADR-336 (chord analyzer structure), ADR-337 (stdlib lifecycle/validator), ADR-338 (world-model surface/dead subsystems), ADR-339 (character tick sub-steps), ADR-340 (testing assertion core) — each ADR's D-last rules "not on this branch, not now"; needs its own plan on main after the Secret Letter port plan closes. All deletions named in the ADRs require David's confirmation before their phase.

## Files Modified

**New ADRs, all ACCEPTED** (7 files):
- `docs/architecture/adrs/adr-334-game-engine-turn-pipeline.md`
- `docs/architecture/adrs/adr-335-story-loader-decomposition.md`
- `docs/architecture/adrs/adr-336-chord-analyzer-structure.md`
- `docs/architecture/adrs/adr-337-stdlib-lifecycle-and-validator.md`
- `docs/architecture/adrs/adr-338-world-model-surface-and-dead-subsystems.md`
- `docs/architecture/adrs/adr-339-character-tick-sub-steps.md`
- `docs/architecture/adrs/adr-340-testing-assertion-core.md`

**Session record** (1 file):
- `docs/context/session-20260907-0123-feat-secret-letter-port.md` (this file)

No `packages/` or `stories/` source was edited this session — the assessments were read-only (file reads, `git log`, and package test runs used only to confirm baseline health, not to change anything).

## Notes

**Session duration**: ~2.5 hours (01:14-03:40 CDT).

**Approach**: read one package at a time (engine → story-loader → chord → stdlib → world-model → character → lang-en-us → transcript-tester/branch-tester → parser-en-us), producing an ADR where the debt was structural and a plain cleanup issue where it wasn't, running `adr-review` on every ADR before ACCEPT.

**All seven ADRs and this session file are still untracked** — David did not ask for a commit tonight. A future session reading `git log` alone will see none of this work until it is committed; this summary is the only durable record until then.

**Concurrent-session collision on the open-items ledger**: a second, independently-running DevArch session (id `7f0471`, its own `.session-state-7f0471.json`, working `secret-letter-port` Phase 4) was active in this same repo tonight and had most recently written `docs/context/.active-session`. `devarch items open` resolves "the active session" from that pointer, not from this session's own id, so the two items minted above are stamped `I-7f0471-*` and `discoveredFrom.session: "7f0471"` even though the content is this session's (354dfe) finding. The ledger is append-only and per-developer, not per-session-scoped, so the statements are correctly attributed to David and the ids are what `devarch items list` actually returns — but the session-id portion of those ids does not point back to this session file. Flagging this as a tooling gap for concurrent same-repo sessions, not something this agent can repair (rule 6: never hand-edit the ledger).

---

## Session Metadata

- **Session**: 354dfe
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert — every changed file this session is a new, untracked document (7 ADRs + this summary); no source code, no plan, no proposal file was touched.

## Dependency/Prerequisite Check

- **Prerequisites met**: read access to `game-engine.ts` and each surveyed package at HEAD `6ad2faeba`; `git log` for churn signal; the `adr-interview` and `adr-review` skills; `gh` CLI for filing issues #376-#385.
- **Prerequisites discovered**: none blocking — no package was unreachable or required tooling that wasn't already available.

## Architectural Decisions

- ADR-334: engine turn cycle becomes an explicit ordered stage list, one platform-operation dispatcher; two dead January-2026 extractions (`PlatformOperationHandler`, `TurnEventProcessor`) are made live or removed; public `GameEngine` surface unchanged; every phase must land byte-identical on the Dungeo chain and the Secret Letter tree.
- ADR-335: story-loader's runtime sections split into thirteen modules; extension construction moves into the ADR-215 registry; the alias map stays derived from the hand-maintained loader table (ADR-255 D2 reaffirmed, not reversed).
- ADR-336: chord's `stmt.kind` switches become exhaustive; per-line entity builders replace `buildEntity`'s 920 lines; the 45-pass `run` pipeline gets a named pass list.
- ADR-337: stdlib's action lifecycle moves to executor ownership instead of hand-applied per-action code; one validator pipeline replaces the duplicate; dead files (`pushing-original.ts`, `actions/removed/`) and 27 skipped tests are named for cleanup; the ADR-228 D4 multi-object path is preserved in five actions.
- ADR-338: `AuthorModel` becomes a proxy view rather than a subclass (registries are `WorldModel` instance fields, so subclassing was unsound — caught in review); `IWorldModel` stays (David's ruling); the character-model trait is the recorded exception to behaviors-own-mutations; trait registration gets pinned; dead `extensions/`/`examples/`/duplicate `IParser` named for removal.
- ADR-339: character's tick sub-steps move beside the existing subsystems (arbiter, pressure, and now decay); the two sub-steps currently living in stdlib/npc come home to character.
- ADR-340: transcript-tester becomes the one assertion core; branch-tester depends on it instead of carrying a 1,129-line duplicate runner (the original fork already ruled acceptable by ADR-307).
- Pattern applied throughout: every ADR's D-last defers implementation to "its own plan on main after the port closes" — consistent with the standing project direction that platform changes are discussed and scheduled separately from the Secret Letter port branch.

## Mutation Audit

- Files with state-changing logic modified: none — this session wrote ADRs and one session summary only.
- Tests verify actual state mutations: N/A (no code changed).
- If NO: N/A

## Recurrence Check

- Similar to past issue? NO — no blocker was hit this session (the concurrent-session ledger-id collision noted above is a tooling observation, not a session blocker, and Status stayed COMPLETE).

## Test Coverage Delta

- Tests added: 0.
- Tests passing before/after: no test changes this session. Package test suites (`@sharpee/engine`, `@sharpee/story-loader`, `@sharpee/chord`, `@sharpee/stdlib`, `@sharpee/world-model`, `@sharpee/character`) were run read-only during assessment (all passed, per the session event log) to confirm baseline health before writing each ADR — not to add or change coverage.
- Known untested areas: N/A — no new code this session.

---

**Progressive update**: Session completed 2026-09-07 03:40 CDT
