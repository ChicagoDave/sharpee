# Platform Save/Restore Is Partially Broken

**Discovered:** 2026-04-28 during multi-user deploy investigation
**Severity:** High — affects all platforms (CLI, platform-browser, Zifmia, multi-user)
**Status:** Confirmed in code; concrete fix path identified; not yet implemented
**Owner / Decision:** chicagodave

## TL;DR

Every Sharpee save+restore round-trip silently loses world state. Score (ScoreLedger), capability data, world state values, relationships, and ID counters are dropped. Only entity traits, entity locations, event source, turn history, parser state, and plugin states survive. The bug has shipped on every platform. No tests catch it because the existing tests assert API-surface fields (`metadata.turnCount`, `history.length`) — never the actual state that would have been lost.

## Concrete Evidence

### The broken code path

Every host (CLI, platform-browser, Zifmia, multi-user sandbox) routes saves through the engine's `SaveRestoreService`:

- `packages/engine/src/platform-operations.ts:151` — `handleSave` calls `this.saveRestoreService.createSaveData(this.stateProvider)`
- `packages/engine/src/platform-operations.ts:184` — `handleRestore` calls `this.saveRestoreService.loadSaveData(saveData, this.stateProvider)`

The save format (`packages/engine/src/save-restore-service.ts:128-166` `createSaveData`):

```typescript
const engineState: IEngineState = {
  eventSource: this.serializeEventSource(eventSource),
  spatialIndex: this.serializeSpatialIndex(world),   // <-- only this for world state
  turnHistory: this.serializeTurnHistory(context.history),
  parserState: this.serializeParserState(parser),
  pluginStates: pluginRegistry.getStates()
};
```

The restore (`save-restore-service.ts:172-213` `loadSaveData`):

```typescript
this.deserializeSpatialIndex(saveData.engineState.spatialIndex, world);
```

The implementation comment from the original author at line 362 admits the gap:

> `// Note: Full deserialization would need to clear and recreate the world.`
> `// For now, this restores entity traits and locations`

The engine's own `undo()` does it correctly (`save-restore-service.ts:88-101`):

```typescript
undo(world: WorldModel): { turn: number } | null {
  // ...
  world.loadJSON(snapshot);   // full restore
  return { turn };
}
```

So the codebase already knows the right move — `world.toJSON()` / `world.loadJSON()` is a complete round-trip (proven by ADR-162 wire flow). Save/restore was just left at half-impl and never closed out.

### What survives a save/restore round-trip

- Entity traits (e.g., `OpenableTrait.isOpen`, `ContainerTrait`, `IdentityTrait`)
- Entity-to-location mapping (player + items return to where they were)
- Event source (turn-by-turn event log)
- Turn history (`context.history`)
- Parser state (vocabulary scope)
- Plugin states (ADR-120 plugin registry data)

### What is silently lost

