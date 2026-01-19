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

## Actions to Migrate

### Completed (13)

| Action | Domain Event | Message Namespace | Notes |
|--------|--------------|-------------------|-------|
| ✅ taking | `if.event.taken` | `if.action.taking.*` | Phase 1 proof-of-concept |
| ✅ dropping | `if.event.dropped` | `if.action.dropping.*` | Phase 2 |
| ✅ opening | `if.event.opened` | `if.action.opening.*` | Phase 2 |
| ✅ closing | `if.event.closed` | `if.action.closing.*` | Phase 2 |
| ✅ putting | `if.event.put_in`, `if.event.put_on` | `if.action.putting.*` | Phase 2 |
| ✅ inserting | (delegates to putting) | `if.action.inserting.*` | Phase 2 |
| ✅ locking | `if.event.locked` | `if.action.locking.*` | Phase 3 |
| ✅ unlocking | `if.event.unlocked` | `if.action.unlocking.*` | Phase 3 |
| ✅ switching_on | `if.event.switched_on` | `if.action.switching_on.*` | Phase 3 |
| ✅ switching_off | `if.event.switched_off` | `if.action.switching_off.*` | Phase 3 |
| ✅ wearing | `if.event.worn` | `if.action.wearing.*` | Phase 3 |
| ✅ taking_off | `if.event.removed` | `if.action.taking_off.*` | Phase 3 |
| ✅ removing | `if.event.taken` | `if.action.removing.*` | Phase 3 |

### Medium Priority - Information Actions (8)

These actions don't mutate state but provide information:

| Action | Domain Event | Message Namespace | Complexity |
|--------|--------------|-------------------|------------|
| looking | `if.event.looked` | `if.action.looked.*` | High - multiple messages |
| examining | `if.event.examined` | `if.action.examined.*` | Medium |
| searching | `if.event.searched` | `if.action.searched.*` | Low |
| reading | `if.event.read` | `if.action.read.*` | Low |
| listening | `if.event.listened` | `if.action.listened.*` | Low |
| smelling | `if.event.smelled` | `if.action.smelled.*` | Low |
| touching | `if.event.touched` | `if.action.touched.*` | Low |
| inventory | `if.event.inventory` | `if.action.inventory.*` | Medium - list formatting |

### Medium Priority - Movement (3)

| Action | Domain Event | Message Namespace | Complexity |
|--------|--------------|-------------------|------------|
| going | `if.event.went` | `if.action.went.*` | High - room desc, dark |
| entering | `if.event.entered` | `if.action.entered.*` | Medium |
| exiting | `if.event.exited` | `if.action.exited.*` | Medium |

### Medium Priority - Interaction (7)

| Action | Domain Event | Message Namespace | Complexity |
|--------|--------------|-------------------|------------|
| attacking | `if.event.attacked` | `if.action.attacked.*` | Medium |
| giving | `if.event.gave` | `if.action.gave.*` | Low |
| showing | `if.event.showed` | `if.action.showed.*` | Low |
| throwing | `if.event.threw` | `if.action.threw.*` | Low |
| talking | `if.event.talked` | `if.action.talked.*` | Low |
| pushing | `if.event.pushed` | `if.action.pushed.*` | Low |
| pulling | `if.event.pulled` | `if.action.pulled.*` | Low |

### Lower Priority - Miscellaneous (8)

| Action | Domain Event | Message Namespace | Complexity |
|--------|--------------|-------------------|------------|
| climbing | `if.event.climbed` | `if.action.climbed.*` | Low |
| eating | `if.event.ate` | `if.action.ate.*` | Low |
| drinking | `if.event.drank` | `if.action.drank.*` | Low |
| sleeping | `if.event.slept` | `if.action.slept.*` | Low |
| waiting | `if.event.waited` | `if.action.waited.*` | Low |
| lowering | `if.event.lowered` | `if.action.lowered.*` | Low |
| raising | `if.event.raised` | `if.action.raised.*` | Low |
| undoing | `if.event.undone` | `if.action.undone.*` | Low |

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

### Phase 4: Message Registration Migration

Update `lang-en-us` action files to use new message keys:

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

### Phase 5: Cleanup

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
