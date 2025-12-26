# ActionContext SharedData Implementation Checklist

## Phase 1: Core Infrastructure ✅

### Update ActionContext Interface
- [x] Open `packages/stdlib/src/actions/enhanced-types.ts`
- [x] Add `sharedData: Record<string, any>` property to ActionContext interface
- [x] Add JSDoc documentation explaining purpose and usage
- [x] Include example in JSDoc

### Update ActionContext Factory
- [x] Open `packages/engine/src/action-context-factory.ts`
- [x] Add `sharedData: {}` to the returned object
- [x] Ensure it's initialized as empty object

### Verify No Breaking Changes
- [x] Run `pnpm build` to check TypeScript compilation
- [x] Run `pnpm test` to ensure existing tests pass
- [x] Check that command-executor still works without modification

## Phase 2: Migrate Taking Action (Proof of Concept) ✅

### Analyze Current Implementation
- [x] Open `packages/stdlib/src/actions/standard/taking/taking.ts`
- [x] Identify all context pollution (`(context as any)._*`)
- [x] List fields being stored:
  - [x] `_previousLocation` (was never actually set!)
  - [x] `_implicitlyRemoved` (was never actually set!)
  - [x] Fixed by adding proper capture in execute()

### Update Execute Method
- [x] Added `context.sharedData.previousLocation = ...` to capture before mutation
- [x] Added `context.sharedData.implicitlyRemoved = ...` for worn items
- [x] Added `context.sharedData.wasWorn = ...` for tracking
- [x] Ensure execute() returns void (not events)

### Update Report Method
- [x] Replace `(context as any)._previousLocation` reads with `context.sharedData.previousLocation`
- [x] Replace `(context as any)._implicitlyRemoved` reads with `context.sharedData.implicitlyRemoved`
- [x] Updated taking-data.ts to use sharedData

### Test Taking Action
- [x] Run taking action tests: `pnpm --filter '@sharpee/stdlib' test taking`
- [x] Verify golden tests pass
- [x] All tests passing!

## Phase 3: Discovery - Find Other Context Pollution ✅

### Search for Context Pollution Patterns
- [x] Search for `(context as any)` across stdlib actions
- [x] Search for `context._` patterns
- [x] Search for type assertions on context

### Document Findings
- [x] List all actions using context pollution
- [x] Note what data they're storing
- [x] Estimate complexity of migration for each

### Priority List
- [x] Create ordered list for migration:
  1. [x] **opening**: `_openResult` (IOpenResult)
  2. [x] **closing**: `_closeResult` (ICloseResult)
  3. [x] **dropping**: `_dropResult` (IDropItemResult)
  4. [x] **putting**: `_targetPreposition`, `_putResult` (IAddItemResult)
  5. [x] **removing**: `_removeResult`, `_takeResult` (IRemoveItemResult, ITakeItemResult)
  6. [x] **entering**: `_enteringState` (EnteringExecutionState)
  7. [x] **exiting**: `_exitingState` (ExitingExecutionState)
  8. [x] **going**: `_isFirstVisit` (boolean)
  9. [x] **inserting**: `_modifiedContext` (ModifiedContext)
  10. [x] **looking**: `verboseMode`, `visitedLocations` (display state)
  11. [x] **attacking**: `world.isPeaceful` (world state check)

## Phase 4: Systematic Migration ⬜

### For Each Action
- [ ] **Action Name: __________**
  - [ ] Update execute() to use sharedData
  - [ ] Update report() to use sharedData
  - [ ] Remove context pollution
  - [ ] Run action-specific tests
  - [ ] Verify functionality

- [ ] **Action Name: __________**
  - [ ] Update execute() to use sharedData
  - [ ] Update report() to use sharedData
  - [ ] Remove context pollution
  - [ ] Run action-specific tests
  - [ ] Verify functionality

- [ ] **Action Name: __________**
  - [ ] Update execute() to use sharedData
  - [ ] Update report() to use sharedData
  - [ ] Remove context pollution
  - [ ] Run action-specific tests
  - [ ] Verify functionality

### Final Verification
- [ ] Run full test suite: `pnpm test`
- [ ] Check for any remaining `(context as any)` patterns
- [ ] Verify no context pollution remains

## Phase 5: Documentation ⬜

### Update Developer Guides
- [ ] Update action development guide
- [ ] Add sharedData usage examples
- [ ] Document best practices

### Create Examples
- [ ] Simple data passing example
- [ ] Complex multi-field example
- [ ] Pattern for type safety

### Add Migration Guide
- [ ] Document how to migrate from context pollution
- [ ] Provide before/after examples
- [ ] List common pitfalls

## Quality Checks ⬜

### Code Quality
- [ ] No TypeScript errors
- [ ] No lint warnings
- [ ] No test failures
- [ ] No context pollution remaining

### Documentation
- [ ] Interface well documented
- [ ] Usage examples clear
- [ ] Migration path documented

### Performance
- [ ] No performance regression
- [ ] Memory usage acceptable
- [ ] No memory leaks from sharedData

## Sign-off ⬜

### Review Checklist
- [ ] All phases complete
- [ ] All tests passing
- [ ] Documentation updated
- [ ] No context pollution remains

### Approval
- [ ] Code reviewed
- [ ] Functionality verified
- [ ] Ready for merge

## Notes Section

### Discovered Issues
_List any problems encountered during implementation_

### Decisions Made
_Document any design decisions or trade-offs_

### Future Improvements
_Note any enhancements for later consideration_

---

## Quick Test Commands

```bash
# Build check
pnpm build

# Test taking action
pnpm --filter '@sharpee/stdlib' test taking

# Test all actions
pnpm --filter '@sharpee/stdlib' test

# Search for context pollution
grep -r "(context as any)" packages/stdlib/src/actions/

# Search for underscore properties
grep -r "context\._" packages/stdlib/src/actions/
```