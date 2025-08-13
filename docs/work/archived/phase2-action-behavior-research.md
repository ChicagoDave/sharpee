# Phase 2 Research: Action-Behavior Analysis

## Research Objective

Analyze all 44 stdlib actions to determine:
1. Which behaviors each action currently uses
2. Which behaviors have execute methods vs only validation methods
3. Which actions have business logic that needs to be moved to behaviors
4. Implementation plan for each action

## Action-Behavior Mapping

Based on import analysis and code review:

### Container/Storage Actions
- **opening.ts** → OpenableBehavior, LockableBehavior
- **closing.ts** → OpenableBehavior  
- **locking.ts** → LockableBehavior, OpenableBehavior
- **unlocking.ts** → LockableBehavior
- **putting.ts** → ContainerBehavior, SupporterBehavior, OpenableBehavior, IdentityBehavior
- **inserting.ts** → (delegates to putting)
- **removing.ts** → (needs research)
- **taking.ts** → SceneryBehavior, ActorBehavior, ContainerBehavior, WearableBehavior
- **dropping.ts** → ContainerBehavior, WearableBehavior

### Wearable Actions  
- **wearing.ts** → WearableBehavior
- **taking_off.ts** → WearableBehavior

### Switch/Device Actions
- **switching_on.ts** → SwitchableBehavior
- **switching_off.ts** → SwitchableBehavior

### Social/Communication Actions
- **giving.ts** → ActorBehavior, IdentityBehavior  
- **showing.ts** → (needs research)
- **talking.ts** → ActorBehavior
- **throwing.ts** → IdentityBehavior, ActorBehavior, RoomBehavior, OpenableBehavior, ContainerBehavior, SupporterBehavior

### Movement Actions
- **going.ts** → (needs research)
- **entering.ts** → (needs research) 
- **exiting.ts** → (needs research)
- **climbing.ts** → EntryBehavior

### Consumption Actions
- **eating.ts** → EdibleBehavior
- **drinking.ts** → EdibleBehavior, ContainerBehavior, OpenableBehavior

### Sensory Actions
- **examining.ts** → OpenableBehavior, SwitchableBehavior, LockableBehavior, WearableBehavior
- **looking.ts** → (needs research)
- **searching.ts** → (needs research)  
- **listening.ts** → (needs research)
- **smelling.ts** → (needs research)
- **touching.ts** → (needs research)

### Manipulation Actions
- **pulling.ts** → (needs research)
- **pushing.ts** → (needs research)  
- **turning.ts** → (needs research)
- **attacking.ts** → (needs research)

### Meta Actions (likely no behavior changes needed)
- **about.ts** → None
- **again.ts** → None  
- **help.ts** → None
- **inventory.ts** → None
- **quitting.ts** → None
- **restarting.ts** → None
- **restoring.ts** → None
- **saving.ts** → None
- **scoring.ts** → None
- **sleeping.ts** → None
- **waiting.ts** → None

## Available Behaviors

### Core Behaviors
- **OpenableBehavior** - has canOpen(), canClose() validation + open(), close() execute methods 
- **LockableBehavior** - has canLock(), canUnlock(), isLocked() validation + lock(), unlock() execute methods
- **ContainerBehavior** - (needs research on execute methods)
- **SupporterBehavior** - (needs research on execute methods)  
- **WearableBehavior** - (needs research on execute methods)
- **SwitchableBehavior** - (needs research on execute methods)

### Supporting Behaviors  
- **ActorBehavior** - (needs research)
- **EdibleBehavior** - (needs research)
- **EntryBehavior** - (needs research) 
- **ExitBehavior** - (needs research)
- **IdentityBehavior** - (needs research)
- **RoomBehavior** - (needs research)
- **SceneryBehavior** - (needs research)

### Utility Behaviors
- **DoorBehavior** - (needs research)
- **LightSourceBehavior** - (needs research)  
- **ReadableBehavior** - (needs research)

## Behavior Analysis Status

### ✅ COMPLETED RESEARCH

#### OpenableBehavior - Ready for Integration ✅
**Current Status:** HAS correct pattern
- **Validation methods:** `canOpen()`, `canClose()`, `isOpen()` → return boolean
- **Execute methods:** `open()`, `close()` → return `OpenResult`/`CloseResult` 
- **Actions using it:** opening.ts, closing.ts, drinking.ts, examining.ts, throwing.ts, putting.ts
- **Status:** READY - Already follows correct pattern

#### LockableBehavior - Ready for Integration ✅  
**Current Status:** HAS correct pattern
- **Validation methods:** `canLock()`, `canUnlock()`, `isLocked()`, `canLockWith()` → return boolean
- **Execute methods:** `lock()`, `unlock()` → return `LockResult`/`UnlockResult`
- **Actions using it:** opening.ts, locking.ts, unlocking.ts, examining.ts
- **Status:** READY - Already follows correct pattern

### 🔄 ANALYSIS COMPLETED

#### ContainerBehavior - Needs Execute Methods
**Current Status:** MISSING execute methods + Actions have mixed patterns
- **Validation methods:** `canAccept()`, `checkCapacity()`, `isTransparent()` → return boolean  
- **Execute methods:** MISSING - needs `addItem()`, `removeItem()` → return result objects
- **Actions using it:** 
  - **taking.ts** ❌ OLD PATTERN - `Action<TakingState>`, complex capacity logic in action
  - **dropping.ts** ✅ GOOD PATTERN - Simple `Action`, delegates to `ContainerBehavior.canAccept()`
  - **putting.ts** ❌ OLD PATTERN - `Action<PuttingState>`, complex validation logic
- **Status:** NEEDS WORK - Must add execute methods AND update action patterns

#### ActorBehavior - Research Complete  
**Current Status:** HAS some validation methods, needs execute methods
- **Validation methods:** `getCarriedWeight()` (used by taking.ts)
- **Execute methods:** MISSING - needs `takeItem()`, `dropItem()` → return result objects  
- **Actions using it:** taking.ts, giving.ts, talking.ts, throwing.ts
- **Status:** NEEDS WORK - Must add execute methods

### ⏳ TODO RESEARCH
- SupporterBehavior methods
- WearableBehavior methods  
- SwitchableBehavior methods
- ActorBehavior methods
- EdibleBehavior methods
- EntryBehavior methods

## Implementation Pattern Confirmed ✅

**CORRECT PATTERN:**
1. **Behaviors have validation methods** → return `boolean`
2. **Behaviors have execute methods** → return `ResultObject` (not events)
3. **Actions validate** using behavior validation methods
4. **Actions execute** by calling behavior execute methods, get result objects, convert to events

**EXAMPLE:**
```typescript
// In action.validate()
if (!OpenableBehavior.canOpen(entity)) {
  return { valid: false, error: 'already_open' };
}

// In action.execute() 
const result = OpenableBehavior.open(entity);
if (!result.success) {
  return [context.event('action.error', { messageId: 'already_open' })];
}
return [context.event('action.success', { messageId: 'opened' })];
```

## Next Steps

1. **Research Priority 1**: Core container/openable actions (opening, closing, locking, unlocking)
2. **Research Priority 2**: Container manipulation (putting, taking, dropping)  
3. **Research Priority 3**: Wearable actions (wearing, taking_off)
4. **Research Priority 4**: Switch actions (switching_on, switching_off)
5. **Research Priority 5**: Remaining actions by complexity

## Questions for Clarification

1. Should meta actions (about, help, inventory) be excluded from behavior integration?
2. Which behaviors should we prioritize if we need to add new execute methods?
3. Should we group actions by behavior dependency for batch implementation?