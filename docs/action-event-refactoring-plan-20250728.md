# Action and Event Structure Refactoring Plan

**Date**: 2025-07-28  
**Priority**: High - Critical architectural debt cleanup  
**Scope**: Remove deprecated patterns, consolidate APIs, standardize event structure

## Overview

This refactoring addresses three critical architectural debt issues identified in the Sharpee codebase:

1. **ActionExecutor removal** - Complete removal of deprecated ActionExecutor pattern
2. **Context consolidation** - Merge ActionContext and EnhancedActionContext  
3. **Event standardization** - Resolve data vs payload inconsistency

## Issue Analysis Summary

### ActionExecutor Status
- ✅ **Migration Complete**: All actions use modern Action pattern
- ✅ **Tests Updated**: All tests use Action pattern
- ❌ **Legacy Code Remaining**: Deprecated interfaces and dual handling in command executor
- **Impact**: Clean removal with minimal risk

### Context Duplication
- **Problem**: ActionContext vs EnhancedActionContext creates unnecessary complexity
- **Reality**: EnhancedActionContext is the de facto standard for all actions
- **Solution**: Consolidate to single interface - event creation is fundamental, not an "enhancement"

### Event Structure Confusion
- **Problem**: Events have both `data` and `payload` properties with inconsistent usage
- **Root Cause**: Legacy compatibility layer in core `createEvent()` function
- **Current State**: Defensive programming with dual property checks everywhere
- **Impact**: Confusing API, maintenance burden, difficult debugging

## Refactoring Plan

### Phase 1: ActionExecutor Removal (Week 1)
**Goal**: Complete removal of deprecated ActionExecutor pattern

#### Step 1.1: Verification and Audit
```bash
# Verify no remaining implementations
grep -r "ActionExecutor" packages/ --include="*.ts" --exclude-dir=node_modules
grep -r "execute.*ValidatedCommand.*ActionContext" packages/ --include="*.ts"
```

#### Step 1.2: Interface Cleanup
**Files to modify**:
- `/packages/stdlib/src/actions/types.ts`
  - Remove `ActionExecutor` interface (lines 82-106)
  - Remove deprecated `ActionRegistry` interface (lines 113-138)
  - Keep only modern interfaces

#### Step 1.3: Command Executor Simplification  
**File**: `/packages/engine/src/command-executor.ts`
- Remove dual pattern handling (lines 201-227)
- Remove `'patterns' in action` check
- Simplify to single execution path:
```typescript
// Before: Dual pattern handling
if ('patterns' in action) {
  const actionResult = await (action as Action).execute(actionContext);
} else {
  const semanticEvents = (action as any).execute(command, actionContext);
}

// After: Single pattern
const actionResult = await action.execute(actionContext);
```

#### Step 1.4: Registry Cleanup
**File**: `/packages/stdlib/src/actions/registry.ts`
- Remove any ActionExecutor-related methods
- Ensure registry only handles Action pattern

**Validation**: Run full test suite, verify no breaking changes

---

### Phase 2: Context Consolidation (Week 2)  
**Goal**: Merge ActionContext and EnhancedActionContext into single interface

#### Step 2.1: Interface Unification
**File**: `/packages/stdlib/src/actions/enhanced-types.ts`

Create unified ActionContext interface:
```typescript
export interface ActionContext {
  // World querying capabilities
  readonly world: WorldModel;
  readonly player: IFEntity;
  readonly currentLocation: IFEntity;
  readonly command: ValidatedCommand;
  
  canSee(entity: IFEntity): boolean;
  canReach(entity: IFEntity): boolean;  
  canTake(entity: IFEntity): boolean;
  isInScope(entity: IFEntity): boolean;
  getVisible(): IFEntity[];
  getInScope(): IFEntity[];
  
  // Event creation capabilities (formerly "enhanced")
  readonly action: Action;
  event(type: string, data: any): SemanticEvent;
}

// Update Action interface
export interface Action {
  execute(context: ActionContext): SemanticEvent[];
  // ... other properties remain the same
}
```

#### Step 2.2: Implementation Updates with Factory Pattern
**File**: `/packages/stdlib/src/actions/enhanced-context.ts`

Apply modern TypeScript factory pattern to eliminate `Impl` suffix confusion:

```typescript
// Before: Confusing Impl suffix
class EnhancedActionContextImpl implements EnhancedActionContext {
  // ... implementation
}

// After: Clean factory pattern
class InternalActionContext implements ActionContext {
  // Same implementation, but not exported
}

// Export only the factory function
export function createActionContext(
  world: WorldModel,
  player: IFEntity, 
  action: Action,
  command: ValidatedCommand
): ActionContext {
  return new InternalActionContext(world, player, action, command);
}
```

**Benefits**:
- ✅ No naming conflicts between interface and implementation
- ✅ Follows TypeScript best practices (no `I` prefix, no `Impl` suffix)
- ✅ Hides implementation details completely
- ✅ Easy to add different implementations (test, mock contexts)
- ✅ Aligns with existing factory patterns in codebase

#### Step 2.3: Factory Function Updates
**File**: `/packages/stdlib/src/actions/context.ts`
- Remove `createEnhancedContext` function (replaced by factory in enhanced-context.ts)
- Update all imports to use new `createActionContext` factory
- Update test utilities to use factory pattern

#### Step 2.4: Action Updates
**Files**: All action implementations in `/packages/stdlib/src/actions/standard/*/`
- Update type annotations from `EnhancedActionContext` to `ActionContext`
- No functional changes required

