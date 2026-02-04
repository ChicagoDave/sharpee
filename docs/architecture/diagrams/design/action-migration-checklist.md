# Action Migration Checklist

## Goal
Update all action files in stdlib to use the new world-model package and ensure they work with the refactored trait system.

## Phase 1: Assess Current State
- [ ] List all action folders in `/packages/stdlib/src/actions/`
- [ ] Identify which actions use world-model imports
- [ ] Document which traits each action depends on
- [ ] Note any constants that need to be defined

## Phase 2: Update Imports
For each action file:
- [ ] Change `from '../../world-model/...'` to `from '@sharpee/world-model'`
- [ ] Update trait imports to use the new structure
- [ ] Update behavior imports if used
- [ ] Ensure Event/createEvent comes from '@sharpee/core'

## Phase 3: Fix Behavior Usage
Many actions instantiate behaviors (old pattern). Need to update to static methods:
- [ ] Change `new ContainerBehavior()` to `ContainerBehavior.methodName()`
- [ ] Remove behavior instantiation
- [ ] Update method calls to static

## Phase 4: Minimal Trait Set
Start with core actions that use our working traits:
- [ ] taking - uses Container, Scenery, Wearable
- [ ] dropping - uses Container  
- [ ] examining - uses Identity
- [ ] opening - uses Openable
- [ ] closing - uses Openable
- [ ] looking - uses Room, Identity

## Phase 5: Stub Missing Traits
For actions that need traits we haven't implemented yet:
- [ ] Create minimal trait definition (data only)
- [ ] Add to TraitType enum
- [ ] Add to implementations.ts (commented out if needed)
- [ ] Document what's missing

## Phase 6: Test Core Loop
- [ ] Ensure taking action compiles
- [ ] Ensure dropping action compiles
- [ ] Ensure examining action compiles
- [ ] Basic movement (if Exit trait is ready)

## Actions to Update

### Core Actions (Priority 1)
- [ ] taking/takingAction.ts
- [ ] dropping/droppingAction.ts  
- [ ] examining/examiningAction.ts
- [ ] looking/lookingAction.ts

### Container Actions (Priority 2)
- [ ] opening/openingAction.ts
- [ ] closing/closingAction.ts
- [ ] removing/removingAction.ts (from container)

### Movement Actions (Priority 3)
- [ ] going/goingAction.ts (uses Exit trait)

### Other Actions (Priority 4)
- [ ] inventory/inventoryAction.ts
- [ ] wearing/wearingAction.ts
- [ ] unlocking/unlockingAction.ts

## Known Issues to Address
1. Behaviors were instantiated in old code - need static methods
2. Constants (IFEvents, ActionFailureReason) need to be accessible
3. Some traits referenced but not implemented (NPC, Dialogue, Door)
4. ActionContext methods may need updating

## Success Criteria
- [ ] Core actions (take, drop, examine, look) compile without errors
- [ ] No circular dependencies between packages
- [ ] Clear separation: world-model has data, stdlib has game logic
