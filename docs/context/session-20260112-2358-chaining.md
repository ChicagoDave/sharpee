# Work Summary: Event Chaining Architecture & Bundle Fix

**Date**: 2026-01-12
**Time**: 23:58
**Branch**: `chaining`
**Duration**: ~1.5 hours

## Objective

Fix the bundle-dungeo.sh script and implement architectural foundation for event chaining to enable containers to emit `revealed` events for their contents when opened.

## What Was Accomplished

### Files Created

- `docs/architecture/adrs/adr-094-event-chaining.md` - Event chaining ADR (ACCEPTED)
- `docs/work/chaining/implementation-plan.md` - 4-phase implementation plan

### Files Modified

- `scripts/bundle-dungeo.sh` - Fixed GameEngine constructor call
- `/home/dave/.claude/agents/work-summary-writer.md` - Fixed naming convention
- `stories/dungeo/src/handlers/dam-handler.ts` - Removed debug logs
- `stories/dungeo/src/scheduler/index.ts` - Removed debug logs
- `packages/stdlib/src/actions/standard/opening/opening-events.ts` - Updated RevealedEventData type

### Features Designed

#### 1. Event Chaining API (ADR-094)

**Problem**: When a container is opened, we need to emit `if.event.revealed` for each item inside. Currently this logic must be duplicated in every action that can open containers (OPEN, UNLOCK, BREAK, etc.).

**Solution**: Event handlers can chain additional events by returning them:

```typescript
// Handler returns chained events
world.registerEventHandler('if.event.opened', (event, world) => {
  const items = getVisibleContents(event.data.entityId);
  if (items.length === 0) return undefined;

  return world.chainEvent('if.event.revealed', {
    items: items.map(id => ({
      entityId: id,
      messageId: determineRevealedMessage(id)
    })),
    containerId: event.data.entityId
  }, { mode: 'cascade' });
});
```

**Chain Modes**:
- `cascade` (default): Append to existing events of this type
- `override`: Replace all events with this chain
- `keyed`: Replace only events matching a key

**Benefits**:
- Actions focus on their primary concern (opening)
- Handlers compose cross-cutting concerns (revealing)
- No action code changes needed
- Consistent behavior across all opening mechanisms

#### 2. Batch Revealed Events

Changed from one event per item to one event with array:

```typescript
// OLD (multiple events)
{ type: 'if.event.revealed', data: { entityId: 'item1' } }
{ type: 'if.event.revealed', data: { entityId: 'item2' } }

// NEW (single event with batch)
{
  type: 'if.event.revealed',
  data: {
    items: [
      { entityId: 'item1', messageId: 'inside' },
      { entityId: 'item2', messageId: 'on_top' }
    ],
    containerId: 'box'
  }
}
```

Language layer can now render as a single sentence: "Inside the box you see a key and a lamp."

### Bug Fixes

#### 1. Bundle Script GameEngine Constructor

**Issue**: Entry script in bundle-dungeo.sh was using positional arguments for GameEngine:

```typescript
// WRONG
const engine = new GameEngine(world, scheduler, actionRegistry);

// CORRECT
const engine = new GameEngine({
  world,
  scheduler,
  actionRegistry,
  reportService,
  languageService
});
```

**Impact**: Game wouldn't start when using bundled version.

**Fix**: Updated `scripts/bundle-dungeo.sh` to use correct options object pattern.

#### 2. Work Summary Writer Convention

**Issue**: Agent was using `YYYY-MM-DD-brief-description.md` format and saving to feature-specific folders.

**Problem**: Session-start.sh hook expects `session-YYYYMMDD-HHMM-{branch}.md` in `docs/context/` for progressive updates.

**Fix**: Updated `/home/dave/.claude/agents/work-summary-writer.md`:
- Changed filename format to match session-start.sh expectations
- Changed save location to `docs/context/` (project-level, not feature-specific)
- Ensures chronological ordering and hook continuity

### Code Quality

- Removed debug console.log statements from dam-handler and scheduler
- Proper type definitions for RevealedEventData
- Clear separation of concerns (chaining vs action logic)

## Key Decisions

### 1. Handler Return Values for Chaining

**Decision**: Event handlers return chained events rather than calling `world.emitEvent()` directly.

