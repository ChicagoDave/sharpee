# Session Summary: 2026-04-28 - fix/save-restore-roundtrip (CST)

## Goals

- Fix the platform-wide save/restore bug described in `docs/work/save-restore/2026-04-28-platform-save-restore-bug.md`
- Write failing round-trip tests first, then fix the engine so all pass
- Fix platform-browser's independent (also broken) save format
- Verify multi-user sandbox propagates the engine fix automatically
- Leave the branch uncommitted for a finalize commit + push immediately after this summary

## Phase Context

- **Plan**: No active plan for this branch — work was fully scoped by the PRE-fix briefing doc at `docs/work/save-restore/2026-04-28-platform-save-restore-bug.md`
- **Phase executed**: Single focused fix session; all open questions from the briefing resolved and implemented
- **Tool calls used**: Not tracked in .session-state.json
- **Phase outcome**: Completed on budget; all 10 round-trip tests green, both platform-browser and engine clean

## Completed

### 1. Open-Questions Resolution (Pre-Implementation)

Resolved every open question from the PRE-fix briefing before writing code:

- **Backward-compat**: Hard-break. Version `1.0.0` → `2.0.0`; v1 saves rejected with a clear error. Rationale: v1 blobs were already broken — writing a v1 reader would have produced restores that silently drop score, capabilities, and state values.
- **Test scope**: Engine round-trip tests + per-host integration tests for CLI and multi-user. Platform-browser wiring verified by composition. Zifmia deferred (it routes through the engine; the engine fix propagates without additional test surface).
- **Save blob compression**: Add gzip at the engine boundary using `fflate` (~30 KB universal sync gzip). `node:zlib` is sync but not browser-portable; native `CompressionStream` is async (would force every save path async); `fflate` is sync + universal + small.
- **`spatialIndex` removal**: Drop the engine's *save-format helpers* (`serializeSpatialIndex`, `deserializeSpatialIndex`, `extractConnections`, `serializeTrait`, `deserializeTrait`) — ~270 lines of broken serializer. The runtime `SpatialIndex` class in `@sharpee/world-model` is untouched (see Key Decisions section).

### 2. Round-Trip Tests — 10 Tests Written (7 RED, 3 GREEN on first run)

New file: `packages/engine/tests/save-restore-roundtrip.test.ts`

Behavior Statement governing all tests:

> **`createSaveData` + `loadSaveData` round-trip**
> DOES: captures the world's full runtime state in a save blob and restores it exactly so post-restore queries return the same answers as pre-save queries.
> WHEN: a host calls `createSaveData(provider)` on a populated world, then later constructs a fresh provider with a fresh `WorldModel` and calls `loadSaveData(saveData, freshProvider)`.
> BECAUSE: every Sharpee host routes saves through this service; anything the service drops is silently lost for every player on every story.

Tests written:

| # | Name | Status before fix |
|---|------|-------------------|
| 1 | Preserves ScoreLedger totals | RED |
| 2 | Preserves ScoreLedger entries + dedup invariant | RED |
| 3 | Preserves capability data | RED |
| 4 | Preserves world state values | RED |
| 5 | Preserves relationships | RED |
| 6 | Preserves entity traits + spatial containment (regression keeper) | GREEN |
| 7 | Preserves ID generation counters (no post-restore collisions) | RED |
| 8 | Preserves engine context — currentTurn + history (regression keeper) | GREEN |
| 9 | Rejects save blob with unsupported version string | GREEN |
| 10 | Rejects save blob whose storyConfig.id doesn't match | GREEN |

Discovery beyond the briefing: items inside containers (e.g., lamp inside box) were also lost. The briefing claimed entity-to-location survived; it survived only for items-in-rooms because `serializeSpatialIndex` filtered locations to room-typed entities. Items in container-type entities were silently dropped. Test 6 covers sub-container containment explicitly.

### 3. Engine Fix — `@sharpee/core` and `@sharpee/engine`

**`@sharpee/core` — type changes** (`packages/core/src/types/save-data.ts`):

