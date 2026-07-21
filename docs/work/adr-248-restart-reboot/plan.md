# Session Plan: ADR-248 — RESTART delegates through platform events (client reboot, not in-place rebuild)

**Created**: 2026-07-20
**Overall scope**: Delete the engine's in-place `restartGame()` rebuild and its undocumented `initializeWorld` re-entrancy contract; make RESTART symmetric with QUIT (hook → ack via final packet → `stop('restart')` → client-owned reboot). Move every TS story to a factory-only export contract (`createStory(): Story`), migrate platform-browser and the CLI/transcript-tester harness to reboot on restart, and land the two acceptance transcripts (fernhill Chord path, dungeo TS path) plus three required boundary tests. All decisions are David-ruled and ACCEPTED in ADR-248 — this plan sequences and scopes the work, it does not re-litigate any contract.
**Bounded contexts touched**: N/A — infrastructure/platform-lifecycle work (engine turn/stop cycle, client boot sequencing, story module contract, test harness). No domain modeling; no `docs/ddd/notation.yaml` in this repo.
**Key domain language**: N/A (platform lifecycle terms only — RESTART_REQUESTED, restart_completed, stop reason, boot, reboot — not business/domain vocabulary).

## References consulted
- `docs/architecture/adrs/adr-248-restart-via-platform-events.md` — ACCEPTED, fully specified; this plan implements its 5 decisions and must not alter the contracts (no pre-emptive `restart_completed(true)`, autosave deleted immediately on confirm before reboot, factory-only story export, harness reboot support in scope).
- `docs/architecture/adrs/adr-035-platform-event-architecture.md` — established the hook → post-turn processing → completion-event pattern that ADR-248 extends to RESTART; platform operations are queued during the turn and processed after world-model changes complete, before the text service renders — the ack/stop sequencing in Phase 1 must respect this ordering.
- `docs/context/project-profile.md` — confirms exactly 7 in-repo TS/Chord stories under `stories/*` (armoured, channel-service-test, cloak-of-darkness, concealment-test, dungeo, friendly-zoo, thealderman) and that TypeScript strict mode + CommonJS + `./repokit`/`./sharpee` build split (ADR-187) govern how each phase must build cleanly; no backward-compat convention (uniform lockstep versioning, "we don't care about backward compatibility") supports deleting named/default story exports outright rather than dual-exporting.
- `docs/context/session-20260720-1730-chord-foundations.md` — most recent session's Open Items: "Restart fix — proposal awaiting David's go-ahead" (now superseded/resolved by ADR-248, this plan is that go-ahead) and "piped-REPL probe showed dungeo `restart` printing nothing — verify during restart-fix work (may be a pipe artifact)" — carried into Phase 5's verification checklist per ADR-248's own Consequences note.

## Overall design decisions this plan makes (ADR leaves the "how", not the "what" — see ADR-248 lines noting the plan must decide the seam)

1. **Boot-callback seam (platform-browser)**: `BrowserClientConfig` gains an optional `reboot: () => Promise<void>` callback. Each story's `browser-entry.ts` passes its own top-level `start` function (a hoisted function declaration, safe to reference before its textual definition) as `reboot` when constructing `BrowserClient`. `BrowserClient` does not re-run its own `initialize()` (DOM element wiring is idempotent but unnecessary to repeat) — `start()` re-creates `world`/`parser`/`engine`, calls `client.connectEngine(engine, world)` again, and re-invokes `client.start()`, which takes the new-game branch because the autosave envelope was already deleted at confirm time. Recommendation: this is the smallest seam — no new client subclass, no dependency inversion, reuses the exact function every story already has.
2. **Deferred reboot timing**: `onRestartRequested` (the hook itself) only returns `true`/`false` and — on confirm — synchronously deletes the autosave envelope (decision 2 of the ADR requires this to happen "the moment restart is confirmed, before the reboot," not after the turn finishes). The actual dispose+reboot cannot run inside the hook, because the hook fires mid-turn (before the final ack packet is flushed) — running the reboot there would tear down the engine that still owes the player the "The story restarts." packet. Recommendation: `BrowserClient` sets a private `pendingReboot` flag inside the hook on confirm; `executeCommand()`'s existing `await this.engine.executeTurn(command)` is the natural "turn completion" point — after it resolves, if `pendingReboot` is set, clear the flag and invoke `this.disposeAndReboot()` (dispose the old engine's listeners, call `config.reboot()`). This keeps the sequencing entirely inside `executeCommand`, the one place that already awaits full turn completion.
3. **Harness reboot-on-restart**: `LoadedGame` (bootstrap) gains an internal `onRestartRequested` hook registered via `engine.registerSaveRestoreHooks(...)` at `assembleGame()` time, auto-confirming (mirrors "no hook = auto-confirm" today) but performing a real reboot: after the current `executeTurn()` promise resolves in `executeCommand`, if a restart was confirmed this turn, purge the story module cache, re-`require` the story module, call `createStory()`, and re-run the same world/parser/engine/story wiring `assembleGame` does today — reassigning `LoadedGame.engine`/`.world` in place and re-attaching the `channel:packet`/`event` listeners so the existing object reference the runner holds keeps working. This mirrors the `reviveEngine()` pattern already on `LoadedGame` (session 17e36e) rather than inventing a new shape.
4. **Story migration scope**: all 7 in-repo stories (armoured, channel-service-test, cloak-of-darkness, concealment-test, dungeo, friendly-zoo, thealderman) migrate to `createStory(): Story` in Phase 2, not just the two ADR calls out by name — `./repokit build` builds every in-repo story and bootstrap's `loadStory()` contract change is global, so an unmigrated story is a broken build, not an out-of-scope story.

