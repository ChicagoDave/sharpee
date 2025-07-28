# Action and Event Structure Refactoring Checklist

**Reference**: See `action-event-refactoring-plan-20250728.md` for detailed explanations  
**Timeline**: 4 weeks with validation at each phase

## Phase 1: ActionExecutor Removal ✅ Week 1

### Step 1.1: Verification and Audit
- [ ] Run grep audit commands to find remaining ActionExecutor usage:
  ```bash
  grep -r "ActionExecutor" packages/ --include="*.ts" --exclude-dir=node_modules
  grep -r "execute.*ValidatedCommand.*ActionContext" packages/ --include="*.ts"
  ```
- [ ] Document any unexpected findings
- [ ] Verify no custom story implementations exist
- [ ] Check extension packages for ActionExecutor usage

### Step 1.2: Interface Cleanup
- [ ] Edit `/packages/stdlib/src/actions/types.ts`:
  - [ ] Remove `ActionExecutor` interface (lines 82-106)
  - [ ] Remove deprecated `ActionRegistry` interface (lines 113-138)
  - [ ] Keep only `ProcessedEvents` and `WorldChange` interfaces
  - [ ] Update exports to remove deprecated types
- [ ] Verify TypeScript compilation after changes
- [ ] Check for any broken imports

### Step 1.3: Command Executor Simplification
- [ ] Edit `/packages/engine/src/command-executor.ts`:
  - [ ] Remove dual pattern handling code (lines 201-227)
  - [ ] Remove `'patterns' in action` check
  - [ ] Simplify to single execution path:
    ```typescript
    const actionResult = await action.execute(actionContext);
    ```
  - [ ] Remove any ActionExecutor-related type imports
  - [ ] Update any related comments or documentation

### Step 1.4: Registry Cleanup
- [ ] Edit `/packages/stdlib/src/actions/registry.ts`:
  - [ ] Remove any ActionExecutor-related methods
  - [ ] Remove ActionExecutor type references
  - [ ] Ensure registry only handles Action pattern
  - [ ] Update method signatures if needed

### Step 1.5: Phase 1 Validation
- [ ] Run TypeScript compilation: `npm run typecheck`
- [ ] Run full test suite: `npm run test:ci`
- [ ] Run engine tests specifically: `npm run test -- engine`
- [ ] Run stdlib tests specifically: `npm run test -- stdlib`
- [ ] Check for any deprecation warnings
- [ ] Verify no runtime errors in sample stories

---

## Phase 2: Context Consolidation ✅ Week 2

### Step 2.1: Interface Unification  
- [ ] Edit `/packages/stdlib/src/actions/enhanced-types.ts`:
  - [ ] Create unified `ActionContext` interface with all capabilities:
    ```typescript
    export interface ActionContext {
      // World querying
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
      
      // Event creation
      readonly action: Action;
      event(type: string, data: any): SemanticEvent;
    }
    ```
  - [ ] Update `Action` interface to use unified context:
    ```typescript
    export interface Action {
      execute(context: ActionContext): SemanticEvent[];
      // ... other properties unchanged
    }
    ```
  - [ ] Mark old `EnhancedActionContext` as deprecated temporarily

### Step 2.2: Factory Pattern Implementation
- [ ] Edit `/packages/stdlib/src/actions/enhanced-context.ts`:
  - [ ] Rename `EnhancedActionContextImpl` to `InternalActionContext`
  - [ ] Make `InternalActionContext` class not exported
  - [ ] Create factory function:
    ```typescript
    export function createActionContext(
      world: WorldModel,
      player: IFEntity,
      action: Action,
      command: ValidatedCommand
    ): ActionContext {
      return new InternalActionContext(world, player, action, command);
    }
    ```
  - [ ] Remove old class export
  - [ ] Update all internal type references

### Step 2.3: Factory Function Updates
- [ ] Edit `/packages/stdlib/src/actions/context.ts`:
  - [ ] Remove `createEnhancedContext` function
  - [ ] Update any remaining references to use new factory
  - [ ] Update test utilities to use factory pattern
- [ ] Edit test utility files:
  - [ ] Update `createMockEnhancedContext` → `createMockActionContext`
  - [ ] Update return type to unified `ActionContext`
  - [ ] Ensure same functionality maintained

### Step 2.4: Action Type Updates
- [ ] For each action in `/packages/stdlib/src/actions/standard/*/`:
  - [ ] `taking/index.ts`: Update `EnhancedActionContext` → `ActionContext`
  - [ ] `examining/index.ts`: Update type annotation
  - [ ] `dropping/index.ts`: Update type annotation
  - [ ] `going/index.ts`: Update type annotation
  - [ ] `opening/index.ts`: Update type annotation
  - [ ] Continue for all other actions...