**Rationale**:
- Engine controls when chains execute (after all handlers)
- Prevents infinite loops (chains don't trigger same handler)
- Clear execution order (primary handlers → chains)
- Testable (handlers are pure functions of events)

### 2. Batch vs Individual Revealed Events

**Decision**: Single `if.event.revealed` with `items[]` array instead of one event per item.

**Rationale**:
- Language layer can render natural prose ("you see X, Y, and Z")
- Fewer events in queue (performance)
- Easier to apply container context (inside vs on top)
- Matches user mental model (see all at once)

### 3. Chain Modes (cascade/override/keyed)

**Decision**: Support three chaining modes rather than just append-only.

**Rationale**:
- `cascade`: Standard composition (revealed events add up)
- `override`: Replace action's default output (custom puzzle messages)
- `keyed`: Selective replacement (update just one property's report)

Flexibility needed for complex puzzles where handlers need to completely override default behavior.

## Architecture Notes

### Event Flow with Chaining

```
1. Action executes → emits primary events
2. Engine processes primary events
   → each handler runs
   → handlers return chained events
3. Engine collects all chains
4. Engine emits chained events (in order)
   → chains do NOT trigger handlers that returned them
5. ReportService renders all events
```

**Anti-loop guarantee**: Chained events skip the handler that created them.

### Implementation Phases

**Phase 1: Core API** (1-2 hours)
- Add `chainEvent()` to WorldModel
- Update engine's event processing loop
- Basic tests

**Phase 2: Standard Chains** (2-3 hours)
- opened → revealed handler
- Update all container opening scenarios
- Integration tests

**Phase 3: Language Layer** (2-3 hours)
- Batch revealed message rendering
- Container context (inside/on)
- Natural list formatting

**Phase 4: Documentation** (1 hour)
- Update core-concepts.md
- Handler patterns guide
- Migration guide for story authors

## Challenges & Solutions

### Challenge: Avoiding Infinite Loops

**Problem**: If a handler emits an event that triggers itself, infinite loop.

**Solution**: Chained events skip their originating handler. Engine tracks which handler created each chain and prevents re-entry.

### Challenge: Execution Order

**Problem**: When multiple handlers chain events, what order do chains execute?

**Solution**: All primary handlers run first (undefined order), then all chains emit in registration order. Chains are marked to skip their originating handler.

### Challenge: Backward Compatibility

**Problem**: Existing code expects `if.event.revealed` per item.

**Solution**: This is a new event - no backward compatibility needed. Language layer will be written fresh for batch format.

## Testing Strategy

1. **Unit Tests**: Handler return values, chain deduplication, mode selection
2. **Integration Tests**: opened → revealed flow with actual containers
3. **Transcript Tests**: Gameplay scenarios (open box, see contents)
4. **Performance**: Measure overhead of chain processing

## Branch Status

**Branch**: `chaining`
**Commits**: 2
1. `fix(dungeo): Fix bundle-dungeo.sh GameEngine constructor`
2. `feat(platform): Add event chaining ADR and implementation plan (ADR-094)`

**Ready for**: PR to main after Phase 1 implementation

## Next Steps

1. [ ] Implement `world.chainEvent()` API in WorldModel
2. [ ] Update GameEngine event processing to handle chains
3. [ ] Write unit tests for chain modes (cascade/override/keyed)
4. [ ] Implement opened → revealed handler in stdlib
5. [ ] Update language layer for batch revealed rendering
6. [ ] Create transcript tests for container opening scenarios
7. [ ] Update core-concepts.md with event chaining patterns

## References

- **ADR-094**: Event Chaining (this work)
- **ADR-052**: Event Handlers for Custom Logic
- **ADR-051**: Four-Phase Action Pattern
- Implementation Plan: `docs/work/chaining/implementation-plan.md`

## Files Changed This Session

```
M  /home/dave/.claude/agents/work-summary-writer.md
M  scripts/bundle-dungeo.sh
M  stories/dungeo/src/handlers/dam-handler.ts
M  stories/dungeo/src/scheduler/index.ts
M  packages/stdlib/src/actions/standard/opening/opening-events.ts
A  docs/architecture/adrs/adr-094-event-chaining.md
A  docs/work/chaining/implementation-plan.md
```

## Notes

### Why Event Chaining Matters

This architectural pattern enables clean separation of concerns:

- **Actions** focus on primary mutation (changing isOpen)
- **Handlers** add cross-cutting behavior (revealing contents)
- **Language layer** renders everything together naturally

Without chaining, every action that opens containers must duplicate the "reveal contents" logic. With chaining, we write it once as a handler.

### Future Applications

Event chaining will be useful for:
- Lighting/darkness changes when sources move
- NPC reactions to player actions
- Environmental cascades (water flows, doors trigger traps)
- Achievement/scoring updates
- Sound propagation through rooms

This is a foundational pattern that will pay dividends throughout Dungeo implementation.

### Work Summary Writer Fix

The work-summary-writer agent now correctly:
1. Uses `session-YYYYMMDD-HHMM-{branch}.md` naming (sortable, timestamped)
2. Saves to `docs/context/` (project-level, not feature-specific)
3. Matches session-start.sh hook expectations
4. Enables progressive session updates throughout long work sessions

This aligns the agent with the established session management workflow.