- `IEngineState.spatialIndex: ISerializedSpatialIndex` removed; replaced by `worldSnapshot: string`
- Dropped 4 dead types: `ISerializedSpatialIndex`, `ISerializedEntity`, `ISerializedLocation`, `ISerializedRelationship`

**`@sharpee/engine` — `fflate` dependency**:

- Added `fflate` as a runtime dep on `@sharpee/engine`
- New helpers: `compressWorldSnapshot` (gzip + chunked btoa base64), `decompressWorldSnapshot` (atob + decompress)
- Base64 encoding is chunked to avoid `String.fromCharCode.apply` stack overflows on large blobs (~400 KB world snapshots)

**`packages/engine/src/save-restore-service.ts` — core rewrite**:

- `createSaveData`: now does `worldSnapshot: compressWorldSnapshot(world.toJSON())` instead of `spatialIndex: this.serializeSpatialIndex(world)`
- `loadSaveData`: now does `world.loadJSON(decompressWorldSnapshot(saveData.engineState.worldSnapshot))` before applying engine-side metadata
- `SAVE_FORMAT_VERSION` bumped `'1.0.0'` → `'2.0.0'`
- Dropped ~270 lines: `serializeSpatialIndex`, `deserializeSpatialIndex`, `extractConnections`, `serializeTrait`, `deserializeTrait`

**`packages/engine/src/game-engine.ts`**:

- Removed unused imports that referenced the dropped serializer helpers (line 41 cleanup)

**Test suite updates**:

- `packages/engine/tests/game-engine.test.ts` — version-string assert updated `'1.0.0'` → `'2.0.0'`
- `packages/engine/tests/platform-operations.test.ts` — mock v1 blob replaced with a `createSaveData()`-constructed fixture; version-string assert updated

Post-fix: 10/10 round-trip tests GREEN; full engine suite 186/186 (was 185/186 — net +1 from new suite plus the platform-operations test repair).

### 4. Platform-Browser Refactor — Replace Broken SaveManager

**Discovery**: platform-browser's `SaveManager` had its own broken save format (`v3.0.0-delta`, lz-string-compressed, locations + traits only), bypassing the engine entirely. The briefing assumed all hosts route through the engine — that was incorrect for platform-browser.

**`BrowserSaveEnvelope`** — new type replacing `BrowserSaveData`:

- Envelope version `4.0.0`
- Fields: `envelopeVersion`, `savedAt`, `slotName`, `score`, `transcriptHtml`, `engineSave: ISaveData` (the full engine save blob)

**`packages/platform-browser/src/managers/SaveManager.ts` — full rewrite**:

- Dropped: `captureBaseline`, `captureWorldState`, `captureDelta`, `shallowEqual`, `restoreWorldState` (~180 lines of the broken delta serializer)
- Added: `performSave(slotName, engineSave, context)` — stores a `BrowserSaveEnvelope` in localStorage
- Added: `loadEnvelope(slotName)` — reads and deserializes a `BrowserSaveEnvelope`
- Kept: index management, autosave slot, transcript capture/decompression, sync-to-world plumbing
- Added: `cleanupObsoleteSaves()` — called from constructor; walks localStorage for entries under the storage prefix, deletes any whose `envelopeVersion` doesn't match `4.0.0`, prunes the index. Idempotent; runs once per page load.

**`packages/platform-browser/src/BrowserClient.ts` — rewired save/restore paths**:

