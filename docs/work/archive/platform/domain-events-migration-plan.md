# Domain Events Migration Plan

**Status**: ✅ All Phases Complete (38/39 actions migrated - 97%)

## Overview

This document outlines the plan to migrate all stdlib actions from the dual event pattern to the simplified domain event pattern (ADR-097).

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
  messageId: 'if.action.taken.success',  // or 'if.action.taken.from'
  params: { item, container, ... },

  // Domain data (event sourcing / handlers use these)
  item: noun.name,
  itemId: noun.id,
  actorId: actor.id,
  previousLocation: location,
  ...
});
```

### MessageId Convention

Pattern: `if.action.{event}.{outcome}`

- `{event}` = past tense verb matching domain event type
- `{outcome}` = `success`, or specific variation/failure

Examples:
```
if.action.taken.success        → "Taken."
if.action.taken.from           → "You take {item} from {container}."
if.action.taken.already_have   → "You already have that."
if.action.taken.fixed_in_place → "{item} is fixed in place."

if.action.opened.success       → "Opened."
if.action.opened.locked        → "It's locked."

if.action.dropped.success      → "Dropped."
if.action.dropped.not_holding  → "You're not holding that."

if.action.looked.room          → "{name}\n{description}"
if.action.looked.dark          → "It's pitch dark."
if.action.looked.contents      → "You can see {items} here."
```

Key points:
- MessageId aligns with domain event (`if.event.taken` → `if.action.taken.*`)
- Groups related messages under same namespace
- Readable and self-documenting
- `params` contains data for message template substitution
- Domain data spread at top level for backward compatibility with handlers

## Blocked Events

For blocked/failure cases, emit the same domain event type but with a blocked messageId:

```typescript
context.event('if.event.taken', {
  messageId: 'if.action.taken.fixed_in_place',  // blocked outcome
  params: { item },

  // Domain data
  item: noun.name,
  itemId: noun.id,
  blocked: true,
  reason: 'fixed_in_place',
});
```

Note: Using the same event type (`if.event.taken`) with `blocked: true` in domain data.
Event handlers can check `blocked` flag to distinguish success from failure.
MessageId determines the displayed message.

## Migration Progress

### ✅ Phase 1: Foundation (Complete)

| Action | Domain Event | Message Namespace | Notes |
|--------|--------------|-------------------|-------|
| ✅ taking | `if.event.taken` | `if.action.taking.*` | Proof-of-concept |

### ✅ Phase 2: Core Manipulation (Complete)

| Action | Domain Event | Message Namespace | Notes |
|--------|--------------|-------------------|-------|
| ✅ dropping | `if.event.dropped` | `if.action.dropping.*` | Handles multi-object (drop all) |
| ✅ opening | `if.event.opened` | `if.action.opening.*` | Keeps backward compat `opened` event |
| ✅ closing | `if.event.closed` | `if.action.closing.*` | Keeps backward compat `closed` event |
| ✅ putting | `if.event.put_in`, `if.event.put_on` | `if.action.putting.*` | Handles containers and supporters |
| ✅ inserting | (delegates to putting) | `if.action.inserting.*` | Delegates success to putting |

### ✅ Phase 3: Inventory & Containers (Complete)

| Action | Domain Event | Message Namespace | Notes |
|--------|--------------|-------------------|-------|
| ✅ locking | `if.event.locked` | `if.action.locking.*` | |
| ✅ unlocking | `if.event.unlocked` | `if.action.unlocking.*` | |
| ✅ switching_on | `if.event.switched_on` | `if.action.switching_on.*` | Auto-LOOK uses looking's messageIds |
| ✅ switching_off | `if.event.switched_off` | `if.action.switching_off.*` | |
| ✅ wearing | `if.event.worn` | `if.action.wearing.*` | |
| ✅ taking_off | `if.event.removed` | `if.action.taking_off.*` | |
| ✅ removing | `if.event.taken` | `if.action.removing.*` | Uses taking's event type |

### ✅ Phase 4: World Interaction (18 actions) - Complete

Information actions, movement, and interaction with the world.

#### Information Actions (8) - All Complete

| Action | Domain Event | Message Namespace | Status |
|--------|--------------|-------------------|--------|
| ✅ looking | `if.event.looked` | `if.action.looking.*` | Complete (uses specialized room handler) |
| ✅ examining | `if.event.examined` | `if.action.examining.*` | Complete |
| ✅ searching | `if.event.searched` | `if.action.searching.*` | Complete |
| ✅ reading | `if.event.read` | `if.action.reading.*` | Complete |
| ✅ listening | `if.event.listened` | `if.action.listening.*` | Complete |
| ✅ smelling | `if.event.smelled` | `if.action.smelling.*` | Complete |
| ✅ touching | `if.event.touched` | `if.action.touching.*` | Complete |
| ✅ inventory | `if.event.inventory` | `if.action.inventory.*` | Complete |

#### Movement Actions (3) - All Complete

| Action | Domain Event | Message Namespace | Status |
|--------|--------------|-------------------|--------|
| ✅ going | `if.event.went` | `if.action.going.*` | Complete (uses specialized room handler for auto-look) |
| ✅ entering | `if.event.entered` | `if.action.entering.*` | Complete |
| ✅ exiting | `if.event.exited` | `if.action.exiting.*` | Complete |

#### Interaction Actions (7) - 7 Complete

| Action | Domain Event | Message Namespace | Status |
|--------|--------------|-------------------|--------|
| ✅ attacking | `if.event.attacked` | `if.action.attacking.*` | Complete |
| ✅ giving | `if.event.given` | `if.action.giving.*` | Complete |
| ✅ showing | `if.event.shown` | `if.action.showing.*` | Complete |
| ✅ throwing | `if.event.thrown` | `if.action.throwing.*` | Complete |
| ✅ talking | `if.event.talked` | `if.action.talking.*` | Complete |
| ✅ pushing | `if.event.pushed` | `if.action.pushing.*` | Complete |
| ✅ pulling | `if.event.pulled` | `if.action.pulling.*` | Complete |

### ✅ Phase 5: Miscellaneous & System (8 actions + 8 no-migration) - Complete

#### Miscellaneous Actions (8) - All Complete

| Action | Domain Event | Message Namespace | Status |
|--------|--------------|-------------------|--------|
| ✅ climbing | `if.event.climbed` | `if.action.climbing.*` | Complete |
| ✅ eating | `if.event.eaten` | `if.action.eating.*` | Complete |
| ✅ drinking | `if.event.drunk` | `if.action.drinking.*` | Complete |
| ✅ sleeping | `if.event.slept` | `if.action.sleeping.*` | Complete |
| ✅ waiting | `if.event.waited` | `if.action.waiting.*` | Complete |
| ✅ lowering | `if.event.lowered` | `if.action.lowering.*` | Complete (capability dispatch) |
| ✅ raising | `if.event.raised` | `if.action.raising.*` | Complete (capability dispatch) |
| N/A undoing | Platform event | N/A | Uses platform events |

#### System Actions - No Migration Needed (8)

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
  events.push(context.event('if.event.taken', {
    // Rendering
    messageId: 'if.action.taken.success',  // or .from, etc.
    params: { item, container, ... },
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
  return [context.event('if.event.taken', {
    // Rendering
    messageId: `if.action.taken.${result.error}`,  // e.g., if.action.taken.fixed_in_place
    params: { item, ... },
    // Domain
    blocked: true,
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

## Migration Strategy Summary

### Completed Phases

| Phase | Focus | Actions | Status |
|-------|-------|---------|--------|
| 1 | Foundation | 1 | ✅ Complete |
| 2 | Core Manipulation | 5 | ✅ Complete |
| 3 | Inventory & Containers | 7 | ✅ Complete |
| 4 | World Interaction | 18 | ✅ Complete |
| 5 | Miscellaneous | 7 of 8 | ✅ Complete |

**Total**: 38/39 actions (97%)

### Remaining Work

All stdlib action migrations are complete. Remaining work:
1. Fix params pattern in remaining actions (some still spread params at top level)
2. Update message registration in lang-en-us (optional, for cleaner message keys)
3. Clean up deprecated text-service code

**Note**: 8 system actions don't need migration (no domain events). 1 action (undoing) uses platform events.

### Pattern Note: Room Description

The `looking` and `going` actions use a hybrid approach:
- Room name/description handled by specialized `handleRoomDescription` handler
- Contents list and other messages use messageId pattern
- Dark room message uses messageId pattern

This preserves the separate ROOM_NAME and ROOM_DESCRIPTION text blocks while using messageId for other messages.

### Post-Migration: Message Registration

After stdlib actions migrated, update `lang-en-us` action files to use new message keys:

**Example: `packages/lang-en-us/src/actions/taking.ts`**

Before:
```typescript
export const takingLanguage = {
  actionId: 'if.action.taking',
  messages: {
    'taken': "Taken.",
    'taken_from': "You take {item} from {container}.",
    'fixed_in_place': "{item} is fixed in place.",
    ...
  }
};
```

After:
```typescript
export const takenMessages = {
  'if.action.taken.success': "Taken.",
  'if.action.taken.from': "You take {item} from {container}.",
  'if.action.taken.fixed_in_place': "{item} is fixed in place.",
  ...
};
```

Note: Language provider will need update to load flat message keys instead of `{actionId}.{key}` pattern.

### Final Cleanup

After all actions and messages migrated:

1. Remove `STATE_CHANGE_EVENTS` set from text-service
2. Remove `handleActionSuccess`, `handleActionFailure` handlers
3. Simplify `routeToHandler()` to only handle special cases
4. Remove old actionId-based message loading from language provider
5. Update documentation

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

Using new convention: `if.action.{event}.{outcome}`

Examples:
- `if.action.taken.success` → "Taken."
- `if.action.taken.from` → "You take {item} from {container}."
- `if.action.taken.fixed_in_place` → "{item} is fixed in place."

This requires updating message registration in `lang-en-us` from old keys:
- `if.action.taking.taken` → `if.action.taken.success`
- `if.action.taking.taken_from` → `if.action.taken.from`
- `if.action.taking.fixed_in_place` → `if.action.taken.fixed_in_place`

### Event Handler Compatibility

Domain data is spread at top level to maintain compatibility with existing event handlers that expect fields like `itemId`, `actorId`, etc.

### Multi-Object Commands

Actions like `take all` emit multiple events (one per item). Each event carries its own messageId for proper rendering.
