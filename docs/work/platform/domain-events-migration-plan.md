# Domain Events Migration Plan

## Overview

This document outlines the plan to migrate all stdlib actions from the dual event pattern to the simplified domain event pattern.

### Current State (Dual Event Pattern)

Actions emit two types of events:
1. **Domain event** (`if.event.taken`) - for event sourcing, handlers to react
2. **Action status event** (`action.success`) - for text rendering

This creates complexity and bugs when actionId/messageId don't align.

### Target State (Simplified Pattern)

Actions emit ONE domain event that carries everything:
- Event sourcing data (what happened)
- Rendering data (`messageId` + `params` for text-service lookup)

## Domain Event Structure

```typescript
context.event('if.event.taken', {
  // Rendering data (text-service uses these)
  messageId: `${context.action.id}.${messageKey}`,
  params: { item, container, ... },

  // Domain data (event sourcing / handlers use these)
  item: noun.name,
  itemId: noun.id,
  actorId: actor.id,
  previousLocation: location,
  ...
});
```

Key points:
- `messageId` is the full key (e.g., `if.action.taking.taken`)
- `params` contains data for message template substitution
- Domain data is spread at top level for backward compatibility with handlers

## Blocked Events

For blocked/failure cases, use a `*_blocked` or `*_failed` event type:

```typescript
context.event('if.event.take_blocked', {
  messageId: `${context.action.id}.${errorKey}`,
  params: { item, reason, ... },

  // Domain data
  item: noun.name,
  itemId: noun.id,
  reason: errorKey,
});
```

## Actions to Migrate

### Completed (1)

| Action | Domain Event | Notes |
|--------|--------------|-------|
| ✅ taking | `if.event.taken`, `if.event.take_blocked` | Proof-of-concept complete |

### High Priority - State Mutations (12)

These actions modify world state and are frequently used:

| Action | Domain Event | Blocked Event | Complexity |
|--------|--------------|---------------|------------|
| dropping | `if.event.dropped` | `if.event.drop_blocked` | Low |
| opening | `if.event.opened` | `if.event.open_blocked` | Low |
| closing | `if.event.closed` | `if.event.close_blocked` | Low |
| locking | `if.event.locked` | `if.event.lock_blocked` | Low |
| unlocking | `if.event.unlocked` | `if.event.unlock_blocked` | Low |
| switching_on | `if.event.switched_on` | `if.event.switch_on_blocked` | Medium - auto-LOOK |
| switching_off | `if.event.switched_off` | `if.event.switch_off_blocked` | Low |
| wearing | `if.event.worn` | `if.event.wear_blocked` | Low |
| taking_off | `if.event.removed` | `if.event.remove_blocked` | Low |
| inserting | `if.event.inserted` | `if.event.insert_blocked` | Low |
| putting | `if.event.put` | `if.event.put_blocked` | Low |
| removing | `if.event.removed_from` | `if.event.remove_from_blocked` | Low |

### Medium Priority - Information Actions (8)

These actions don't mutate state but provide information:

| Action | Domain Event | Blocked Event | Complexity |
|--------|--------------|---------------|------------|
| looking | `if.event.looked` | - | High - multiple messages |
| examining | `if.event.examined` | `if.event.examine_blocked` | Medium |
| searching | `if.event.searched` | `if.event.search_blocked` | Low |
| reading | `if.event.read` | `if.event.read_blocked` | Low |
| listening | `if.event.listened` | - | Low |
| smelling | `if.event.smelled` | - | Low |
| touching | `if.event.touched` | - | Low |
| inventory | `if.event.inventory` | - | Medium - list formatting |

### Medium Priority - Movement (3)

| Action | Domain Event | Blocked Event | Complexity |
|--------|--------------|---------------|------------|
| going | `if.event.went` | `if.event.go_blocked` | High - room desc, dark |
| entering | `if.event.entered` | `if.event.enter_blocked` | Medium |
| exiting | `if.event.exited` | `if.event.exit_blocked` | Medium |

### Medium Priority - Interaction (7)

| Action | Domain Event | Blocked Event | Complexity |
|--------|--------------|---------------|------------|
| attacking | `if.event.attacked` | `if.event.attack_blocked` | Medium |
| giving | `if.event.gave` | `if.event.give_blocked` | Low |
| showing | `if.event.showed` | `if.event.show_blocked` | Low |
| throwing | `if.event.threw` | `if.event.throw_blocked` | Low |
| talking | `if.event.talked` | - | Low |
| pushing | `if.event.pushed` | `if.event.push_blocked` | Low |
| pulling | `if.event.pulled` | `if.event.pull_blocked` | Low |

### Lower Priority - Miscellaneous (8)

| Action | Domain Event | Blocked Event | Complexity |
|--------|--------------|---------------|------------|
| climbing | `if.event.climbed` | `if.event.climb_blocked` | Low |
| eating | `if.event.ate` | `if.event.eat_blocked` | Low |
| drinking | `if.event.drank` | `if.event.drink_blocked` | Low |
| sleeping | `if.event.slept` | - | Low |
| waiting | `if.event.waited` | - | Low |
| lowering | `if.event.lowered` | `if.event.lower_blocked` | Low |
| raising | `if.event.raised` | `if.event.raise_blocked` | Low |
| undoing | `if.event.undone` | `if.event.undo_blocked` | Low |

