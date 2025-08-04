# Scope Test Decision Summary

## Current Situation

We have several categories of scope-related tests with different issues:

### 1. ✅ Core Scope Tests (`scope-resolver.test.ts`)
- **Status**: All 18 tests passing
- **Decision**: Keep as-is

### 2. ❌ Sensory Extensions (`sensory-extensions.test.ts`)
- **Status**: 7 failures
- **Issue**: Doors not properly configured with room1/room2
- **Decision Needed**: Fix or replace?

### 3. ❌ Witness System (`witness-system.test.ts`)
- **Status**: 3 failures
- **Issue**: Event emission expectations
- **Decision Needed**: Fix event structure or change approach?

### 4. ❌ Action Unit Tests
- **Status**: Many have scope validation tests that shouldn't exist
- **Issue**: We removed scope checking from actions
- **Decision Needed**: Remove these tests entirely or replace?

### 5. ❌ Platform Actions
- **Status**: 12 failures
- **Issue**: Can't access game state (score, moves, etc.)
- **Decision Needed**: How should platform actions access game state?

## Recommended Approach

### Phase 1: Fix What's Valuable
1. **Fix sensory tests** - These test important functionality
   - Add proper door configuration
   - Ensure rooms are connected
   
2. **Fix witness system** - Core to knowledge tracking
   - Understand what events should be emitted
   - Fix expectations

### Phase 2: Remove What's Wrong
1. **Remove scope tests from action unit tests**
   - These duplicate CommandValidator's job
   - Keep only action-specific logic tests

### Phase 3: Rethink Platform Actions
1. **Design decision**: How should platform actions access game state?
   - Option A: Capability system (current attempt)
   - Option B: Different approach?

## Immediate Next Step

Should we:
1. Start fixing sensory tests with proper door setup?
2. First understand the witness system design?
3. Clean out action unit tests first?
4. Address platform actions design issue?

## Key Design Questions

1. **Sensory Mechanics**:
   - Should we hear through closed doors? (Currently: yes)
   - Should smell travel through open doors? (Currently: yes)
   - What makes something "loud" or "very smelly"?

2. **Witness System**:
   - When are witness events emitted?
   - What's the event structure?
   - How does knowledge persistence work?

3. **Platform Actions**:
   - How should save/load/quit access game state?
   - Where does score/moves/etc. live?
   - Is the capability system the right approach?