- Added `engineCreateSave()` / `engineApplySave()` private helpers (cast-to-private pattern mirroring the engine's own test pattern)
- Added `pendingEngineSave` field — stashes `data` on `onSaveRequested` so `performSave` reuses the engine-produced blob rather than calling `createSaveData` twice
- Added `runRestoreDialog()` helper — unifies menu and hook restore paths; applies the engine save BEFORE updating the UI (preserves the timing from the v3 code where `updateStatusLine` reads the post-restore world)
- Startup autosave-restore path rewritten to use the engine
- `BrowserSaveData` export renamed to `BrowserSaveEnvelope` in `packages/platform-browser/src/index.ts`

Typecheck and build clean after the rewrite.

### 5. Auto-Cleanup of Obsolete (v3) Saves

David flagged that pre-v4 blobs in localStorage should be auto-deleted on first load. `cleanupObsoleteSaves()` in the `SaveManager` constructor handles this: any localStorage entry under the storage prefix whose parsed `envelopeVersion` is absent or not `4.0.0` is deleted and removed from the slot index. Existing v3 blobs are cleaned silently.

### 6. Multi-User — Engine Fix Propagates Automatically

Multi-user sandbox at `tools/server/src/sandbox/deno-entry.ts` already uses the engine's hooks correctly:

- `onSaveRequested` captures `data` (the engine-produced save blob)
- `onRestoreRequested` returns `pendingRestoreData`

No code changes required. Verified: `pnpm exec vitest run tests/saves` 11/11; `SHARPEE_REAL_SANDBOX=1 vitest run tests/ws/save-restore.test.ts tests/sandbox/deno-engine-integration.test.ts` 13/13.

### 7. Feedback Memory — Save Format Versioning

David's end-of-session comment ("next time we will version the save files") was captured as:

`~/.claude/projects/-Users-david-repos-sharpee/memory/feedback_save_format_versioning.md`

The memory records: the v3 → v4 hard-break was a one-time justified exception (blobs already broken, player base small, David approved). Future save-format changes should add a version reader rather than another hard-break + cleanup cycle. The CLAUDE.md no-backcompat rule for server-managed state does not govern player-side localStorage saves.

## Key Decisions

### 1. `world.toJSON()` / `world.loadJSON()` as the Canonical Round-Trip

The engine's own `undo()` already used `world.toJSON()` / `world.loadJSON()` for full snapshot round-trips. `save-restore-service.ts` just extended this to the durable save path. This is the only path in the codebase that provably covers all world subsystems (ScoreLedger, capabilities, state values, relationships, ID counters, spatial graph). The broken `serializeSpatialIndex` path was a partial hand-written serializer that predated several of those subsystems and was never updated.

### 2. `fflate` for Gzip — Sync + Universal

`node:zlib` is sync but not browser-portable. Native `CompressionStream` is async, which would force every save path to be async. `fflate` (~30 KB) is sync and works identically in Node, Deno, and the browser. Accepted as a runtime dep on `@sharpee/engine`. The base64 encoding layer (chunked btoa/atob) is necessary to store binary gzip output in JSON-safe strings.

### 3. Dropped the Save-Format Helpers; Did NOT Touch the Runtime SpatialIndex Class

The ~270 lines dropped from `save-restore-service.ts` (`serializeSpatialIndex`, `deserializeSpatialIndex`, `extractConnections`, `serializeTrait`, `deserializeTrait`) were the engine's internal *save-format* helpers — dead code once `world.toJSON()` takes over. The runtime `SpatialIndex` class in `@sharpee/world-model` (used for spatial queries throughout the engine and stdlib) is entirely untouched. The world-model test suite (1220/1220 passing) confirms this.

### 4. Platform-Browser Envelope Wraps Engine Save (Rather Than Bypassing It)

The old `SaveManager` bypassed the engine's save path entirely. The new design keeps a clean two-layer envelope: engine produces `ISaveData` (portable, format-versioned at `2.0.0`); platform-browser wraps it in a `BrowserSaveEnvelope` (envelope version `4.0.0`) that adds browser-only fields (transcript HTML, score, timestamp, slot name). Neither layer knows about the other's internals. If the engine format changes, the envelope version bumps independently.

### 5. Hard-Break for v1/v3 Saves (One-Time Exception)

v1 engine saves and v3 browser envelopes are both rejected and auto-deleted respectively. This was approved as a one-time exception: both formats were already broken (partial restores), dungeo is the only real story with a player base, and writing readers would have produced "restores that don't actually restore." Future format changes must add a version reader per the new `feedback_save_format_versioning.md` memory.

### 6. `cleanupObsoleteSaves()` Runs Once at Construction

The cleanup is idempotent and side-effect-free for conforming blobs. Running at construction (page load) means stale v3 entries are always cleared before any save or restore dialog is presented. No explicit "first run" flag needed because the cleanup silently no-ops when all entries are already v4.

## Next Phase

Plan complete — this branch is a standalone bug fix. No CURRENT phase remains.

## Open Items

### Short Term

- **Live browser smoke test**: No automated tests exist for platform-browser. The wiring is sound by composition, but only a real browser session proves end-to-end. Build with `./build.sh -s dungeo -c browser`, play+save+refresh+restore, verify score + location persist. Recommended before considering this fully closed.
- **v3 save cutover notice**: Existing v3 blobs in any deployed browser localStorage will be auto-deleted on first load post-pull. Intentional per no-backcompat call. Worth noting in release notes if dungeo is publicly deployed.

### Long Term

- **Future save-format changes use versioning**: Per `feedback_save_format_versioning.md` — next format change should add a v4 reader, not another hard-break.
- **Restore-picks-most-recent diagnostic** (from prior session): three hypotheses remain unresolved. With the engine fix landed, the symptom may resolve or shift; worth re-evaluating after a real browser smoke test.
- **In-game save bridge (Design B, ~80 LOC)**: blocked on tier gate + save name source decisions from David. Independent of this fix.
- **Zifmia integration test**: Zifmia routes through the engine but has no per-host integration test for save/restore. Deferred — the engine fix propagates; add a Zifmia test when Zifmia work resumes.

## Files Modified

**New test file** (1 file):
- `packages/engine/tests/save-restore-roundtrip.test.ts` — NEW; 10 round-trip tests; full Behavior Statement in file header; 7 RED before fix, 10 GREEN after

**Core types** (1 file):
- `packages/core/src/types/save-data.ts` — `IEngineState.spatialIndex` replaced by `worldSnapshot: string`; 4 dead serialized types removed

**Engine** (3 files):
- `packages/engine/src/save-restore-service.ts` — `createSaveData` and `loadSaveData` rewired to `world.toJSON()`/`loadJSON()` with `fflate` gzip; ~270 lines of broken helpers dropped; `SAVE_FORMAT_VERSION` bumped to `2.0.0`
- `packages/engine/src/game-engine.ts` — unused imports for dropped serializer helpers removed (line 41)
- `packages/engine/package.json` — `fflate` added as runtime dep

**Engine tests** (2 files):
- `packages/engine/tests/game-engine.test.ts` — version-string asserts updated `1.0.0` → `2.0.0`
- `packages/engine/tests/platform-operations.test.ts` — mock v1 blob replaced with `createSaveData()`-constructed fixture; version-string assert updated

**Platform-browser** (3 files):
- `packages/platform-browser/src/managers/SaveManager.ts` — full rewrite; delta serializer dropped; `BrowserSaveEnvelope` (v4.0.0); `performSave` / `loadEnvelope`; `cleanupObsoleteSaves()` constructor call
- `packages/platform-browser/src/BrowserClient.ts` — engine save/restore wiring; `pendingEngineSave` field; `runRestoreDialog()` helper; startup autosave-restore rewritten
- `packages/platform-browser/src/index.ts` — `BrowserSaveData` export renamed to `BrowserSaveEnvelope`

**Memory** (1 file):
- `~/.claude/projects/-Users-david-repos-sharpee/memory/feedback_save_format_versioning.md` — NEW; records the versioning-over-hard-break preference for future save-format changes

## Notes

**Session duration**: ~3–4 hours (branch cut at 04:54 UTC 2026-04-28)

**Approach**: Briefing first — resolved all five open questions with David before writing a line of code. Tests first — wrote all 10 round-trip tests against the broken engine, confirmed 7 RED, then fixed. Engine fix was a small surgical swap (the codebase already had the correct pattern in `undo()`). Platform-browser discovery was the main surprise: the host was not routing through the engine at all. The rewrite was structurally clean because the briefing had already established what the envelope shape should look like.

The SpatialIndex clarification (David's end-of-session question) confirmed we dropped only the engine's save-format helpers, not the runtime data structure. Worth preserving explicitly: `@sharpee/world-model`'s `SpatialIndex` class is the live spatial query engine used throughout stdlib and engine; it was never in scope for this fix.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert — changes are bounded to `save-restore-service.ts`, the core type change, platform-browser's `SaveManager` and `BrowserClient`, and the new test file. The runtime `SpatialIndex` in `@sharpee/world-model` is untouched. Reverting drops the round-trip tests and restores broken behavior, but leaves no orphaned artifacts.

## Dependency/Prerequisite Check

- **Prerequisites met**: `world.toJSON()` / `world.loadJSON()` full round-trip already proven by ADR-162 wire flow (prior session); `fflate` available on npm; `MinimalTestStory` test fixture available in `packages/engine/tests/stories/`; `setupTestEngine` helper available
- **Prerequisites discovered**: Platform-browser's `SaveManager` was bypassing the engine entirely — the briefing's assumption that "all hosts route through the engine" was incorrect for this host. Required a complete SaveManager rewrite rather than a narrow fix.

## Architectural Decisions

- Pattern applied: engine-level `world.toJSON()` / `world.loadJSON()` as the canonical durable save path (extending the same pattern already used by `undo()`)
- Pattern applied: two-layer envelope — engine owns `ISaveData` (portable, format-versioned); each host owns a host-specific envelope that wraps `ISaveData` and adds host-only fields
- Pattern applied: idempotent cleanup at construction (`cleanupObsoleteSaves()`) rather than a one-time migration flag
- No new ADRs created this session; the fix implements an implicit ADR principle already established by ADR-162 (full `world.toJSON()` round-trip is the correct serialization path for world state)

## Mutation Audit

- Files with state-changing logic modified:
  - `packages/engine/src/save-restore-service.ts` — `loadSaveData` mutates world state via `world.loadJSON()`; tests assert on actual post-restore world state (scores, capabilities, state values, relationships, containment, ID counters)
  - `packages/platform-browser/src/managers/SaveManager.ts` — `performSave` writes to localStorage; `loadEnvelope` reads; `cleanupObsoleteSaves` deletes stale entries. No unit tests written for SaveManager (no automated test infrastructure for platform-browser); wiring verified by composition.
- Tests verify actual state mutations (not just events): YES
  - All 7 DOES-clause tests assert on `getScore()`, `getMaxScore()`, `hasScore()`, `getScoreEntries()`, `getCapability()`, `getStateValue()`, `areRelated()`, `getLocation()`, `getAllEntities()`, `createEntity()` — direct world-state queries on the post-restore engine, not return values or mock calls
  - Test 7 (ID counters) includes a guard assertion ensuring restored entities exist before testing that new-entity IDs don't collide

## Recurrence Check

- Similar to past issue? YES — `session-20260426-2041-main.md` (world-model API shape mismatch: `fromJSON` vs `loadJSON`) and the ScoreLedger-not-persisted discovery in prior sessions both reflect the same pattern: subsystems added after initial implementation were never wired into the save path. This is the third instance. Suggests a one-time audit of `world.toJSON()` coverage: confirm every subsystem added after ADR-129 (ScoreLedger, capabilities, state values, relationships, ID counters) is exercised by a round-trip test. The new test suite covers all of these — audit complete.

## Test Coverage Delta

- Tests added: 10 (new `save-restore-roundtrip.test.ts`)
- Engine tests passing before: 185/186 (platform-operations test was asserting on v1 format)
- Engine tests passing after: 186/186 (platform-operations test fixed + 10 new round-trip tests = net +1 in final count because the failing test was replaced rather than kept)
- Core tests: 158/158 (no change; only type defs touched — no runtime test changes)
- World-model tests: 1220/1220 (10 skipped) — runtime SpatialIndex untouched, tests confirm it
- Stdlib tests: 1172/1172 (27 skipped) — no change
- Multi-user server tests: 498/498 (10 skipped) — `tests/saves` 11/11; `SHARPEE_REAL_SANDBOX=1` save-restore paths 13/13
- Tools/server client tests: 361/361 — no change
- Known untested areas: platform-browser `SaveManager` rewrite has no automated test suite; verified by composition (engine tests + type checking + build clean)

---

**Progressive update**: Session completed 2026-04-28 ~04:55 UTC
