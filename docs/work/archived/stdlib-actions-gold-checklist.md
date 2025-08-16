# Stdlib Actions Gold Checklist
*Systematic fixes to get all actions compiling*

## Phase 1: Import Fixes (8 files) ✅
Quick find/replace: `Entity` → `IFEntity`

- [x] inventory.ts - Fix Entity import
- [x] pulling.ts - Fix Entity import
- [x] pushing.ts - Fix Entity import
- [x] showing.ts - Fix Entity import
- [x] sleeping.ts - Fix Entity import
- [x] smelling.ts - Fix Entity import
- [x] touching.ts - Fix Entity import
- [x] turning.ts - Fix Entity import

## Phase 2: Generic Type Removal (18 files) ✅
Remove `<State>` from `Action<State>` and `ValidationResult<State>`

- [x] about.ts - Remove Action generic
- [x] again.ts - Remove Action generic
- [x] examining.ts - Remove Action generic
- [x] help.ts - Remove Action generic
- [x] inserting.ts - Remove Action generic
- [x] inventory.ts - Remove Action generic
- [x] pulling.ts - Remove Action generic
- [x] pushing.ts - Remove Action generic
- [x] quitting.ts - Remove Action generic
- [x] restarting.ts - Remove Action generic
- [x] restoring.ts - Remove Action generic
- [x] saving.ts - Remove Action generic
- [x] scoring.ts - Remove Action generic
- [x] showing.ts - Remove Action generic
- [x] sleeping.ts - Remove Action generic
- [x] smelling.ts - Remove Action generic
- [x] touching.ts - Remove Action generic
- [x] turning.ts - Remove Action generic
- [x] attacking.ts - Remove ValidationResult generic
- [x] climbing.ts - Remove ValidationResult generic
- [x] listening.ts - Remove ValidationResult generic
- [x] waiting.ts - Remove ValidationResult generic

## Phase 3: ValidationResult Format Fixes (9 files) ✅
Fix `isValid` → `valid` and error object → string

### entering.ts ✅
- [x] Change all `isValid:` to `valid:`
- [x] Convert error objects to strings
- [x] Fix validation check in execute()

### exiting.ts ✅
- [x] Change all `isValid:` to `valid:`
- [x] Convert error objects to strings
- [x] Fix validation check in execute()

### giving.ts ✅
- [x] Change all `isValid:` to `valid:`
- [x] Convert error objects to strings (partial)
- [x] Fix validation check in execute()
- [x] Fix spread operator issue with error

### going.ts ✅
- [x] Change all `isValid:` to `valid:`
- [ ] Convert error objects to strings
- [ ] Fix validation check in execute()

### inserting.ts ⚠️
- [ ] Change all `isValid:` to `valid:`
- [ ] Convert error objects to strings
- [ ] Fix validation check in execute()
- [ ] Fix extra argument in event call

### looking.ts ✅
- [x] Change all `isValid:` to `valid:`
- [x] Convert error objects to strings

### searching.ts ✅
- [x] Change all `isValid:` to `valid:`
- [x] Convert error objects to strings

### talking.ts ✅
- [x] Change all `isValid:` to `valid:`
- [ ] Convert error objects to strings
- [ ] Fix validation check in execute()
- [ ] Fix spread operator issue with error

### throwing.ts ✅
- [x] Change all `isValid:` to `valid:`
- [ ] Convert error objects to strings
- [ ] Fix validation check in execute()
- [ ] Fix spread operator issue with error

## Phase 4: Additional Format Fixes

### closing.ts
- [ ] Fix error format on line 85 (object → string)

### attacking.ts
- [ ] Remove ValidationResult generic
- [ ] Fix state property access

### climbing.ts
- [ ] Remove ValidationResult generic
- [ ] Fix state property access

### listening.ts
- [ ] Remove ValidationResult generic
- [ ] Fix state property access

### waiting.ts
- [ ] Remove ValidationResult generic
- [ ] Fix state property access

## Phase 5: Special Cases

### trace.ts
- [ ] Fix validate() to return ValidationResult instead of boolean

### context.ts
- [ ] Add missing validate property to action definition

## Phase 6: Verification

### Build Verification
- [ ] Run `pnpm --filter '@sharpee/stdlib' build`
- [ ] Confirm 0 TypeScript errors
- [ ] Check for any warnings

### Test Verification
- [ ] Run `pnpm --filter '@sharpee/stdlib' test`
- [ ] Verify all tests pass
- [ ] Check golden tests specifically

### Pattern Verification
- [ ] Spot check 5 random actions for correct pattern
- [ ] Verify behavior delegation is used where appropriate
- [ ] Confirm no business logic in actions that should be in behaviors

## Progress Tracking

### Completed ✅
- drinking.ts - ValidationResult format fixed
- eating.ts - ValidationResult format fixed
- Phase 1: All Entity → IFEntity imports fixed (8 files)
- Phase 2: All generic types removed (18+ files)
- Phase 3: Core ValidationResult format fixes done (isValid → valid)

### In Progress 🔧
- Phase 3: Mostly complete, some error format cleanup remaining
- Phase 4: Ready to start additional format fixes

### Blocked 🚫
- (Any files with issues...)

## Common Patterns Reference

### Correct ValidationResult
```typescript
// ✅ CORRECT
return { valid: false, error: 'no_item' };
return { valid: false, error: 'not_open', params: { item: item.name } };
return { valid: true };

// ❌ WRONG
return { isValid: false, error: { messageId: 'no_item' } };
```

### Correct Action Declaration
```typescript
// ✅ CORRECT
export const myAction: Action = {

// ❌ WRONG
export const myAction: Action<MyState> = {
```

### Correct Import
```typescript
// ✅ CORRECT
import { IFEntity } from '@sharpee/world-model';

// ❌ WRONG
import { Entity } from '@sharpee/world-model';
```

### Correct Error Handling in Execute
```typescript
// ✅ CORRECT
if (!validation.valid) {
  return [context.event('action.error', {
    actionId: context.action.id,
    messageId: validation.error,
    params: validation.params
  })];
}

// ❌ WRONG
if (!validation.isValid) {
  return [context.event('action.error', {
    ...validation.error
  })];
}
```