# Session Summary: 2026-01-13 - chaining

## Status: Completed

## Goals
- Implement Phase 1 of ADR-094 Event Chaining: Core API in WorldModel
- Establish foundation for event-to-event triggering system
- Write comprehensive unit tests to validate all chain modes and behaviors

## Completed

### Event Chain API Implementation

**Added core types and interfaces** (`packages/world-model/src/world/WorldModel.ts`):
- `EventChainHandler` type - handler function that returns events to emit (or null/void)
- `ChainEventOptions` interface - configuration for chain registration (mode, key, priority)
- `ChainRegistration` interface - internal storage format with handler, key, priority

**Implemented chain storage and registration**:
- Added `eventChains: Map<string, ChainRegistration[]>` to WorldModel class
- Implemented `chainEvent(triggerType, handler, options)` method with three modes:
  - **cascade** (default): Add handler to chain list, all fire in priority order
  - **override**: Replace all existing chains for this trigger type
  - **keyed**: Replace chain with same key, or add if key not found
- Priority-based ordering (lower numbers fire first, default 100)

**Wired chains to EventProcessor**:
- Implemented `wireChainToProcessor(triggerType)` - registers chain executor with EventProcessor
- Implemented `executeChains(triggerType, event)` - invokes all chains and collects results
- Chains wire automatically on registration if EventProcessor already connected
- Chains wire for all trigger types when `connectEventProcessor()` called

**Chain metadata tracking**:
- Added `data._chainedFrom`, `data._chainSourceId`, `data._chainDepth` to chained events
- **Important**: Stored in `data` field because `ISemanticEvent` interface doesn't have a `meta` field
- Max chain depth of 10 to prevent infinite loops (warning logged if exceeded)

**Type exports** (`packages/world-model/src/world/index.ts`):
- Exported `EventChainHandler`, `ChainEventOptions` for public API usage

### Comprehensive Test Suite

**Created** `packages/world-model/tests/unit/world/event-chaining.test.ts` with 23 passing tests covering:

**Basic Chain Registration**:
- Handler registration and wiring
- Event invocation and result collection
- Null/undefined handler returns

**Cascade Mode**:
- Multiple chains fire in sequence
- All results collected
- Priority ordering (priority 50 fires before priority 150)

**Override Mode**:
- Replaces all existing chains
- Only new handler fires

**Keyed Replacement**:
- Replaces chain with matching key
- Multiple keys coexist
- Keyless chains unaffected

**Chain Metadata**:
- `_chainedFrom` captures source event type
- `_chainSourceId` captures source event ID
- `_chainDepth` tracks nesting level
- Metadata preserved through multiple chain levels

**Safety**:
- Chain depth limit prevents infinite loops (max depth 10)
- Warning logged when depth exceeded
- Deep chains stop propagating

**Array Handling**:
- Single event return works
- Array of events return works
- All events collected properly

## Key Decisions

### 1. Chain Metadata in `data` Field, Not `meta`

**Rationale**: The `ISemanticEvent` interface (from `@sharpee/core`) doesn't have a `meta` field. Rather than modify the core interface, we store chain tracking data in the `data` field with underscore-prefixed keys (`_chainedFrom`, `_chainSourceId`, `_chainDepth`). This follows the pattern of "internal data" while keeping the core event structure simple.

**Implication**: Story authors should avoid using underscore-prefixed keys in event data to prevent collisions with system metadata.

### 2. Two-Step Wiring Pattern

**Rationale**: Chains can be registered before or after the EventProcessor is connected to WorldModel. The implementation handles both cases:
- If EventProcessor already connected when `chainEvent()` called → wire immediately
- If EventProcessor not yet connected → wire all chains when `connectEventProcessor()` called

**Implication**: Flexible initialization order - stories can register chains in `initializeWorld()` before engine wires the processor.

### 3. Priority-Based Chain Ordering

**Rationale**: When multiple chains trigger from the same event, execution order matters. Priority values (lower = first) give authors control over sequence. Default priority of 100 allows stories to insert chains before (priority < 100) or after (priority > 100) stdlib chains.

**Implication**: Stdlib will use priority 100 for standard chains (like opened→revealed), giving stories room to customize.

### 4. Max Chain Depth of 10

**Rationale**: Prevent infinite loops from circular chains (A → B → A → ...). Depth limit of 10 allows legitimate multi-step cascades while catching mistakes. Warning logged rather than error thrown to fail gracefully.

