# Session Plan: WorldModel Subsystem Extraction (Issue #70)

**Created**: 2026-04-03
**Overall scope**: Extract three cohesive subsystems out of the 1,520-line `WorldModel` class into dedicated classes (`ScoreLedger`, `WorldEventSystem`, `WorldSerializer`) while keeping the `IWorldModel` interface and all callers completely unchanged. This is a pure internal refactor — no behavior changes, no interface changes.
**Bounded contexts touched**: N/A — infrastructure/tooling refactor within `packages/world-model`
**Key domain language**: N/A — no domain concept changes; this is structural decomposition of a platform class

---

## Background

`WorldModel.ts` is currently 1,520 lines. Three subsystems have well-defined boundaries and no cross-dependencies between them:

- **ScoreLedger** (~40 lines, 7 methods, 2 fields) — completely isolated, no dependencies on WorldModel internals beyond the `ScoreEntry` type.
- **WorldEventSystem** (~200 lines, 12+ methods, 7 fields) — all event registration, validation, previewing, chaining, and history. Handlers need an `IWorldModel` reference at invocation time.
- **WorldSerializer** (~80 lines, 4 methods/blocks) — `toJSON`, `loadJSON`, `rebuildIdCounters`, and the relevant parts of `clear`. Uses `getDataStore()` to reach internal state, so it can be extracted after the other two provide their own serialization.

The extraction order follows the stated constraint: Phase 1 → Phase 2 → Phase 3. Each phase produces a buildable, testable commit.

---

## Phases

### Phase 1: Extract ScoreLedger
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: N/A — internal platform subsystem
- **Entry state**: `WorldModel.ts` is at HEAD (1,520 lines), tests passing. No `ScoreLedger.ts` exists in `packages/world-model/src/world/`.
- **Deliverable**:
  - New file `packages/world-model/src/world/ScoreLedger.ts` containing:
    - `ScoreEntry` interface (moved from `WorldModel.ts`)
    - `ScoreLedger` class with fields `private ledger: ScoreEntry[]` and `private maxScore: number`
    - Methods: `award`, `revoke`, `has`, `getTotal`, `getEntries`, `setMax`, `getMax`
    - `toJSON()` / `fromJSON(data)` for serialization delegation
  - `WorldModel.ts` updated:
    - `ScoreLedger` imported; single `private ledger: ScoreLedger` field replaces the two removed fields
    - All seven public methods delegate to `this.ledger.*`
    - `toJSON` delegates score data to `this.ledger.toJSON()`
    - `loadJSON` delegates score restore to `this.ledger.fromJSON(data)`
    - `clear()` calls `this.ledger.clear()` (or re-instantiates)
  - `packages/world-model/src/world/index.ts` exports `ScoreLedger`
  - Existing tests pass without modification (they test through `IWorldModel`)
- **Exit state**: Build passes (`./build.sh --skip stdlib`), all world-model and engine tests pass. `WorldModel.ts` is measurably shorter. `ScoreLedger.ts` is a standalone, importable class.
- **Status**: CURRENT

---

