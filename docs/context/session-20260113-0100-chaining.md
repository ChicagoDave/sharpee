# Session Summary: 2026-01-13 - chaining

## Status: Completed

## Goals
- Implement Phase 2 of ADR-094 Event Chaining: Standard Library Chains
- Create opened→revealed chain handler for container content revelation
- Wire chain registration into GameEngine initialization
- Write comprehensive unit tests for chain behavior

## Completed

### Phase 2: Standard Library Chains

Implemented the first standard library event chain: `opened → revealed`. This chain automatically generates a `if.event.revealed` event when a container is opened, decoupling content revelation from the opening action.

**Key design decisions:**

1. **Chain Key**: `stdlib.chain.opened-revealed` (allows story overrides)
2. **Priority**: 100 (stdlib default - stories can use lower/higher priorities)
3. **Event Structure**: Uses standard `ISemanticEvent` fields:
   - `entities.target` → container ID
   - `entities.others` → array of item IDs
   - `data` → `RevealedEventData` with container and item details
4. **Registration Location**: GameEngine constructor, after `connectEventProcessor()` call

### Files Created

**`packages/stdlib/src/chains/opened-revealed.ts`** (86 lines)
- `createOpenedRevealedChain()` - Factory function returning chain handler
- `OPENED_REVEALED_CHAIN_KEY` - Constant for story overrides
- Checks if target is a container with contents
- Returns `null` for non-containers or empty containers
- Generates unique event IDs using timestamp
- Maps container contents to `RevealedEventData.items[]`
- Uses item name as messageId (language layer will format properly)

**`packages/stdlib/src/chains/index.ts`** (70 lines)
- `registerStandardChains(world)` - Registers all stdlib chains
- Exports chain keys and creators for testing/overriding
- Documents story extension patterns with examples
- Notes for future chains (closed→hidden, searched→revealed, etc.)

**`packages/stdlib/tests/unit/chains/opened-revealed.test.ts`** (9,658 bytes)
- 15 comprehensive unit tests covering:
  - Basic behavior (container with contents → revealed event)
  - Non-containers → no event
  - Empty containers → no event
  - Multiple items handling
  - Event structure validation (id, type, timestamp, entities, data)
  - Item messageId resolution (name fallback to id)
  - Container name fallback from world
  - Chain key constant verification

### Files Modified

**`packages/engine/src/game-engine.ts`**
- Added import: `registerStandardChains` from `@sharpee/stdlib`
- Added call in constructor (line 160): `registerStandardChains(this.world);`
- Added comment explaining EventProcessor dependency
- Located after `world.connectEventProcessor(wiring)` to ensure chains are properly wired

**`packages/stdlib/src/index.ts`**
- Added export: `export * from './chains';`
- Makes chain registration function and keys available to engine and stories

## Key Decisions

### 1. Chain Registration Timing
**Decision**: Call `registerStandardChains()` in GameEngine constructor after `connectEventProcessor()`.

**Rationale**: Event chains must be wired to the EventProcessor when registered. If we call `chainEvent()` before the processor is connected, the chain handlers won't be wired and won't fire. This ordering ensures proper initialization.

### 2. Entity Field Naming
**Decision**: Use `entities.target` for container ID, `entities.others` for item IDs.

**Rationale**: The `ISemanticEvent` interface uses these standard fields. While the revealed event's "target" is conceptually the items being revealed, we follow the established pattern where `target` refers to the primary entity involved (the container) and `others` contains secondary entities (the contents).

### 3. Chain Key Naming
**Decision**: Use `stdlib.chain.opened-revealed` (not `stdlib.opened.reveal`).

**Rationale**: The key identifies the chain registration, not the event transformation. The format `{namespace}.chain.{trigger}-{result}` clearly indicates this is a chain from "opened" to "revealed", and the "chain" segment distinguishes it from action or event IDs.

### 4. Empty Container Handling
**Decision**: Return `null` for empty containers (no revealed event).

**Rationale**: An empty container has nothing to reveal. Emitting a revealed event with an empty items array would be semantically incorrect and could confuse language layer rendering. Better to emit nothing than emit a meaningless event.

## Test Results

```
Phase 1 Tests (WorldModel):
  23/23 passing - event-chaining.test.ts

Phase 2 Tests (Stdlib):
  15/15 passing - opened-revealed.test.ts

Total: 38/38 tests passing
```

## Architectural Notes

### Event Chaining Flow

