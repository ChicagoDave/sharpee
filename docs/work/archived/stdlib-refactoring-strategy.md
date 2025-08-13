# Stdlib Behavior Integration Strategy

## The Problem

We have a fundamental architectural issue: stdlib actions duplicate logic that already exists in world-model behaviors. This creates maintenance problems, inconsistent validation, and wastes our well-designed behavior abstraction layer.

## The Root Cause

When we designed the behavior system, we established a clean two-phase pattern:
1. **Behaviors validate** (canOpen, canClose, isLocked, etc.)
2. **Behaviors execute** (open, close, lock, etc.) 

But stdlib actions completely ignore this pattern and reimplement everything.

## The Solution Strategy

We will fix this in **two distinct phases** to minimize risk and maintain working functionality throughout the process.

### Phase 1: Establish Validate/Execute Pattern ✅ COMPLETE

**Goal**: Ensure all actions follow a consistent two-phase pattern before attempting behavior integration.

**What This Phase Does**:
- Adds required `validate()` method to all actions
- Moves validation logic out of `execute()` into `validate()`  
- Uses simple `ValidationResult { valid: boolean, error?: string }`
- Actions still create their own events (no behavior changes)
- Establishes architectural discipline

**What This Phase Does NOT Do**:
- Change behavior signatures
- Change event creation patterns
- Remove logic duplication (that's Phase 2)

**Status**: ✅ Complete - All 53 actions now use validate/execute pattern

### Phase 2: Behavior Integration (NEXT)

**Goal**: Replace duplicated action logic with proper behavior delegation.

**What This Phase Does**:
- Updates behaviors to accept ActionContext for event creation
- Changes behaviors to return complete, properly formatted events
- Refactors actions to become thin orchestrators that validate + delegate
- Removes all duplicated business logic from actions
- Establishes single source of truth for all game logic

**What This Phase Changes**:
- Behavior method signatures (add ActionContext parameter)
- Behavior return types (events instead of state changes)
- Action execute() methods (delegate instead of implement)
- Event ownership (behaviors create all events)

## Architectural Patterns

### Current State After Phase 1

```typescript
// Action handles validation and event creation
class OpeningAction extends Action {
  validate(context: ActionContext): ValidationResult {
    // Basic validation using behavior queries
    if (!OpenableBehavior.canOpen(entity)) {
      return { valid: false, error: 'already_open' };
    }
    return { valid: true };
  }
  
  execute(context: ActionContext): SemanticEvent[] {
    // Action still creates events and handles state changes
    const openable = entity.get(TraitType.OPENABLE);
    openable.isOpen = true; // Direct state manipulation
    
    return [
      context.event('if.event.opened', { ... }),
      context.event('action.success', { ... })
    ];
  }
}
```

### Target State After Phase 2

```typescript
// Behavior owns complete event creation
class OpenableBehavior {
  static open(entity: IFEntity, context: ActionContext): SemanticEvent[] {
    const openable = this.require(entity, TraitType.OPENABLE);
    
    // Handle edge cases that validation might miss
    if (openable.isOpen) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'already_open',
        params: { item: entity.name }
      })];
    }
    
    // Perform state change
    openable.isOpen = true;
    
    // Create complete event set
    return [
      context.event('if.event.opened', {
        targetId: entity.id,
        targetName: entity.name,
        // ... full event data
      }),
      context.event('action.success', {
        actionId: context.action.id,
        messageId: 'opened',
        params: { item: entity.name }
      })
    ];
  }
}

// Action becomes thin orchestrator
class OpeningAction extends Action {
  validate(context: ActionContext): ValidationResult {
    // Same validation as Phase 1
    if (!OpenableBehavior.canOpen(entity)) {
      return { valid: false, error: 'already_open' };
    }
    return { valid: true };
  }
  
  execute(context: ActionContext): SemanticEvent[] {
    const entity = context.command.directObject!.entity!;
    
    // Pure delegation - no logic, no event creation
    return OpenableBehavior.open(entity, context);
  }
}
```

## Design Decisions

### Why Behaviors Own Events

**Option A**: Actions convert behavior results to events
- Pro: Clean separation of concerns
- Con: Impedance mismatch, conversion logic, two event creation paths

**Option B**: Behaviors create events directly ✅ CHOSEN
- Pro: Single source of truth, no conversion, simpler actions
- Con: Behaviors need ActionContext dependency

We chose Option B because it eliminates the impedance mismatch between behavior results and expected events.

### Why Two Phases

**Alternative**: Do everything at once
- Risk: 50+ actions break simultaneously
- Risk: Behavior changes affect multiple systems
- Risk: Hard to isolate failures

**Our Approach**: Sequential phases ✅ CHOSEN
- Phase 1: Establish pattern discipline (complete)
- Phase 2: Integrate behaviors (next)
- Each phase can be tested and validated independently
- Clear rollback points if issues arise

## Success Criteria

### Phase 1 Success Criteria ✅ ACHIEVED
- [x] All actions have validate() method
- [x] All actions use consistent ValidationResult
- [x] No validation logic in execute() methods
- [x] All tests still pass
- [x] Cloak of Darkness still works

### Phase 2 Success Criteria (NEXT)
- [ ] No business logic duplication between actions and behaviors
- [ ] All state changes go through behaviors
- [ ] All trait validation uses behavior methods
- [ ] Actions are thin orchestrators (< 20 lines each)
- [ ] Single source of truth for all game rules

## Risk Mitigation

### What Could Go Wrong
1. **Behavior signature changes break other systems** 
   - Mitigation: Update behaviors incrementally, maintain compatibility
2. **Event format changes break tests**
   - Mitigation: Behavior events should match existing test expectations
3. **Performance regressions from additional indirection**
   - Mitigation: Profile before/after, optimize if needed
4. **Complex behaviors become hard to understand**
   - Mitigation: Keep behaviors focused, add comprehensive documentation

### Rollback Strategy
- Phase 1: Revert to original action signatures (validate becomes canExecute)
- Phase 2: Revert behavior signatures, restore action logic

## Next Steps

1. **Review and approve this strategy** before proceeding
2. **Create detailed implementation checklist** for Phase 2
3. **Start with OpeningAction behavior integration** (smallest, well-understood)
4. **Validate approach** before scaling to other actions
5. **Update architectural tests** to enforce new patterns