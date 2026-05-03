# Plan: ADR-163 Phase 3 — CLI Surface Migration (AC-13 Test Gate)

**Date**: 2026-05-01
**Branch**: main
**ADR**: ADR-163 (Channel-Service Platform)
**Master plan**: `plan-20260501-adr-163-platform.md` (Phase 3)
**Phase tier**: Medium (~250 tool calls)

---

## Goal

Retire `text-service`'s wire-producing role in the CLI consumer path. The CLI bundle (`dist/cli/sharpee.js`) constructs a `HelloPacket`, calls `produceCmgtManifest` once, and routes each turn through `produceTurnPacket` instead of consuming `text-service.renderToString` output directly.

`text-service` continues to live inside the engine and produce `ITextBlock[]` per turn — Pattern B. Engine remains unchanged. The CLI consumer wraps text-service output with channel-service.

---

## Acceptance Criteria

- **AC-13** (real-path CLI bundle test): a fixed Dungeo command sequence run through `node dist/cli/sharpee.js --test` produces `main`-channel content matching expected values from a baseline.
- **Regression gate**: `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` produces at least one fully passing run before AND at least one fully passing run after the migration. The chain is RNG-flaky by design (combat, NPC movement); GREEN means "any of N runs passed," not strict equality.
- **No engine edits**: `packages/engine/src/game-engine.ts` and the rest of `packages/engine/` are untouched in this phase.
- **No browser edits**: `packages/platform-browser/` continues to consume `renderToString` (deferred to Phase 4).
- **No transcript-tester edits**: `packages/transcript-tester/`'s internal `renderToString` calls are not on the AC-13 path and stay until Phase 4.
- **`cli-platform.ts` out of scope**: `packages/platforms/cli-en-us/src/cli-platform.ts` is not edited; one-line note in plan documents its status.

---

## Architectural Decisions (Locked)

1. **Pattern B** — channel-service runs in the CLI consumer, not inside the engine. Engine still emits blocks via `text:output`/`turn:complete`; CLI wraps them.
2. **Hook = `turn:complete`** — `TurnResult` carries `result.blocks` (text-service output) and `result.events` (full turn event list) together. This is the single subscription that feeds `produceTurnPacket`. The existing `text:output` listener for stdout writes is replaced.
3. **CLI HelloPacket capabilities** (corrected per Step 1 — `ClientCapabilities` has 16 boolean fields):
   ```ts
   {
     text: true,
     images: false, animations: false, video: false,
     sound: false, music: false, speech: false,
     splitPane: false, statusBar: false, sidebar: false,
     clickableText: false, clickableImage: false, dragDrop: false,
     transitions: false, layers: false, customFonts: false,
   }
   ```
4. **`--chain` registry behavior**: `resetSession()` is called once at game-construction time (per process), never between transcripts in `--chain` mode. State continuity is the whole point of `--chain`. Restart (`--play` `RESTART`) reuses the same session — re-registration of the same channels and rules is idempotent under the current registry. *Verification step in Step 1 below.*
5. **`cli-platform.ts` out of scope**: not on the AC-13 path; revisit (delete or migrate) in a future phase.
6. **No new tests in `packages/text-service/`** — Phase 3 does not retire text-service's *block-production* role, only its CLI wire role. `text-service`'s existing tests remain valid.

---

## Files to Change

| File | Change |
|------|--------|
| `scripts/bundle-entry.js` | Add `require('../packages/channel-service/dist/index.js')` to the exports merge (after line 27). In `loadStoryAndCreateGame()` after `engine.start()`: call `resetSession()`, `registerHello(CLI_CAPABILITIES)`, `registerStandardChannels()`, `registerPlatformRules()`, `produceCmgtManifest()`. In `runInteractiveMode()` and the `--test` branches: replace the `engine.on('text:output', ...)` block-stringification with a `engine.on('turn:complete', ...)` handler that calls `produceTurnPacket({ textBlocks: result.blocks, events: result.events })` and writes `main`-channel content to stdout. |
| `packages/text-service/src/index.ts` | Add a header comment marking `renderToString` as deprecated for wire production (kept for browser/transcript-tester until Phase 4). No functional change. |
| `packages/channel-service/tests/ac-13-cli-real-path.test.ts` | New file. Spawns `node dist/cli/sharpee.js --test <fixture>` as a child process, captures stdout, asserts on output. Real-path test against the production bundle. |
| `docs/work/channel-io-unification/plan-20260501-adr-163-platform.md` | Update Phase 3 status DONE; Phase 4 status CURRENT. |

**Files NOT changed** (out of scope, confirmed):
- `packages/engine/src/game-engine.ts` — engine continues to call text-service
- `packages/platforms/cli-en-us/src/cli-platform.ts` — dead path relative to bundle-entry.js
- `packages/transcript-tester/src/story-loader.ts` — internal harness, not on AC-13 path
- `packages/platform-browser/src/BrowserClient.ts` — Phase 4