## Phases

### Phase 1: Engine — delete in-place restart rebuild, delegate through stop('restart')
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: N/A (platform lifecycle — turn/stop cycle in `packages/engine`)
- **Entry state**: Repo builds clean on `chord-foundations`; ADR-248 ACCEPTED; no code changes yet.
- **Deliverable**:
  - `packages/engine/src/game-engine.ts`: delete `restartGame()` (~891) and its reset list; add `'restart'` to the `stop()` reason union (~839); at both call sites (`processMetaPlatformOperation` ~1568-1584, `processPlatformOperations` ~2447) — on confirm, remove the `await this.restartGame()` call and the pre-emptive `completionEvents.push(createRestartCompletedEvent(true))` / `createRestartCompletedEvent(true)` emission, replace with `this.stop('restart')` sequenced so the "The story restarts." (`game_restarting`) message already produced by the restarting action's normal report path is the final packet content before stop's game-ending events fire; declined path keeps emitting `restart_completed(false)` unchanged.
  - Remove/update the stale `restartGame() teardown` comment at ~818 and any other reference to the deleted re-entrancy contract.
  - Update `packages/engine/tests/platform-operations.test.ts` and `packages/engine/tests/unit/engine-resume.test.ts` (both currently reference `restartGame`/`RESTART_REQUESTED`/`restart_completed`) to assert the new behavior instead of the deleted one.
  - New/updated unit tests: (a) confirmed restart → `stop('restart')` called, no pre-emptive `restart_completed(true)` emitted, ack message present in the final packet; (b) declined restart → world untouched, `restart_completed(false)` emitted, engine keeps running.
- **Exit state**: `pnpm --filter '@sharpee/engine' test` green; `restartGame` no longer exists anywhere in `packages/engine/src`; `./repokit build --skip <unaffected packages>` (or a full `./repokit build`) succeeds. Downstream packages (platform-browser, bootstrap) will not yet compile against the new contract — that's Phases 2-4's job, so this phase's exit gate is engine-package-local green, not full-monorepo green.
- **Status**: COMPLETE

