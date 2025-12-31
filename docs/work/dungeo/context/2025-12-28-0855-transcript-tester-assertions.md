# Work Summary: Transcript Tester Event and State Assertions

**Date**: 2025-12-28
**Duration**: ~1.5 hours
**Feature/Area**: Transcript Tester (ADR-073)

## Objective

Enhance the transcript tester to validate semantic events and world state, not just text output. This enables testing the event contract between engine/actions and the text rendering layer.

## What Was Accomplished

### New Assertion Types Implemented

#### Event Assertions
```
[EVENT: true, 1, type="if.event.pushed"]                    # Position-specific
[EVENT: true, 2, type="action.success" messageId="pushed_nudged"]  # With data match
[EVENT: false, type="if.event.destroyed"]                   # Negative assertion
[EVENTS: 3]                                                 # Exact count
```

#### State Assertions
```
[STATE: true, trapdoor.location = r06]      # Entity property equals value
[STATE: false, egg.location = nowhere]       # Negative assertion
```

### Files Modified

#### packages/transcript-tester/src/types.ts
- Added `event-assert` and `state-assert` assertion types
- Added fields: `assertTrue`, `eventPosition`, `eventType`, `eventData`, `stateExpression`
- Removed deprecated types: `has-event`, `event-data`, `state`

#### packages/transcript-tester/src/parser.ts
- Parse `[EVENT: true|false, N?, type="..." key="value"]` syntax
- Parse `[STATE: true|false, expression]` syntax
- Support optional position number for event assertions
- Parse key="value" pairs for event data matching

#### packages/transcript-tester/src/runner.ts
- Added `WorldModel` interface with `getLocation()` and `getContents()` methods
- Implemented `checkEventAssertion()` for assertTrue/assertFalse on events
- Implemented `checkStateAssertion()` for world state queries
- Implemented `evaluateStateExpression()` supporting:
  - `entity.property = value` (equality)
  - `entity.property != value` (inequality)
  - `collection contains item` (membership)
  - `collection not-contains item` (non-membership)
- Added `findEntity()` to locate entities by name, ID, or alias
- Added `getEntityProperty()` with special handling for `location` (uses world.getLocation)

#### packages/transcript-tester/src/reporter.ts
- Format `event-assert` with assertTrue/assertFalse prefix
- Format `state-assert` with expression display
- Show position and data for event assertions

#### stories/dungeo/tests/transcripts/rug-trapdoor.transcript
- Updated to use new assertion syntax
- Added comprehensive event and state assertions for push rug command

### Example Output

```
> push rug                                         PASS
  ✓ Contains "Moving the rug reveals a trapdoor"
  ✓ assertTrue: Event 1: if.event.pushed
  ✓ assertTrue: Event 2: action.success {"messageId":"pushed_nudged"}
  ✓ assertTrue: Event 3: game.message {"messageId":"dungeo.rug.moved.reveal_trapdoor"}
  ✓ assertFalse: if.event.destroyed
  ✓ Event count: 3
  ✓ assertTrue: trapdoor.location = r06
```

## Key Decisions

### 1. Explicit assertTrue/assertFalse Semantics
**Decision**: Use `[EVENT: true, ...]` and `[EVENT: false, ...]` instead of separate assertion types.

**Rationale**:
- Consistent pattern for positive and negative assertions
- Clear intent in transcript files
- Extensible for future assertion types

### 2. Position-Based Event Assertions
**Decision**: Support optional position number `[EVENT: true, 1, type="..."]`

**Rationale**:
- Enables testing exact event order
- Position is 1-based (human-readable)
- Omitting position checks any position (more flexible)

### 3. World Model Integration for State
**Decision**: Use `world.getLocation(entityId)` instead of `entity.location` property.

**Rationale**:
- WorldModel stores location in spatial index, not on entities
- Consistent with actual engine architecture
- Enables proper location and contents queries

### 4. Entity Resolution by Name
**Decision**: State expressions use entity names/aliases that resolve to IDs.

**Rationale**:
- More readable than IDs in transcript files
- Searches by name, ID, and aliases
- Falls back gracefully

## Testing

All 67 tests in 5 transcripts pass:
- navigation.transcript
- rug-trapdoor.transcript (updated with new assertions)
- troll-blocking.transcript
- house-exploration.transcript
- forest-clearing.transcript

## Future Enhancements

1. **Name-based room lookup**: Currently using IDs (r06), could enhance to support "Living Room"
2. **Nested property access**: Support `entity.trait.property` syntax
3. **Comparison operators**: Support `>`, `<`, `>=`, `<=` for numeric properties
4. **Function expressions**: Support `player.canSee(egg)` style function calls

## References

- ADR-073: Transcript Testing
- Previous work: 2025-12-28-entity-handlers-rug-trapdoor.md