---

## Behavior Statements

### `bundle-entry.js :: setupChannelService(engine)` (new helper)

- **DOES**: After `engine.start()`, calls `resetSession()`, then `registerHello(CLI_CAPABILITIES)`, `registerStandardChannels()`, `registerPlatformRules()` to populate the channel-service session for this process. Calls `produceCmgtManifest()` once and discards the return value (CLI does not consume the manifest; capability filtering happens at registration).
- **WHEN**: Called once per game-construction event (initial `loadStoryAndCreateGame`, and on `RESTART` in `--play` mode).
- **BECAUSE**: ADR-163 requires hello-then-cmgt-then-turn protocol order. The CLI declares its capabilities so media channels (gated on `images`/`sound`/etc.) are filtered out of routing, leaving `main`/`location`/`score`/`turn` active.
- **REJECTS WHEN**: `registerHello` may throw if called twice without `resetSession`; we explicitly reset first to be safe.

### `bundle-entry.js :: handleTurnComplete(result, outputBuffer)` (new handler)

- **DOES**: Calls `produceTurnPacket({ textBlocks: result.blocks, events: result.events })`, extracts the `main` channel from `packet.channels.main`, flattens it to a string, and pushes the string into `outputBuffer`.
- **WHEN**: Fires on each engine `turn:complete` event after the CLI is wired to channel-service.
- **BECAUSE**: ADR-163 §1 makes `produceTurnPacket` the single wire-producing call per turn. CLI is text-only, so only `main` is rendered to stdout; `location`/`score`/`turn` are present in the packet but the CLI ignores them (status-bar wiring is non-wire UX, deferred).
- **REJECTS WHEN**: If the manifest is not frozen (no prior `produceCmgtManifest` call), the producer throws. Our setup helper guarantees order, so this should never fire in practice; if it does, it's a bug in the setup helper, not a runtime condition to handle.

---

## Integration Reality Statement

**Phase 3: CLI surface migration**