```
1. Opening action executes
   └─> Emits if.event.opened with targetId

2. EventProcessor processes event
   └─> Triggers registered chains for 'if.event.opened'

3. Opened→Revealed chain executes
   ├─> Checks if target is Container
   ├─> Gets container contents
   └─> Returns if.event.revealed (or null)

4. EventProcessor emits chained event
   └─> Adds chain metadata (_chainedFrom, _chainSourceId, _chainDepth)

5. Language layer renders revealed event
   └─> "Inside the chest you see a sword, a key, and a map."
```

### Metadata Pattern

Chained events carry metadata for debugging and preventing infinite loops:
- `data._chainedFrom`: Source event type (e.g., "if.event.opened")
- `data._chainSourceId`: Source event ID (for tracing)
- `data._chainDepth`: Depth counter (max 10, prevents loops)

Note: Initially considered using `meta` field, but `ISemanticEvent` uses `data` for all properties.

### Story Extension Pattern

Stories can override or extend stdlib chains:

```typescript
// Override: Replace stdlib chain entirely
world.chainEvent('if.event.opened', myCustomHandler, {
  key: OPENED_REVEALED_CHAIN_KEY,  // Same key = replacement
  priority: 100
});

// Extend: Add chain that fires after stdlib
world.chainEvent('if.event.opened', trapHandler, {
  key: 'story.chain.trap-trigger',
  priority: 200  // Higher priority = later execution
});
```

## Open Items

### Short Term
- [ ] **Phase 3**: Implement language layer support for `if.event.revealed`
  - Create `packages/lang-en-us/src/events/revealed.ts`
  - Render "Inside the {container} you see {items}."
  - Handle indefinite articles properly (a sword, an apple)
  - Register renderer in LanguageProvider

- [ ] **Integration Testing**: Create transcript test to verify end-to-end behavior
  - Open container with items
  - Verify revealed event appears in stream
  - Verify proper English text is rendered

### Long Term
- [ ] **Debug Tooling**: Add method to inspect registered chains
  ```typescript
  world.getRegisteredChains(): Map<string, ChainInfo[]>
  ```
- [ ] **Additional Standard Chains**:
  - `closed → hidden` (opposite of revealed)
  - `searched → revealed` (for SearchableTrait)
  - `unlocked → cascade` (unlock multiple connected locks)

- [ ] **Chain Tracing**: Add debug output for chain execution
  - Log when chains fire
  - Show chain metadata in verbose mode
  - Help authors debug custom chains

## Files Modified

**New Files** (3):
- `packages/stdlib/src/chains/opened-revealed.ts` - Chain handler implementation
- `packages/stdlib/src/chains/index.ts` - Registration function and exports
- `packages/stdlib/tests/unit/chains/opened-revealed.test.ts` - Unit tests

**Modified Files** (2):
- `packages/engine/src/game-engine.ts` - Wire chain registration
- `packages/stdlib/src/index.ts` - Export chains module

## Related Work

### ADR-094: Event Chaining
**Status**: Phase 2 Complete

- **Phase 1** (Complete): Core API in WorldModel
  - `world.chainEvent()` method
  - Chain registration with priority and keys
  - EventProcessor integration
  - Chain depth limiting (max 10)
  - 23 unit tests

- **Phase 2** (Complete): Standard chains in stdlib
  - Opened→Revealed chain implementation
  - GameEngine registration
  - 15 unit tests

- **Phase 3** (Next): Language layer support
  - Revealed event renderer
  - Integration with LanguageProvider

- **Phase 4** (Future): Documentation and debugging
  - Chain inspection API
  - Story authoring guide updates
  - Debug tracing output

### Implementation Plan
- Location: `docs/work/chaining/implementation-plan.md`
- All Phase 1 and Phase 2 tasks marked complete
- Phase 3 tasks defined and ready to begin

## Notes

**Session duration**: ~1.5 hours

**Approach**: Test-driven implementation. Wrote comprehensive unit tests first to define expected behavior, then implemented chain handler to pass tests. This caught several edge cases early:
- Empty containers should return null
- Non-containers should return null
- Item messageId should fall back to entity ID if name missing
- Event IDs must be unique (using timestamp)

**Code Quality**: Implementation is clean and well-documented:
- JSDoc comments explain chain flow and usage
- Type safety enforced (TypeScript strict mode)
- No magic strings (all keys are exported constants)
- Examples provided for story authors

**Test Coverage**: 38 tests (23 world-model + 15 stdlib) provide confidence in:
- Core chaining API correctness
- Priority ordering and mode handling
- Standard chain behavior and edge cases
- Event structure compliance with ISemanticEvent

**Integration Notes**: The separation between world-model (API), stdlib (standard chains), and engine (registration) maintains clean architectural boundaries. Stories can import chain keys from stdlib to override behavior without coupling to engine internals.

---

**Progressive update**: Session completed 2026-01-13 01:00