- [ ] Update any action imports that reference old context types

### Step 2.5: Phase 2 Validation
- [ ] Run TypeScript compilation: `npm run typecheck`
- [ ] Verify no type errors from context changes
- [ ] Run full test suite: `npm run test:ci`
- [ ] Specifically test action execution: `npm run test -- actions`
- [ ] Check that factory functions work correctly
- [ ] Verify no runtime behavior changes

---

## Phase 3: Event Structure Standardization ✅ Week 3-4

### Step 3.1: Complete Stdlib Event Migration
Reference: Follow pattern from `examining` action which is correctly implemented

For each action in `/packages/stdlib/src/actions/standard/*/`, verify/fix:

#### Taking Action
- [ ] Edit `taking/index.ts`:
  - [ ] Fix error events to use `action.error` type
  - [ ] Ensure proper structure:
    ```typescript
    context.event('action.error', {
      actionId: this.id,
      messageId: 'cannot_take_item',
      reason: 'cannot_take_item',
      params: { item: noun.name }
    })
    ```
  - [ ] Fix success events to use `action.success` type
  - [ ] Verify all event data includes required fields

#### Dropping Action  
- [ ] Edit `dropping/index.ts`:
  - [ ] Apply same fixes as taking action
  - [ ] Verify error/success event structure
  - [ ] Check domain events use proper format

#### Going Action
- [ ] Edit `going/index.ts`:
  - [ ] Fix event types and structure
  - [ ] Ensure direction/movement events are properly formatted

#### Opening Action
- [ ] Edit `opening/index.ts`:
  - [ ] Fix container/door opening events
  - [ ] Verify proper error handling

#### Continue for all remaining actions:
- [ ] `closing/index.ts`
- [ ] `looking/index.ts` 
- [ ] `inventory/index.ts`
- [ ] `help/index.ts`
- [ ] Any other standard actions...

### Step 3.2: Event Consumer Updates

#### Text Service Template
- [ ] Edit `/packages/text-service-template/src/index.ts`:
  - [ ] Line 109: Change `event.data?.query || event.payload?.query` → `event.payload?.query`
  - [ ] Line 156: Change `event.data?.messageId || event.payload?.messageId` → `event.payload?.messageId`
  - [ ] Line 162: Change `event.data?.params || event.payload?.params` → `event.payload?.params`
  - [ ] Remove all dual property access patterns
  - [ ] Add comments explaining the standardization

#### Test Utils
- [ ] Edit `/packages/stdlib/tests/test-utils/index.ts`:
  - [ ] Line 253: Change triple fallback to clear expectation:
    ```typescript
    // Before
    const eventData = event.payload?.data || event.data?.data || event.data || {};
    // After  
    const eventData = event.payload?.data || {};
    ```
  - [ ] Update other test utilities with similar patterns
  - [ ] Ensure test expectations match new event structure

#### Event Processor (if needed)
- [ ] Review `/packages/event-processor/src/` files:
  - [ ] Check if any files need event property access updates
  - [ ] Verify event processing still works with standardized structure