- **OWNED**: `dist/cli/sharpee.js` (the bundle this repo produces); `packages/channel-service/dist/index.js` (this repo's package consumed by the bundle); `packages/text-service/dist/index.js` (still consumed by the bundle for block production).
- **EXTERNAL**: None — Phase 3 has no third-party APIs or services.
- **REAL-PATH TEST**: `packages/channel-service/tests/ac-13-cli-real-path.test.ts` spawns `node dist/cli/sharpee.js --test <transcript>` as a child process and asserts on captured stdout. No injection, no override, no stub — runs the production bundle exactly as a user would.
- **STUB JUSTIFICATION**: None. AC-13 is the gate; no stubs of owned dependencies are introduced.

The phase name contains *migration*; per rule 12a, at least one REAL-PATH TEST must execute against the production code path. AC-13 satisfies this.

---

## Sub-Steps (Sequential, Each Graded Before Moving On)

### Step 0: Capture pre-migration baseline (gate)

1. Build current bundle if source is newer: `./build.sh -s dungeo` (skip if bundle is current).
2. Run full Dungeo walkthrough chain: `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`. **The chain is RNG-flaky** — re-run until at least one fully passing run is observed.
3. **Gate**: at least one green run must occur within ~5 attempts. If 5 consecutive runs all show failures, the baseline is broken; **stop and report**.

### Step 1: Verify channel-service API and idempotency assumptions

1. Read `packages/channel-service/src/registry.ts` to confirm: (a) `registerHello` after `resetSession` succeeds; (b) `registerStandardChannels` followed by `registerPlatformRules` is the correct order; (c) calling these twice without `resetSession` either fails or is idempotent — match the actual behavior to the plan.
2. Read `produceTurnPacket`'s return type to confirm the exact shape of `packet.channels.main` (array of strings? `TextContent[]`? need to know how to flatten).
3. **Output**: brief notes amended to this plan if the API differs from assumed. No code changes yet.

### Step 2: Add channel-service to the bundle exports

1. Edit `scripts/bundle-entry.js`: add one line after line 27, `...require('../packages/channel-service/dist/index.js'),`.
2. Rebuild bundle: `./build.sh --skip text-service -s dungeo` (channel-service already built; we just need bundle-entry re-bundled). Confirm bundle still loads (`node -e "require('./dist/cli/sharpee.js')"` exits 0).
3. **Verify**: pre-migration baseline still passes. No CLI behavior change yet.

### Step 3: Wire `setupChannelService` and `handleTurnComplete` (the migration itself)

1. In `bundle-entry.js loadStoryAndCreateGame()`, after `engine.start()`, call the `setupChannelService(engine)` helper.
2. In `runInteractiveMode()`: replace the `engine.on('text:output', (blocks) => outputBuffer.push(exports.renderToString(blocks)))` with `engine.on('turn:complete', (result) => handleTurnComplete(result, outputBuffer))`.
3. In `--test`/`--chain` branches (lines around 632-695): same replacement.
4. Rebuild bundle.
5. **Smoke test**: `node dist/cli/sharpee.js --play` — type `look` once, confirm output appears on stdout (any content; we're checking the wiring, not parity yet).

### Step 4: Run the regression gate

1. `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript --stop-on-failure`.
2. **Compare** against Step 0's baseline. Output should be identical (same `main`-channel content as text-service's `renderToString` produced).
3. **If outputs diverge**: investigate the divergence. Likely candidates: (a) `appendPromptBlock` content not routed to `main`; (b) decoration/ANSI handling differences; (c) blocks with empty content emitted spuriously. Fix in `bundle-entry.js`'s `handleTurnComplete` (e.g., re-applying terminal-only decorations after channel extraction). Do NOT modify text-service or engine.
4. **Gate**: walkthrough chain must pass. If it does not, halt the phase and report.

### Step 5: Write AC-13 real-path test

1. Create `packages/channel-service/tests/ac-13-cli-real-path.test.ts`.
2. Test fixture: a deterministic Dungeo transcript (likely `wt-01-get-torch-early.transcript` — the simplest, no combat RNG).
3. Test body: spawn child process with `child_process.spawn('node', ['dist/cli/sharpee.js', '--test', '<fixture-path>'])`, capture stdout, parse the test result line, assert pass.
4. Optionally also assert on a snippet of `main`-channel content (e.g., the opening room description) to lock the wire format down.
5. Run: `pnpm --filter '@sharpee/channel-service' test ac-13`. **Grade GREEN** before proceeding (asserts on actual stdout from a child process; not a stub).

### Step 6: Mark text-service `renderToString` deprecated for wire

1. Edit `packages/text-service/src/index.ts` header comment: add a note that `renderToString` is **deprecated for wire production** (still used by browser/transcript-tester pending Phase 4). No code change.

### Step 7: Update master plan and write session summary

1. Edit `docs/work/channel-io-unification/plan-20260501-adr-163-platform.md`: Phase 3 → DONE; Phase 4 → CURRENT.
2. Update session summary with Phase 3 deliverables and decisions.

---

## Test Strategy

**Three test layers, in order of trust:**

1. **Pre-migration baseline (Step 0)** — establishes that the walkthrough chain is green BEFORE any change. Without this, "regression" has no meaning.
2. **Regression gate (Step 4)** — full walkthrough chain through the bundle after migration. This is where parity is proven.
3. **AC-13 real-path test (Step 5)** — automated, repeatable, runs in CI; locks down the production-bundle path so future regressions surface immediately.

**Out of scope:**
- Unit tests for `bundle-entry.js` helpers — bundle-entry is a script, not a package; AC-13 covers it end-to-end.
- Tests for non-wire text-service surface (ANSI, cursor, `renderStatusLine`) — unchanged in this phase.

---

## Rollback Plan

All edits are additive in `bundle-entry.js`. Rollback is one revert of the bundle-entry edits + a rebuild. text-service header comment can stay or be reverted independently. No engine edits to revert. No data migrations. **Rollback safety: safe to revert at any sub-step.**

---

## Open Risks (with Step 1 resolutions)

1. **~~`appendPromptBlock` routing~~ — RESOLVED**: platform rules route prompt blocks to a dedicated `prompt` channel (replace mode), separate from `main`. Prompts are not lost. CLI may render the prompt channel separately or ignore it (readline does its own `> ` prompt).
2. **Empty `main` on meta-commands** — `main` is `emit:'always'`; payload always contains `main` key. In append mode, an empty turn produces `[]`. CLI guards against empty-flattened-string before stdout write.
3. **Decoration handling** — `extract: 'content'` preserves `TextContent[]` with decorations; `flattenContent()` strips them to plain string. CLI uses `flattenContent` and loses ANSI color. Documented trade-off: CLI is plain text in Phase 3; color/decorations are a Phase 4+ terminal-only concern. If regression test fails because the test harness expected ANSI codes, escalate.
4. **`--chain` reset semantics — RESOLVED**: chain runs through one engine instance; `setupChannelService` runs once at game construction; `resetSession()` is not called between transcripts. RESTART (interactive) is a separate concern: if `--play` RESTART triggers, the engine reinitializes — channel-service would need `resetSession()` + re-register. Phase 3 does not handle interactive RESTART; if AC-13 doesn't exercise it, defer to a follow-up.
5. **`registerHello` is NOT idempotent** (Step 1 finding) — throws on second call without `resetSession`. Setup helper must `resetSession()` first. The plan's setup order: `resetSession()` → `registerHello()` → `registerStandardChannels()` → `registerPlatformRules()` → `produceCmgtManifest()`.

---

## Status

- **Status**: DRAFT — awaiting user approval before Step 0
- **Prerequisites met**: Phase 1 and Phase 2 complete; channel-service builds and ships 109 passing tests; bundle infrastructure in place
- **Estimated tool calls**: ~150-200 (well under the 250 budget)
