# Priority 3: Event Property Mismatches

## Overview
This document tracks the event property mismatches between actions and their tests. These account for approximately 25% of test failures.

## Categories of Mismatches

### 1. Extra Properties in Event Data
Actions are including properties that tests don't expect. The general principle should be:
- Event data (for world model events like `if.event.opened`) can include extra properties for extensibility
- Success message params should only include what's needed for message formatting

#### Affected Actions:
- **putting**: Including `preposition` in success message params
- **examining**: Including `target` in success message params when other properties exist
- **wearing**: Including `bodyPart` in success message params
- **opening**: Including many extra properties in success message params
- **dropping**: Including `fromContainer` and `fromLocation` in event data
- **pulling**: Including extra properties like `direction` and `weight`
- **pushing**: Including extra properties like `direction` and `newState`

### 2. Message ID Mismatches

#### Short vs Fully Qualified IDs:
- **sleeping**: Using `if.action.sleeping.brief_nap` instead of `brief_nap`
- **opening**: Using `its_empty` instead of `opened` for empty containers
- **wearing**: Using `if.action.wearing.already_wearing` instead of `hands_full`
- **pushing**: Using `if.action.pushing.button_pushed` instead of `switch_toggled`

### 3. Missing Expected Properties

#### Tests expecting properties that actions don't provide:
- **dropping**: Tests expect `intoContainer` boolean
- **examining**: Tests expect properties without extra `target` field
- **pulling**: Tests expect `detached` property
- **pushing**: Tests expect specific property combinations

### 4. Property Value Mismatches

#### Different values than expected:
- **exiting**: Using "from" instead of "out of" for preposition
- **pulling**: Using "attached" instead of "cord" for pullType
- **pushing**: Different boolean values than expected

## Fix Strategy

### Principle 1: Separate Event Data from Message Params
- World model events (if.event.*) can have rich data
- Success message params should only include what's needed for the message

### Principle 2: Use Simple Message IDs
- Use short IDs like `brief_nap` not `if.action.sleeping.brief_nap`
- The message system should handle namespacing

### Principle 3: Match Test Expectations
- Tests represent the API contract
- Update actions to match tests unless there's a good reason not to

## Action Items

### Phase 1: Message ID Fixes
1. [x] Fixed resolveMessageId to not prepend action ID - messages now use short form
2. [x] Fixed opening action to use 'opened' for empty containers (not 'its_empty')
3. [x] Fixed wearing action - layer conflicts now use 'hands_full', fixed body part conflict logic
4. [x] Fixed pushing action - now correctly uses 'switch_toggled' for switches

### Phase 2: Property Cleanup
1. [x] Fixed putting action - separated event data from message params, removed preposition
2. [x] Fixed examining action - only include target when using basic 'examined' message
3. [x] Fixed opening action - separated event data from message params
4. [x] Fixed wearing action - removed bodyPart from message params
5. [x] Fixed pushing action - minimized message params based on message type
6. [ ] Fix remaining actions with property issues
7. [ ] Ensure event data includes all needed properties

### Phase 3: Value Corrections
1. [ ] Fix preposition values (e.g., "out of" vs "from")
2. [ ] Fix property type values (e.g., "cord" vs "attached")
3. [ ] Fix boolean value expectations

## Example Fix Pattern

```typescript
// BEFORE - Mixing event data and message params
const eventData = {
  item: noun.name,
  container: target.name,
  preposition: 'in'  // Not needed for message
};
events.push(...context.emitSuccess('put_in', eventData));

// AFTER - Separate concerns
const eventData = {
  itemId: noun.id,
  targetId: target.id,
  preposition: 'in'
};
events.push(context.emit('if.event.put_in', eventData));

const messageParams = {
  item: noun.name,
  container: target.name
};
events.push(...context.emitSuccess('put_in', messageParams));
```

## Testing Approach
1. Fix one category at a time
2. Run tests after each fix to verify improvement
3. Document any architectural decisions
4. Update this document with progress
