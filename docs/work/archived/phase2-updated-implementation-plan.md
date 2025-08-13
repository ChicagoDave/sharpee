# Phase 2 Updated Implementation Plan
*Based on research findings and pattern clarification*

## Research Findings Summary

✅ **Pattern Confirmed:**
- Behaviors have **validation methods** (return `boolean`) + **execute methods** (return result objects)  
- Actions call behavior validation methods in `validate()`
- Actions call behavior execute methods in `execute()`, convert results to events
- **Business logic moves FROM actions TO behavior execute methods**

## Implementation Categories

### Category A: Ready Behaviors (No Behavior Changes Needed)
These behaviors already have the correct execute methods that return result objects:

#### OpenableBehavior ✅ READY
- Has: `canOpen()`, `canClose()` → boolean
- Has: `open()`, `close()` → `OpenResult`, `CloseResult`
- Actions to update: opening.ts, closing.ts

#### LockableBehavior ✅ READY  
- Has: `canLock()`, `canUnlock()`, `isLocked()` → boolean
- Has: `lock()`, `unlock()` → `LockResult`, `UnlockResult`
- Actions to update: locking.ts, unlocking.ts

### Category B: Behaviors Need Execute Methods
These behaviors have validation methods but need execute methods added:

#### ContainerBehavior 🔧 NEEDS EXECUTE METHODS
- Has: `canAccept()`, `checkCapacity()` → boolean
- **Missing:** `addItem()`, `removeItem()` → result objects
- Actions waiting: taking.ts, dropping.ts, putting.ts, removing.ts

#### SupporterBehavior 🔍 RESEARCH NEEDED
- Actions waiting: putting.ts, throwing.ts

#### WearableBehavior 🔍 RESEARCH NEEDED  
- Actions waiting: wearing.ts, taking_off.ts, dropping.ts, taking.ts

#### SwitchableBehavior 🔍 RESEARCH NEEDED
- Actions waiting: switching_on.ts, switching_off.ts, examining.ts

### Category C: Research Needed
Need to analyze current methods:
- ActorBehavior, EdibleBehavior, EntryBehavior, etc.

## Implementation Phases

### Phase 2A: Pilot with Ready Behaviors (Immediate)
**Goal:** Validate the pattern works with behaviors that are ready

1. **Update opening.ts** 
   - Move business logic from action to OpenableBehavior.open() 
   - Action calls OpenableBehavior.open(), converts OpenResult to events
   
2. **Update closing.ts**
   - Move business logic from action to OpenableBehavior.close()
   - Action calls OpenableBehavior.close(), converts CloseResult to events

3. **Update locking.ts**
   - Move business logic from action to LockableBehavior.lock()
   - Action calls LockableBehavior.lock(), converts LockResult to events

4. **Update unlocking.ts**
   - Move business logic from action to LockableBehavior.unlock() 
   - Action calls LockableBehavior.unlock(), converts UnlockResult to events

5. **Test pilot thoroughly**
   - All tests pass
   - Cloak of Darkness works
   - Performance acceptable

### Phase 2B: Add Missing Execute Methods
**Goal:** Add execute methods to behaviors that need them

1. **Research remaining behaviors**
   - WearableBehavior, SwitchableBehavior, ContainerBehavior, SupporterBehavior
   - Identify what execute methods they need

2. **Add execute methods to ContainerBehavior**
   - `addItem(container, item, world)` → `AddItemResult`
   - `removeItem(container, item, world)` → `RemoveItemResult` 

3. **Add execute methods to other behaviors as needed**

### Phase 2C: Scale to All Actions
**Goal:** Move all action business logic to behaviors

1. **Container actions:** putting.ts, taking.ts, dropping.ts, removing.ts
2. **Wearable actions:** wearing.ts, taking_off.ts  
3. **Switch actions:** switching_on.ts, switching_off.ts
4. **Social actions:** giving.ts, showing.ts, talking.ts
5. **Remaining actions** by priority

## Success Criteria

### Phase 2A Success
- [ ] opening.ts, closing.ts, locking.ts, unlocking.ts use behavior delegation
- [ ] No business logic remains in these actions
- [ ] All tests pass
- [ ] Actions are thin (< 30 lines)

### Phase 2B Success  
- [ ] All needed behaviors have execute methods
- [ ] Execute methods return appropriate result objects
- [ ] Behavior tests pass in isolation

### Phase 2C Success
- [ ] All 44 actions use behavior delegation  
- [ ] Zero business logic duplication
- [ ] All tests pass
- [ ] Performance within 5% of baseline

## Current Status
- Research: ✅ Pattern confirmed
- Pilot ready: ✅ OpenableBehavior, LockableBehavior ready
- **Next step:** Begin Phase 2A with opening.ts

## Questions for Confirmation
1. Should we start Phase 2A with opening.ts and closing.ts?
2. Should we focus on getting the pilot working before researching more behaviors?
3. Any specific behaviors you want prioritized for research?