- **ScoreLedger (ADR-129)** — `world.getScore()` returns 0, `world.getMaxScore()` returns 0
- **Capabilities** — every `world.getCapability(...)` returns undefined; includes `scoring.moves`, `scoring.deaths`, story-defined capabilities (e.g., dungeo's death-penalty state, melee state)
- **World state values** — every `world.getStateValue(...)` returns undefined; includes `dungeo.player.deaths`, `dungeo.game_over`, `dungeo.game_over_reason`, `cure.ticks`, etc.
- **Relationships** — `serializeSpatialIndex` produces `relationships: {}` (line 317), so all `world.areRelated`/`world.getRelated` data is gone
- **ID counters** — pasted as part of `world.toJSON()` but not in the engine save; on restore, ID generation may collide with existing entities

### Why the live symptom is "game restarts at West of House"

Multi-user diskette restore goes through this path: `saveService.restore` → sandbox `RESTORE` → `engine.executeTurn('restore')` → `loadSaveData` → partial restore. The fresh-spawn sandbox has new player and entity IDs (different from the saved IDs), so the entity-by-id moveEntity calls that *would* have moved the player to Living Room silently no-op (entity not found), leaving the player in their fresh-spawn opening location — West of House.

## Why The Tests Didn't Catch It

Three save/restore tests exist (`packages/engine/tests/game-engine.test.ts:225`, `:237`, `:259`; `packages/engine/tests/integration.test.ts:56`):

- Test 1: asserts `state.version === '1.0.0'`, `state.metadata.turnCount === 1`, `state.engineState !== undefined`. Never opens `engineState` to verify world state is captured.
- Test 2: asserts `loadedContext.currentTurn === savedTurn + 1` and `loadedContext.history.length === 2`. Both fields come from `metadata` and `eventSource` — paths the broken `spatialIndex` code never touches.
- Test 3: rejects an incompatible version string. No actual save/restore.

These are the YELLOW grade per CLAUDE.md rule 12:

> Calls a side-effect function but only asserts on the return value, not on mutated state.

The Behavior Statement that *should* drive these tests:

> **DOES**: rebuilds the world's full runtime state from a save blob — entity locations, trait state, ScoreLedger totals, registered capabilities and their data, world state values, relationship graph — such that querying the post-restore world returns the same answers as querying the pre-save world.

Every clause should be a test assertion. None of them are. The tests pass even when `loadSaveData` is `function loadSaveData() { return; }`.

The tests probably date to pre-ADR-129 (when ScoreLedger didn't exist) and were never updated as new world subsystems came online. Walkthroughs use `--chain` (in-memory continuation, never touches save format), so they don't catch it either.

## Fix Plan

### Step 1 — Failing tests first

Add `packages/engine/tests/save-restore-roundtrip.test.ts`. Each test sets non-default world state, saves, recreates the engine, restores, and asserts the same query returns the same answer. All should fail against current code.

Required assertions, one per DOES clause:

```typescript
describe('save/restore round-trip preserves world state', () => {
  it('preserves ScoreLedger totals', () => {
    // setup: setMaxScore(100), awardScore('test', 25, '...')
    // round-trip
    // expect: getScore() === 25, getMaxScore() === 100
  });

  it('preserves ScoreLedger entries (revocability)', () => {
    // setup: awardScore('treasure-1', 10, '...')
    // round-trip
    // expect: hasScore('treasure-1') === true, getScoreEntries() length === 1
    // expect: re-awarding 'treasure-1' returns false (dedup intact)
  });

  it('preserves capability data', () => {
    // setup: registerCapability('scoring', { initialData: { moves: 7, deaths: 1 } })
    // round-trip
    // expect: getCapability('scoring').moves === 7, .deaths === 1
  });

  it('preserves world state values', () => {
    // setup: setStateValue('dungeo.game_over', true), setStateValue('cure.ticks', 5)
    // round-trip
    // expect: getStateValue('dungeo.game_over') === true, getStateValue('cure.ticks') === 5
  });

  it('preserves relationships', () => {
    // setup: addRelationship('a', 'b', 'next-to')
    // round-trip
    // expect: areRelated('a', 'b', 'next-to') === true
  });

  it('preserves entity locations under stable IDs', () => {
    // setup: place player + item in named room
    // round-trip
    // expect: getLocation(player.id) === room.id, getContents(room.id) includes item
  });

  it('preserves entity traits', () => {
    // setup: openable trait with isOpen=true
    // round-trip
    // expect: trait restored with same data
    // (this one passes today — keeps regression coverage when the impl changes)
  });

  it('preserves engine context (currentTurn, history)', () => {
    // setup: execute 2 turns
    // round-trip
    // expect: currentTurn === savedTurn + 1, history.length === 2
    // (this one also passes today — same reason)
  });

  it('rejects mismatched save version cleanly (no partial restore)', () => {
    // existing test, kept
  });

  it('rejects mismatched story id cleanly', () => {
    // existing test, kept
  });
});
```

Six of those will be RED on the first run. Two will be GREEN (existing-behavior regression coverage).

### Step 2 — Fix the engine

The minimal swap in `packages/engine/src/save-restore-service.ts`:

1. Add `worldSnapshot: string` (the verbatim `world.toJSON()` output) to `IEngineState`.
2. `createSaveData()` populates `worldSnapshot`. Decide whether to keep `spatialIndex` for backward-compat or drop it.
3. `loadSaveData()` does `world.loadJSON(saveData.engineState.worldSnapshot)` first, then layers on the engine-side metadata (event source, turn history, parser state, plugin states).
4. Bump save version `1.0.0 → 2.0.0`.
5. Decide on backward-compat: hard-reject v1 saves with a clear error message, or write a v1 reader that uses the old partial restore and surfaces a "this save is from before the format upgrade — score and progress will not restore" warning.
6. Remove `serializeSpatialIndex` / `deserializeSpatialIndex` (and the helper `extractConnections`) if no consumer remains.
7. Verify `undo()` still works — it currently uses `world.toJSON()/loadJSON()` as inline snapshots, separate from the save format. Should be unaffected, but write a dedicated undo round-trip test if one doesn't exist.

The change is bounded to one file (~150 lines touched) plus the new test file.

### Step 3 — Save blob size impact

Per the ADR-162 bandwidth baseline (`docs/work/multiuser/adr-162-bandwidth-baseline.md`), median dungeo `world.toJSON()` is ~418 KiB. So save blobs grow from "tens of KB" (entity traits + parser state) to ~400-500 KB. This is a 10–20× growth.

For dungeo this is acceptable:
- LocalStorage has plenty of headroom for a few saves at this size
- Multi-user SQLite saves already store the JSON blob; column type is BLOB, no schema change
- Network transfer for restore ≈ 400 KB once-per-restore — fine

For other stories with much larger worlds: not measured. If a story has 100K+ entities, save blob could be many MB. We'd want to add a compression step (gzip) at the engine boundary if this becomes an issue. Not blocking for now.

### Step 4 — Backward compatibility decision

**Recommendation: hard-break.** Bump version 1.0.0 → 2.0.0, reject v1 saves with a clear "save format outdated, please start a new game" error. Reasoning:

1. Sharpee is alpha. Dungeo is the only real story with a player base.
2. v1 saves are *already broken* — even if we wrote a v1 reader, restoring a v1 save still loses score/capabilities/state values. We'd be loading a known-corrupted blob.
3. Writing a v1 reader is non-trivial and the result is "restore that doesn't actually restore." Worse user experience than "this save is from a previous version."
4. Game length is short — a player can re-play to get back to where they were.

Alternative if you disagree: write a v1 reader that calls the old `deserializeSpatialIndex`, and surface a banner "this save is from before the format upgrade and may not restore your full progress." Adds ~30 lines, keeps player saves loadable in degraded mode.

### Step 5 — Rollout

When the fix lands on `main`, three artifacts need rebuilding before the new save format is everywhere:

- `dist/cli/sharpee.js` — `./build.sh -s dungeo -b` rebuilds the platform bundle and dungeo .sharpee
- `dist/web/dungeo/` — `./build.sh -s dungeo -c browser` for the platform-browser deploy
- `tools/server/Dockerfile` rebuild — `docker build -f tools/server/Dockerfile -t sharpee-server:local .` for the multi-user server

For the multi-user server specifically: the live `sharpee-server:local` image will start writing v2 saves and rejecting v1 saves. If anyone has a meaningful v1 save in `/data/db/sharpee.db`, they lose access to it on the first server restart with the new image. (For dungeo's deploy that's me — not a real loss.)

## Open Questions For Human Review

1. **Backward compat policy** — hard-break (recommended) or v1 reader with degraded warning?
2. **Test scope** — write the round-trip tests for full state coverage as listed, or also add per-host integration tests (CLI + platform-browser + multi-user) that exercise the wire path end-to-end?
3. **Save blob size** — accept 10–20× growth as-is, or add gzip at the engine boundary in this same change?
4. **`spatialIndex` removal** — drop it entirely once no one reads it, or keep the serializer in case it's useful for something else (smaller debug snapshots, etc.)?
5. **Priority** — fix in the next session, or queue behind the in-game save bridge / restore-picks-most-recent / other open items?

## Related Open Items

From `docs/context/session-20260427-1912-main.md` Open Items:

- **Restore-picks-most-recent diagnostic** — three hypotheses unresolved. With this fix landed, the symptom may resolve or change shape; worth re-evaluating after the format swap.
- **In-game save bridge (Design B, ~80 LOC)** — blocked on tier gate + save name source decisions. Independent of this bug — the bridge wires the wire layer; this fix repairs the engine.

## Files Touched (Plan)

- `packages/engine/src/save-restore-service.ts` — core fix
- `packages/engine/src/types.ts` (or wherever `IEngineState` lives) — add `worldSnapshot` field
- `packages/engine/tests/save-restore-roundtrip.test.ts` — NEW; the failing tests
- `packages/engine/tests/game-engine.test.ts` and `tests/integration.test.ts` — update version-string asserts to `2.0.0`
- Possibly `packages/core/src/types/save-data.ts` if `IEngineState` lives there — check before editing

Estimated scope: 1–2 hours including tests, depending on how many code sites touch `serializeSpatialIndex` (probably none outside the service).