### Phase 2: Story export contract — factory-only migration across all 7 in-repo stories
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: N/A (module/export contract, not domain modeling)
- **Entry state**: Phase 1 complete; engine package green.
- **Deliverable**:
  - `packages/engine/src/story.ts` — no interface shape change needed (`Story.config` already required per line 180), but its doc comments/examples updated to show the factory pattern as the sole story-module contract.
  - Migrate all 7 stories to `export function createStory(): Story { ... }` as the sole story export, deleting `export const story`, `export const config`, and `export default`:
    - `stories/dungeo/src/index.ts` — additionally move the module-level daemon `let`s (`stories/dungeo/src/scheduler/troll-daemon.ts` `trollId`/`trollRoomId`/`recoveryAcc`, `sword-glow-daemon.ts` `currentGlowLevel`/`swordId`/`playerId`, `balloon-daemon.ts` `lastFireTurn`/`balloonEntityId`/`receptacleEntityId`, `handlers/balloon-handler.ts` `balloonEntityId`/`receptacleEntityId`, `forest-daemon.ts` `forestRoomIds`) into `DungeoStory` instance fields or closures created fresh inside `initializeWorld`/`onEngineReady`, since a fresh `createStory()` call must not read stale module-level state from a prior instance.
    - `stories/cloak-of-darkness/src/index.ts`, `stories/friendly-zoo/src/index.ts`, `stories/armoured/src/index.ts`, `stories/channel-service-test/src/index.ts` (currently re-exports `story`/`config` from `./playable-story` — trace through and factory-ize the underlying module), `stories/concealment-test/src/index.ts`, `stories/thealderman/src/index.ts`.
  - `packages/bootstrap/src/index.ts` `loadStory()`: replace `const story = storyModule.story || storyModule.default;` with `const story = storyModule.createStory();` (throw a clear error if `createStory` is missing/not a function, replacing today's `does not export 'story' or 'default'` message).
  - `packages/devkit/templates/story/index.ts.template`, `packages/devkit/templates/story-chord/story.story.template` (if it references named exports) — regenerate to the factory pattern so newly-scaffolded stories are compliant from creation.
  - Audit and update every devkit consumer of `storyModule.story`/`.default` found in `packages/devkit/src/standalone/{author-game,build,build-browser,init,init-browser}.ts`, `packages/devkit/src/commands/{play,compose}.ts`, and any CLI entry point that resolves a story module directly (grep `\.story\b` / `storyModule\.` across `packages/devkit/src` and `packages/cli` — the search in this planning session found candidate files but not every call site; treat the audit itself as part of this phase's deliverable, not assumed complete).
- **Exit state**: Every story under `stories/*` exports only `createStory`; `bootstrap.loadStory()` and every devkit/CLI story-loading path call `createStory()`; `./repokit build` (all in-repo stories) succeeds; existing per-story unit/transcript suites for dungeo, cloak-of-darkness, friendly-zoo still pass (no behavior change expected — this phase is a pure export-shape + state-locality refactor, not a gameplay change). `./sharpee verify` or equivalent for devkit templates confirms scaffolded stories still build.
- **Status**: COMPLETE

### Phase 3: platform-browser — client-owned reboot
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: N/A (client lifecycle in `packages/platform-browser`)
- **Entry state**: Phases 1-2 complete; engine emits `stop('restart')` with no pre-emptive completion event; all TS stories export `createStory()`.
- **Deliverable**:
  - `packages/platform-browser/src/types.ts` (or wherever `BrowserClientConfig` lives): add optional `reboot?: () => Promise<void>`.
  - `packages/platform-browser/src/BrowserClient.ts`:
    - `getSaveRestoreHooks().onRestartRequested`: on confirm, delete the autosave envelope immediately (`this.saveManager.clearAutosave()`), return `true` — do NOT call `window.location.reload()` anymore (design decision 1/2 above); set the deferred-reboot flag instead of acting synchronously.
    - `executeCommand()`: after `await this.engine.executeTurn(command)` resolves, check the deferred-reboot flag; if set, dispose the current engine's listeners and invoke `this.config.reboot?.()`. If `reboot` is not configured, fall back to the previous `window.location.reload()` behavior (safety net for any consumer that hasn't wired the callback yet) — but every in-repo story wires it in this phase, so the fallback should never fire in practice.
    - Failed-reboot path: if `config.reboot()` throws (or the promise rejects), display the real error text via `this.textDisplay.displayText(...)` — no parse-failure masking, per ADR decision 4.
  - Update each story's `browser-entry.ts` (`stories/dungeo/src/browser-entry.ts`, `stories/cloak-of-darkness/src/browser-entry.ts`, `stories/fernhill/src/browser-entry.ts`) and `packages/devkit/templates/browser/{browser-entry.ts.template,chord-browser-entry.ts.template}` to pass `reboot: start` in the `BrowserClient` constructor config, and to update `import { story, config } from './index'` → `import { createStory } from './index'` / `const story = createStory();` inside `start()` for the TS-template path (the Chord templates already call `createStory` from `@sharpee/story-loader`, unaffected).
  - New/updated tests: (a) autosave envelope gone immediately after confirm, before reboot completes (unit test against `SaveManager`/`BrowserClient` with a fake `reboot` callback that never resolves, asserting the envelope is already cleared); (b) declined restart leaves world intact, `restart_completed(false)` observed, no `reboot` call; (c) `reboot` callback throws → `displayText` receives the real error text, not a parse-fallback string.
- **Exit state**: `pnpm --filter '@sharpee/platform-browser' test` green; dungeo/cloak-of-darkness/fernhill browser bundles build (`./repokit build dungeo --browser`, spot-check the others per budget); no `window.location.reload()` in the confirm path.
- **Status**: COMPLETE

### Phase 4: Harness — reboot-on-restart for the CLI/transcript-tester
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: N/A (test harness in `packages/bootstrap`, `packages/transcript-tester`)
- **Entry state**: Phases 1-3 complete; engine/browser reboot pattern proven.
- **Deliverable**:
  - `packages/bootstrap/src/index.ts`: `assembleGame()`/`loadStory()` register an `onRestartRequested` hook (auto-confirm, matching today's "no hook = auto-confirm" harness semantics) that, after the in-flight `executeTurn()` resolves, purges the story module cache (`purgeStoryModuleCache`), re-resolves and re-`require`s the story module, calls `createStory()`, and rebuilds world/parser/engine exactly as `assembleGame` does today — reassigning the existing `LoadedGame.engine`/`.world` fields in place (not returning a new object) so `runner.ts` and any transcript-chain caller keep the same reference. Re-attach `channel:packet`/`event` listeners to the new engine.
  - `packages/transcript-tester/src/runner.ts` (and `story-loader.ts` if it owns engine lifecycle instead): confirm the runner doesn't hold a stale local `engine`/`world` binding that would bypass the reassigned `LoadedGame.engine` — audit and fix if it does.
  - No transcript syntax changes needed for a bare `restart` command followed by `yes`/confirmation input — reuse the existing platform-op confirmation flow already used by `quit`.
- **Exit state**: A hand-written smoke transcript issuing `restart` against dungeo (or fernhill) and then `look` runs via `node dist/cli/sharpee.js --test` and shows the fresh-boot opening banner, proving the harness reboot works before Phase 5 commits the two acceptance transcripts.
- **Status**: COMPLETE

### Phase 5: Acceptance transcripts + full verification
- **Tier**: Small
- **Budget**: 100 tool calls
- **Domain focus**: N/A (test authoring + verification run, no new production code expected)
- **Entry state**: Phases 1-4 complete; harness reboot proven via smoke test.
- **Deliverable**:
  - `stories/fernhill/tests/transcripts/restart.transcript` (or `walkthroughs/`, matching existing fernhill test conventions) — Chord path acceptance test: `restart` → confirm → opening banner renders → `look` works. This is the exact fernhill repro case from the superseded proposal (`assignRoom: room 'r01' not found`) — must now pass because the ChordStory rebuild path is gone entirely (client reboots, story-loader builds fresh from IR each time).
  - `stories/dungeo/tests/transcripts/restart.transcript` — TS path acceptance test, per CLAUDE.md dungeo conventions (no `$teleport`, real navigation, `[ENSURES:]`/`[OK:]` assertions as needed).
  - Re-check the piped-REPL observation from `docs/context/session-20260720-1730-chord-foundations.md` ("dungeo `restart` printing nothing") against the new flow — confirm it was a pipe artifact or fix it if it's real.
  - Full verification pass (never auto-retry on failure — report and wait per CLAUDE.md):
    - `./repokit build` (full platform + all in-repo stories) — must be clean.
    - `node dist/cli/sharpee.js --test stories/fernhill/tests/transcripts/restart.transcript` and the new dungeo restart transcript.
    - `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript --stop-on-failure` — one good run (thief/combat RNG flakes are not regressions per the one-good-run rule; a deterministic unit suite is still required).
    - Full 112-transcript dungeo batch (per session 17e36e's batch-transcript lifecycle fix) — confirm it stays deterministically green with the new restart path in the mix.
    - `pnpm --filter '@sharpee/engine' test`, `--filter '@sharpee/platform-browser' test`, `--filter '@sharpee/bootstrap' test`, cloak-of-darkness + friendly-zoo transcript suites — all green.
- **Exit state**: Both acceptance transcripts pass; all three required boundary tests (Phase 1/3 deliverables) are green; full repokit build clean; batch dungeo suite deterministically green; ADR-248's Consequences checklist (re-entrancy trap eliminated, `restartGame` reset list gone, undo/plugin/channel/pronoun state resets for free, every client owns a restart handler, TS stories migrated, transcript coverage landed, piped-REPL observation resolved) can be checked off item-by-item in the work summary.
- **Status**: COMPLETE
