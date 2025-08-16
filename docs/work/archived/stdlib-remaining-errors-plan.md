# Stdlib Remaining Errors Plan
*Fixing the final 89 TypeScript errors to get stdlib compiling*

## Current Status
- Started with: 153 errors
- Currently at: 89 errors  
- Reduction: 64 errors fixed (42% complete)

## Error Analysis from Build Log

### Category 1: Error Object Format (≈45 errors)
**Pattern**: `Type '{ messageId: string; reason: string; }' is not assignable to type 'string'`

These occur when ValidationResult.error expects a string but gets an object.

**Files affected**:
- again.ts (3 instances)
- giving.ts (7 instances)  
- going.ts (11 instances)
- talking.ts (6 instances)
- throwing.ts (5 instances)
- turning.ts (4 instances)
- closing.ts (1 instance)
- touching.ts (1 instance)
- And potentially others

**Fix**: Convert error objects to strings
```typescript
// OLD
return { valid: false, error: { messageId: 'no_item', reason: 'no_item' } };

// NEW  
return { valid: false, error: 'no_item' };
```

### Category 2: Execute Method Signatures (≈18 errors)
**Pattern**: `Type '(context: ActionContext, state: SomeState) => SemanticEvent[]' is not assignable`

Actions are still using the old execute signature with state parameter.

**Files affected**:
- about.ts
- again.ts
- examining.ts
- help.ts
- inventory.ts
- pulling.ts
- pushing.ts
- quitting.ts
- restarting.ts
- restoring.ts
- saving.ts
- scoring.ts
- showing.ts
- sleeping.ts
- smelling.ts
- touching.ts
- turning.ts

**Fix**: Remove state parameter from execute()
```typescript
// OLD
execute(context: ActionContext, state: SomeState): SemanticEvent[] {

// NEW
execute(context: ActionContext): SemanticEvent[] {
```

### Category 3: Remaining isValid Properties (≈15 errors)
**Pattern**: `'isValid' does not exist in type 'ValidationResult'. Did you mean 'valid'?`

Some files still have isValid instead of valid.

**Files affected**:
- about.ts
- again.ts
- examining.ts
- help.ts
- inventory.ts
- pulling.ts
- pushing.ts
- quitting.ts
- restarting.ts
- restoring.ts
- saving.ts
- scoring.ts
- showing.ts
- sleeping.ts
- smelling.ts
- touching.ts
- turning.ts

**Fix**: Replace isValid with valid

### Category 4: State Property Issues (≈6 errors)
**Pattern**: `'state' does not exist in type 'ValidationResult'`

Old pattern trying to pass state through ValidationResult.

**Files affected**:
- attacking.ts (2 instances)
- climbing.ts (3 instances)
- waiting.ts (2 instances)

**Fix**: Remove state property, restructure to not pass state through validation

### Category 5: Special/Unique Issues (≈5 errors)

#### trace.ts
- validate() returns boolean instead of ValidationResult

#### context.ts  
- Missing validate property in action definition

#### examining.ts
- Assigning SemanticEvent to string (lines 55, 67)

#### inserting.ts
- Extra argument in event call (line 141)

#### talking.ts & throwing.ts
- Spread operator issues with error (lines 127, 148)

## Implementation Strategy

### Phase A: Quick Fixes (High Impact)
1. Fix all execute() method signatures (remove state parameter)
2. Fix all remaining isValid → valid properties
3. These are simple find/replace operations that will eliminate ~33 errors

### Phase B: Error Object Format
1. Systematically fix error object format in each file
2. Change `{ messageId: 'x', reason: 'x' }` to just `'x'`
3. Preserve params as separate property where needed
4. This will eliminate ~45 errors

### Phase C: State Property Cleanup
1. Remove state property from ValidationResult returns
2. Refactor actions that try to pass state through validation
3. This will eliminate ~6 errors

### Phase D: Special Cases
1. Fix trace.ts validation signature
2. Fix context.ts missing validate
3. Fix examining.ts SemanticEvent assignments
4. Fix spread operator issues
5. This will eliminate final ~5 errors

## Success Metrics
- [ ] All 89 TypeScript errors resolved
- [ ] `pnpm --filter '@sharpee/stdlib' build` succeeds with 0 errors
- [ ] No functional regressions introduced

## Risk Mitigation
- Each phase can be tested independently
- Changes are mostly mechanical (find/replace)
- Original behavior is preserved (only fixing type mismatches)