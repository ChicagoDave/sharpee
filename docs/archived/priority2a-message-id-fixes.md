# Priority 2A: Message ID Mismatch Fixes

## Common Patterns to Fix

### 1. StringContaining vs Exact IDs
```typescript
// ❌ Test expects:
messageId: expect.stringContaining('accepted')

// ✅ Action emits:
messageId: 'if.action.answering.answered_yes'

// Fix: Update test to:
messageId: 'if.action.answering.answered_yes'
```

### 2. Affected Tests
- answering-golden.test.ts (5 failures)
- attacking-golden.test.ts (2 failures)
- going-golden.test.ts (3 failures)
- pulling-golden.test.ts (1 failure)
- pushing-golden.test.ts (1 failure)
- turning-golden.test.ts (2 failures)
- talking-golden.test.ts (2 failures)
- closing-golden.test.ts (2 failures)
- opening-golden.test.ts (2 failures)
- asking-golden.test.ts (1 failure)
- searching-golden.test.ts (1 failure)
- looking-golden.test.ts (2 failures)
- putting-golden.test.ts (1 failure)
- smelling-golden.test.ts (1 failure)
- using-golden.test.ts (2 failures)

### 3. Fix Strategy
Create a script to update all StringContaining patterns to exact message IDs.