### Step 3.3: Event Creation Standardization
- [ ] Edit `/packages/stdlib/src/actions/enhanced-context.ts`:
  - [ ] Standardize event wrapping logic:
    ```typescript
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
  - [ ] Remove inconsistent wrapping patterns
  - [ ] Ensure clear separation between action events and domain events

### Step 3.4: Event Structure Documentation
- [ ] Create `/docs/event-structure-guide.md`:
  - [ ] Document when to use `payload` vs legacy `data`
  - [ ] Provide examples of proper action event creation
  - [ ] Provide examples of proper domain event creation
  - [ ] Explain the difference between action events and domain events
  - [ ] Create migration guide for existing code
  - [ ] Add troubleshooting section for common issues

### Step 3.5: Phase 3 Validation
- [ ] Run TypeScript compilation: `npm run typecheck`
- [ ] Run full test suite: `npm run test:ci`
- [ ] Run action-specific tests: `npm run test -- stdlib/actions`
- [ ] Run text generation tests to verify events work with text service
- [ ] Test with sample story to ensure events display correctly
- [ ] Check action golden tests pass with new event structure

---

## Phase 4: Cleanup and Final Validation ✅ Week 4

### Step 4.1: Remove Deprecated Code
- [ ] Search for any remaining deprecated interfaces:
  ```bash
  grep -r "@deprecated" packages/ --include="*.ts"
  ```
- [ ] Remove old `EnhancedActionContext` interface from enhanced-types.ts
- [ ] Remove any unused imports throughout codebase
- [ ] Clean up export statements in index files
- [ ] Remove any temporary compatibility code

### Step 4.2: Import and Export Cleanup
- [ ] For each package, check index.ts files:
  - [ ] `/packages/stdlib/src/index.ts`: Update exports
  - [ ] `/packages/engine/src/index.ts`: Update exports  
  - [ ] `/packages/core/src/index.ts`: Verify exports
- [ ] Search for unused imports:
  ```bash
  # Look for imports that might be unused after refactoring
  grep -r "import.*ActionExecutor" packages/ --include="*.ts"
  grep -r "import.*EnhancedActionContext" packages/ --include="*.ts"
  ```
- [ ] Remove any orphaned type definitions

### Step 4.3: Comprehensive Testing
- [ ] Full build test:
  ```bash
  npm run clean
  npm run build:all
  ```
- [ ] Full test suite:
  ```bash
  npm run test:ci
  npm run typecheck
  ```
- [ ] Package-specific tests:
  ```bash
  npm run test -- core
  npm run test -- engine  
  npm run test -- stdlib
  npm run test -- world-model
  ```
- [ ] Integration tests with sample stories:
  ```bash
  cd stories/cloak-of-darkness
  npm run test
  npm run build
  ```

### Step 4.4: Documentation Updates
- [ ] Update main README.md:
  - [ ] Remove any references to ActionExecutor
  - [ ] Update action development examples
  - [ ] Add reference to new event structure guide
- [ ] Update `/docs/DEVELOPMENT.md`:
  - [ ] Update action creation examples
  - [ ] Update context creation examples
  - [ ] Reference new patterns
- [ ] Update ADR documents:
  - [ ] Mark ADR-041 as fully implemented
  - [ ] Mark ADR-042 as fully implemented  
  - [ ] Add completion notes to relevant ADRs
- [ ] Update any extension development guides

### Step 4.5: Performance Validation
- [ ] Run performance comparison:
  - [ ] Time action execution before/after refactoring
  - [ ] Check memory usage patterns
  - [ ] Verify no significant regression (< 5% difference)
- [ ] Test with complex story scenarios:
  - [ ] Large number of entities
  - [ ] Complex action sequences
  - [ ] Event history accumulation

### Step 4.6: Final Validation Checklist
- [ ] ✅ All TypeScript compilation errors resolved
- [ ] ✅ All tests passing (100% pass rate)
- [ ] ✅ No performance regression detected
- [ ] ✅ Event structure consistency achieved
- [ ] ✅ Single Action interface pattern throughout
- [ ] ✅ Single ActionContext interface (no Enhanced/basic split)
- [ ] ✅ Factory pattern implemented (no Impl suffix)
- [ ] ✅ No deprecated interfaces remaining
- [ ] ✅ Documentation updated and accurate
- [ ] ✅ Sample stories working correctly

---

## Emergency Rollback Plan

If critical issues are discovered:

### Quick Rollback Steps
- [ ] Revert to git commit before current phase
- [ ] Run tests to verify rollback stability
- [ ] Document the issue encountered
- [ ] Plan alternative approach

### Per-Phase Rollback Points
- [ ] **Phase 1 Rollback**: Restore ActionExecutor interfaces and dual handling
- [ ] **Phase 2 Rollback**: Restore EnhancedActionContext separation  
- [ ] **Phase 3 Rollback**: Restore dual property access patterns
- [ ] **Phase 4 Rollback**: Restore any removed deprecated code

## Success Validation

### Before Starting
- [ ] Create git branch: `git checkout -b refactor/action-event-cleanup`
- [ ] Document current test pass rate
- [ ] Document current build time
- [ ] Create backup of key configuration files

### After Each Phase
- [ ] Commit changes with clear message
- [ ] Tag commit for easy rollback reference
- [ ] Document any issues encountered
- [ ] Update this checklist with actual results

### Final Success Criteria
- [ ] ✅ Clean, consistent codebase with single patterns
- [ ] ✅ Improved developer experience with clear APIs
- [ ] ✅ Modern TypeScript practices throughout
- [ ] ✅ Foundation ready for Forge layer implementation
- [ ] ✅ No performance or functionality regressions
- [ ] ✅ Comprehensive documentation updated

---

**Total Estimated Effort**: 4 weeks with proper validation  
**Risk Level**: Low (most migration already complete)  
**Priority**: High (essential prep for Forge layer)