**Validation**: TypeScript compilation, full test suite

---

### Phase 3: Event Structure Standardization (Week 3-4)
**Goal**: Resolve data vs payload inconsistency, complete stdlib event migration

#### Step 3.1: Complete Stdlib Event Migration
**Current Issue**: Actions using wrong event types and missing required fields

**Files to fix**: All actions in `/packages/stdlib/src/actions/standard/*/`

**Required Changes per Action**:
```typescript
// Before: Inconsistent event creation
context.event('if.event.error', { messageId: 'no_target' })

// After: Proper action event structure  
context.event('action.error', {
  actionId: this.id,
  messageId: 'no_target',
  reason: 'no_target',
  params: {}
})
```

**Reference Implementation**: Follow pattern from `examining` action which is correctly implemented

#### Step 3.2: Event Consumer Updates
**Files requiring dual property handling removal**:

1. **Text Service Template** (`/packages/text-service-template/src/index.ts`):
```typescript
// Before: Defensive dual property access
const query = event.data?.query || event.payload?.query;
const messageId = event.data?.messageId || event.payload?.messageId;

// After: Standardized access
const query = event.payload?.query;
const messageId = event.payload?.messageId;
```

2. **Test Utils** (`/packages/stdlib/tests/test-utils/index.ts`):
```typescript
// Before: Triple fallback
const eventData = event.payload?.data || event.data?.data || event.data || {};

// After: Clear expectations
const eventData = event.payload?.data || {};
```

#### Step 3.3: Event Creation Standardization
**File**: `/packages/stdlib/src/actions/enhanced-context.ts`

Standardize the event wrapping logic:
```typescript
// Establish clear patterns for different event types
if (type.startsWith('action.')) {
  // Action events: structured payload with nested data
  const payload = {
    actionId: this.action.id,
    messageId: eventData.messageId,
    reason: eventData.reason,
    params: eventData.params || {},
    data: eventData.data,
    timestamp: Date.now()
  };
  return coreCreateEvent(type, payload, entities);
} else {
  // Domain events: direct payload
  return coreCreateEvent(type, eventData, entities);
}
```

#### Step 3.4: Documentation Update
**Create Event Structure Guide** (`/docs/event-structure-guide.md`):
- Document when to use `payload` vs legacy `data`
- Provide examples of proper event creation
- Explain action event vs domain event patterns
- Migration guide for existing code

**Validation**: Event structure tests, text generation tests, action golden tests

---

### Phase 4: Cleanup and Validation (Week 4)
**Goal**: Final cleanup, comprehensive testing, documentation updates

#### Step 4.1: Remove Deprecated Code
- Remove old interfaces and types marked as deprecated
- Remove unused imports and type references
- Update export statements

#### Step 4.2: Comprehensive Testing
```bash
# Test sequence
npm run build:all
npm run test:ci  
npm run typecheck

# Test specific areas
npm run test -- stdlib
npm run test -- engine
npm run test -- actions
```

#### Step 4.3: Documentation Updates
- Update README files to remove references to deprecated patterns
- Update ADR documents to reflect completion status
- Update developer guides and examples
- Create migration guide for any external consumers

#### Step 4.4: Performance Validation
- Ensure no performance regression from changes  
- Validate memory usage patterns
- Test with sample stories

## Risk Assessment

### Low Risk Areas
- **ActionExecutor removal**: Migration already complete, no active usage found
- **Context consolidation**: Type-only changes, no runtime behavior changes
- **Event standardization**: Following established patterns, extensive test coverage

### Mitigation Strategies
- **Incremental approach**: Each phase can be validated independently
- **Comprehensive testing**: Full test suite at each phase
- **Backup strategy**: Git branches for each phase
- **Rollback plan**: Clear revert commits if issues discovered

## Success Criteria

### Technical Metrics
- ✅ All TypeScript compilation errors resolved
- ✅ All tests passing after each phase
- ✅ No performance regression (< 5% difference)
- ✅ Event structure consistency (no dual property access)

### Code Quality Metrics
- ✅ Single Action interface pattern throughout codebase
- ✅ Single ActionContext interface (no Enhanced/basic split)  
- ✅ Consistent event structure (payload for new, data for legacy GameEvent)
- ✅ No deprecated interfaces remaining

### Developer Experience
- ✅ Simplified mental model - one way to do each thing
- ✅ Clear event creation patterns
- ✅ Improved TypeScript experience
- ✅ Updated documentation reflecting changes

## Timeline

**Week 1**: ActionExecutor removal, interface cleanup  
**Week 2**: Context consolidation, type updates  
**Week 3**: Event standardization, stdlib migration  
**Week 4**: Testing, cleanup, documentation  

**Total Effort**: 4 weeks with proper testing and validation

## Post-Refactoring Benefits

1. **Simplified Architecture**: Single patterns instead of dual/deprecated approaches
2. **Better Developer Experience**: Clear, consistent APIs with modern TypeScript patterns
3. **Maintainability**: Less code to maintain, fewer edge cases, no naming confusion
4. **Type Safety**: Improved TypeScript experience with unified interfaces and factory pattern
5. **Performance**: Reduced defensive programming, cleaner code paths
6. **Modern TypeScript Practices**: Factory pattern eliminates `Impl` suffix anti-pattern
7. **Foundation for Forge**: Clean core APIs ready for fluent layer implementation

This refactoring is essential preparation for the Forge authoring layer, as it establishes clean, consistent patterns that can be confidently abstracted.