### System Actions - No Migration Needed (8)

These emit system events or don't emit domain events:

| Action | Notes |
|--------|-------|
| about | Emits `game.message`, no domain event |
| help | Emits `game.message`, no domain event |
| quitting | Platform event |
| restarting | Platform event |
| saving | Platform event |
| restoring | Platform event |
| scoring | Emits `game.score`, may need review |
| version | Emits `game.message`, no domain event |

## Migration Steps Per Action

For each action:

### 1. Identify Events

```bash
# Find current event emissions
grep -n "context.event" packages/stdlib/src/actions/standard/{action}/{action}.ts
```

### 2. Update report() Phase

**Before:**
```typescript
report(context): ISemanticEvent[] {
  events.push(context.event('if.event.xxx', domainData));
  events.push(context.event('action.success', {
    actionId: context.action.id,
    messageId,
    params
  }));
  return events;
}
```

**After:**
```typescript
report(context): ISemanticEvent[] {
  events.push(context.event('if.event.xxx', {
    // Rendering
    messageId: `${context.action.id}.${messageKey}`,
    params,
    // Domain (spread for backward compat)
    ...domainData
  }));
  return events;
}
```

### 3. Update blocked() Phase

**Before:**
```typescript
blocked(context, result): ISemanticEvent[] {
  return [context.event('action.blocked', {
    actionId: context.action.id,
    messageId: result.error,
    params: { ... }
  })];
}
```

**After:**
```typescript
blocked(context, result): ISemanticEvent[] {
  return [context.event('if.event.xxx_blocked', {
    // Rendering
    messageId: `${context.action.id}.${result.error}`,
    params: { ...result.params },
    // Domain
    reason: result.error,
    ...
  })];
}
```

### 4. Test

```bash
# Create test transcript
cat > /tmp/test-{action}.transcript << 'EOF'
title: Test {Action} Migration
story: dungeo
---
> {command}
[OK: contains "{expected}"]
EOF

# Run test
node packages/transcript-tester/dist/cli.js stories/dungeo /tmp/test-{action}.transcript --verbose
```

### 5. Verify Events

In verbose output, check:
- Only domain event emitted (no `action.success`)
- `messageId` present in event data
- Correct message rendered

## Batch Migration Strategy

### Phase 1: Low-Complexity Actions (20 actions)

Migrate simple actions that follow standard pattern:
- dropping, opening, closing, locking, unlocking
- switching_off, wearing, taking_off
- inserting, putting, removing
- searching, reading, listening, smelling, touching
- giving, showing, throwing, talking

**Estimated effort:** 2-3 hours

### Phase 2: Medium-Complexity Actions (8 actions)

Actions with special handling:
- switching_on (auto-LOOK when light turns on in dark)
- examining (object descriptions, special cases)
- inventory (list formatting)
- attacking (combat outcome variations)
- pushing, pulling (capability dispatch)
- entering, exiting (location changes)

**Estimated effort:** 2-3 hours

### Phase 3: High-Complexity Actions (2 actions)

Actions with significant logic:
- looking (room description, contents, dark handling, verbose mode)
- going (movement, dark rooms, vehicles, auto-look)

**Estimated effort:** 2-3 hours

### Phase 4: Cleanup

After all actions migrated:

1. Remove `STATE_CHANGE_EVENTS` set from text-service
2. Remove `handleActionSuccess`, `handleActionFailure` handlers
3. Simplify `routeToHandler()` to only handle special cases
4. Update documentation

## Testing Strategy

### Unit Tests

Existing stdlib unit tests may need updates to expect new event structure.
Note: Many tests were already failing before migration (pre-existing issues).

### Transcript Tests

Run full dungeo transcript suite after each batch:
```bash
node packages/transcript-tester/dist/cli.js stories/dungeo --all
```

### Browser Testing

Test in browser client to verify:
- Text rendering works correctly
- No duplicate output
- Blocked messages display properly

## Rollback Plan

The text-service supports both old and new patterns simultaneously.
If issues arise:
1. Revert specific action to old pattern
2. Old `action.success` events still work
3. No need to revert text-service changes

## Success Criteria

1. All 39 migratable actions use domain event pattern
2. No `action.success` or `action.blocked` emissions in stdlib
3. All transcript tests pass
4. Browser client works correctly
5. Text-service cleanup complete

## Notes

### Message Keys

Currently using full message keys (`if.action.taking.taken`) to work with existing message registration. Future improvement: flatten to shared namespace where appropriate.

### Event Handler Compatibility

Domain data is spread at top level to maintain compatibility with existing event handlers that expect fields like `itemId`, `actorId`, etc.

### Multi-Object Commands

Actions like `take all` emit multiple events (one per item). Each event carries its own messageId for proper rendering.