### Phase 2: Extract WorldEventSystem
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: N/A — internal platform subsystem
- **Entry state**: Phase 1 complete and committed. `ScoreLedger` extraction pattern is proven and reviewable. No `WorldEventSystem.ts` exists.
- **Deliverable**:
  - New file `packages/world-model/src/world/WorldEventSystem.ts` containing:
    - All four exported types moved here: `EventHandler`, `EventValidator`, `EventPreviewer`, `EventChainHandler`
    - Interfaces moved here: `ChainEventOptions`, `ChainRegistration` (internal)
    - All seven private fields: `eventHandlers`, `eventValidators`, `eventPreviewers`, `appliedEvents`, `eventProcessorWiring`, `maxEventHistory`, `eventChains`
    - All public methods delegated from `WorldModel`: `registerEventHandler`, `unregisterEventHandler`, `registerEventValidator`, `registerEventPreviewer`, `connectEventProcessor`, `chainEvent`, `applyEvent`, `canApplyEvent`, `previewEvent`, `getAppliedEvents`, `getEventsSince`, `clearEventHistory`
    - All private helpers moved in: `wireHandlerToProcessor`, `wireChainToProcessor`, `executeChains`
    - Constructor receives `worldRef: IWorldModel` — stored and passed to handlers/validators/previewers at invocation time. This reference is assigned after construction (`system.setWorldRef(this)` in `WorldModel` constructor, or passed at construction time using a late-bind pattern).
    - `toJSON()` / `fromJSON(data)` for the `appliedEvents` array (eventChains are code registrations and are not serialized, consistent with current `loadJSON` behavior)
    - `clear()` method resets runtime state
  - `WorldModel.ts` updated:
    - Imports `WorldEventSystem` and the four exported handler types (re-exported for backward compatibility)
    - Single `private eventSystem: WorldEventSystem` field replaces all seven removed fields
    - All twelve public event methods delegate to `this.eventSystem.*`
    - `toJSON` delegates to `this.eventSystem.toJSON()`
    - `loadJSON` delegates to `this.eventSystem.fromJSON(data)` and preserves `eventChains` by calling `this.eventSystem.preserveChains()` / `this.eventSystem.restoreChains()` consistent with current behavior
    - `clear()` calls `this.eventSystem.clear()`
  - `packages/world-model/src/world/index.ts` exports `WorldEventSystem` and re-exports the four handler types
  - Existing tests pass without modification
- **Exit state**: Build passes, all tests pass. `WorldModel.ts` is measurably shorter (~200 fewer lines). The event subsystem is independently readable and testable in isolation.
- **Status**: PENDING

---

### Phase 3: Extract WorldSerializer
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: N/A — internal platform subsystem
- **Entry state**: Phases 1 and 2 complete and committed. `ScoreLedger` and `WorldEventSystem` each expose `toJSON`/`fromJSON`. No `WorldSerializer.ts` exists.
- **Deliverable**:
  - New file `packages/world-model/src/world/WorldSerializer.ts` containing:
    - `WorldSerializer` class that receives a reference to `IDataStore` (already returned by `getDataStore()`) plus references to the `ScoreLedger` and `WorldEventSystem` instances
    - `serialize(scoreLedger, eventSystem)`: composes and returns the full JSON string (current `toJSON` body)
    - `deserialize(json, scoreLedger, eventSystem, rebuildFn)`: current `loadJSON` body, delegating score and event restoration to the passed instances
    - `rebuildIdCounters(entities, idCounters)`: static or instance method for the counter-rebuild logic (currently called from `loadJSON`)
    - No `clear()` needed — `WorldModel.clear()` continues to call the subsystem `clear()` methods directly
  - `WorldModel.ts` updated:
    - Imports `WorldSerializer`
    - `private serializer: WorldSerializer` constructed with `this.getDataStore()` ref, `this.ledger`, and `this.eventSystem`
    - `toJSON()` delegates to `this.serializer.serialize(this.ledger, this.eventSystem)`
    - `loadJSON()` delegates to `this.serializer.deserialize(json, this.ledger, this.eventSystem, () => this.rebuildIdCounters())`
    - `rebuildIdCounters` remains private on `WorldModel` (or moves to serializer — discuss at implementation time)
  - `packages/world-model/src/world/index.ts` exports `WorldSerializer`
  - Existing tests pass without modification
- **Exit state**: Build passes, all tests pass. `WorldModel.ts` is measurably shorter. The three extracted classes are each independently understandable. `WorldModel.ts` retains only entity management, spatial management, state management, scope, vocabulary, and the convenience creators — all of which are genuinely its core responsibilities.
- **Status**: PENDING

---

## Cross-Cutting Constraints

- `IWorldModel` interface is not touched in any phase.
- Public method signatures on `WorldModel` are not changed — only implementation delegates to the new class.
- Exported types (`EventHandler`, `EventValidator`, `EventPreviewer`, `EventChainHandler`, `ChainEventOptions`, `ScoreEntry`) remain importable from their current paths via re-export.
- No test files are modified. All assertions run through the public interface and must pass unchanged.
- Each phase ends with a passing `./build.sh --skip stdlib` and a full test run.
- Build and test confirmation is required before starting the next phase.