**Implication**: Complex chain sequences are possible but should be reviewed if approaching limit.

## Open Items

### Short Term

**Phase 2: Stdlib Integration** (next session):
- Create `packages/stdlib/src/chains/opened-revealed.ts` - generate revealed event for container contents
- Register standard chains in `packages/stdlib/src/chains/index.ts`
- Wire into engine initialization
- Remove inline revealed event from opening action (already removed in this session)
- Write integration tests

**Phase 3: Language Layer**:
- Create revealed event renderer in `packages/lang-en-us/src/events/revealed.ts`
- Wire renderer into LanguageProvider
- Test full flow: open container → revealed event → "Inside you see..." text

### Long Term

**Phase 4: Documentation & Debugging**:
- Add `world.getRegisteredChains()` method for debugging
- Update ADR-094 with implementation notes
- Add chain examples to story authoring guide
- Consider chain tracing in debug output

**Open Questions**:
- Should chains fire during event preview? (likely not - only during execution)
- Proper message ID format for revealed items in chain
- Performance impact of deep chain cascades (profile if needed)

## Files Modified

**Platform Core** (2 files):
- `packages/world-model/src/world/WorldModel.ts` - Added EventChainHandler type, ChainEventOptions interface, ChainRegistration interface, eventChains Map storage, chainEvent() method, wireChainToProcessor() and executeChains() methods, wiring in connectEventProcessor()
- `packages/world-model/src/world/index.ts` - Exported EventChainHandler and ChainEventOptions types

**Tests** (1 file created):
- `packages/world-model/tests/unit/world/event-chaining.test.ts` - 23 unit tests covering all chain modes, priority ordering, metadata tracking, depth limits, and array handling

**Documentation** (1 file updated):
- `docs/work/chaining/implementation-plan.md` - Marked Phase 1 as complete with implementation notes

## Architectural Notes

### Event Chain Flow

```
Action emits event (e.g., if.event.opened)
         ↓
EventProcessor receives event
         ↓
EventProcessor invokes registered handlers
         ↓
WorldModel.executeChains('if.event.opened', event) called
         ↓
All chains for 'if.event.opened' invoked in priority order
         ↓
Each handler returns ISemanticEvent | ISemanticEvent[] | null | void
         ↓
Results collected, metadata added (chainedFrom, chainSourceId, chainDepth)
         ↓
Chain depth checked (warn and skip if > 10)
         ↓
Chained events returned to EventProcessor
         ↓
EventProcessor emits chained events to listeners
         ↓
Process repeats for any chains on chained event types
```

### Design Pattern: Declarative Event Relations

Event chaining enables **declarative** event relationships. Instead of actions manually emitting multiple related events, they emit primary events and let chains handle secondary effects:

**Before** (imperative):
```typescript
// Opening action directly emits revealed event
const openEffect = { /* ... */ };
const revealedEffect = generateRevealedEvent(target);
return [openEffect, revealedEffect];
```

**After** (declarative):
```typescript
// Opening action emits only opened event
// Chain registered elsewhere: opened → revealed
return [openEffect];
```

**Benefits**:
- Actions focus on their core responsibility
- Related events registered in one place (chains module)
- Stories can override/extend chains without modifying actions
- Event relationships visible in registration code

### Test Coverage Strategy

Tests organized by concern:
1. **Registration** - API surface works correctly
2. **Mode behavior** - cascade/override/keyed work as specified
3. **Priority** - ordering enforced correctly
4. **Metadata** - tracking data propagates properly
5. **Safety** - depth limit prevents infinite loops
6. **Edge cases** - null/undefined returns, empty chains

This pattern provides confidence for Phase 2 integration into stdlib.

## Notes

**Session duration**: ~2 hours

**Approach**: Bottom-up implementation - core API first, then stdlib integration, then language layer. This session completed the foundation layer with full test coverage. Next session will integrate into stdlib opening action and create the standard opened→revealed chain.

**Testing**: All 23 tests passing. Run with:
```bash
pnpm --filter '@sharpee/world-model' test event-chaining
```

**Branch**: `chaining` - ready to merge after Phase 2 completion and integration testing

**Related ADR**: ADR-094 Event Chaining - describes motivation, use cases, and design decisions

---

**Progressive update**: Phase 1 completed 2026-01-13 00:37
