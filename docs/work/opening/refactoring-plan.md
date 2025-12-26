# Opening Action Refactoring Plan

## Immediate Tasks (Must Do)

### 1. Fix Context Pollution
**Current Problem**: Using `(context as any)._openResult`
**Solution**: Migrate to `context.sharedData.openResult`

```typescript
// Before (line 100)
(context as any)._openResult = result;

// After
context.sharedData.openResult = result;

// Before (line 156)
const result = (context as any)._openResult as IOpenResult;

// After  
const result = context.sharedData.openResult as IOpenResult;
```

### 2. Type Safety for SharedData
**Add type definition for opening's shared data**

Create `opening-types.ts`:
```typescript
export interface OpeningSharedData {
  openResult?: IOpenResult;
}
```

### 3. Improve Empty Container Message
**Current**: Basic "its_empty" message
**Needed**: More contextual feedback

```typescript
// Enhanced empty container handling
if (isContainer && contents.length === 0) {
  // First time opening empty container could be disappointing
  // Subsequent times just factual
  messageId = context.sharedData.isFirstOpen ? 'empty_reveal' : 'its_empty';
}
```

## Enhanced Features (Should Do)

### 1. First-Time Opening Detection
Track whether this is the first time opening this object:

```typescript
// In execute()
const hasBeenOpened = context.world.getState(noun.id, 'hasBeenOpened') || false;
if (!hasBeenOpened) {
  context.world.setState(noun.id, 'hasBeenOpened', true);
  context.sharedData.isFirstOpen = true;
}
```

### 2. Better Content Revelation
Group similar items and highlight important ones:

```typescript
// Smart content listing
const contents = isContainer ? context.world.getContents(noun.id) : [];
const groupedContents = groupContentsByType(contents);
const importantItems = contents.filter(e => e.has(TraitType.IMPORTANT));
```

### 3. Custom Open Messages
Support per-object custom messages:

```typescript
// Check for custom open message
const customMessage = noun.getProperty('openMessage');
if (customMessage && context.sharedData.isFirstOpen) {
  // Use custom message for first opening
}
```

## Test Coverage Additions

### New Test Cases Needed

1. **Empty Container Test**
   - Test "its_empty" message appears
   - Verify no contents listed

2. **Many Items Test**  
   - Container with 10+ items
   - Verify listing format

3. **First vs Subsequent Test**
   - Open twice, different messages

4. **Custom Message Test**
   - Object with custom open message
   - Verify it's used

5. **Transparent Container Test**
   - Open transparent container
   - Already visible contents

## Implementation Order

### Phase 1: Core Fixes (Do First)
1. ✅ Create `opening-types.ts` with SharedData interface
2. ✅ Update execute() to use sharedData
3. ✅ Update report() to read from sharedData
4. ✅ Run existing tests to ensure no breakage

### Phase 2: Message Improvements
1. Add first-time detection logic
2. Enhance empty container messages
3. Add custom message support
4. Update tests

### Phase 3: Content Display
1. Implement content grouping
2. Add importance highlighting
3. Handle many-item cases
4. Create new tests

### Phase 4: Advanced Features (Future)
1. Partial opening states (ajar)
2. Tool-based opening
3. Implicit opening
4. Remote opening

## Code Locations

### Files to Modify
- `/packages/stdlib/src/actions/standard/opening/opening.ts` - Main implementation
- `/packages/stdlib/src/actions/standard/opening/opening-types.ts` - New type definitions
- `/packages/stdlib/src/actions/standard/opening/opening-data.ts` - Data builder config
- `/packages/stdlib/src/actions/standard/opening/opening-events.ts` - Event types

### Files to Review
- `/packages/world-model/src/behaviors/openable-behavior.ts` - Behavior implementation
- `/packages/world-model/src/traits/openable.ts` - Trait definition

## Success Criteria

### Must Have
- ✅ No context pollution
- ✅ Type-safe shared data
- ✅ All existing tests pass
- ✅ Clean validate/execute/report separation

### Should Have  
- First-time opening detection
- Better empty container handling
- Custom message support
- Enhanced content display

### Could Have
- Partial states
- Tool integration
- Implicit opening
- Advanced scoping

## Risk Mitigation

### Backward Compatibility
- Ensure all existing events still fire
- Maintain same event data structure
- Keep message IDs consistent

### Testing Strategy
1. Run existing tests after each change
2. Add new tests for new features
3. Manual testing with Cloak of Darkness story

### Rollback Plan
- Git commit after each phase
- Can revert if issues found
- Keep old pattern commented initially