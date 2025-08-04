# Root Cause Analysis - Test Failures

## The Core Issue

The test failures stem from a fundamental misunderstanding of the command processing flow:

### Expected Flow:
1. **Parser** produces `ParsedCommand` with:
   - `action: 'take'` (the verb from user input)
   - No knowledge of action IDs

2. **CommandValidator** validates the parsed command:
   - Looks up action handler: `registry.findByPattern('take')`
   - Resolves entities
   - Creates `ValidatedCommand` with:
     - `actionId: 'if.action.taking'` (the resolved action ID)

3. **Action** executes with the validated command

### The Problem:

The `StandardActionRegistry` is storing patterns WITH placeholders:
- Pattern defined: `'take [something]'`
- Pattern stored: `'take [something]'` 
- Pattern searched: `'take'`
- Result: No match!

## Why This Matters

1. **Registry Pattern Matching IS Required**
   - The CommandValidator needs to resolve verb → action ID
   - This happens via `registry.findByPattern(verb)`
   - Without this, commands can't be validated

2. **Pattern Storage Needs Processing**
   - Patterns like `'take [something]'` need to be indexed as `'take'`
   - Multi-word patterns like `'pick up [something]'` need to be indexed as `'pick up'`
   - The placeholders are for documentation, not matching

## Test Issues

### 1. Registry Tests (Legitimate Failures)
The registry needs to strip placeholders when building the pattern index.

### 2. Command Validator Tests (Test Setup Issues)
- Mock language provider returns patterns without placeholders
- This masks the real issue

### 3. Test Utils Issues
- `createCommand` is creating ValidatedCommand incorrectly
- It sets `actionId` to the verb instead of the full action ID
- This bypasses the normal validation flow

### 4. Other Test Failures
- `again.test.ts`: Import issue with createTestContext
- `quitting.test.ts`: Missing shared data in context
- Various actions: Event data format mismatches

## Solution

### Fix the Registry Pattern Processing

```typescript
private updatePatternMappingsForAction(action: Action): void {
  if (!this.languageProvider) return;
  
  const patterns = this.languageProvider.getActionPatterns(action.id);
  if (patterns) {
    for (const pattern of patterns) {
      // Strip placeholders: "take [something]" → "take"
      const cleanPattern = pattern
        .replace(/\s*\[.*?\]\s*/g, '') // Remove [placeholders]
        .trim()
        .toLowerCase();
      
      if (cleanPattern) {
        const actions = this.actionsByPattern.get(cleanPattern) || [];
        if (!actions.includes(action)) {
          actions.push(action);
          actions.sort((a, b) => (b.priority || 0) - (a.priority || 0));
          this.actionsByPattern.set(cleanPattern, actions);
        }
      }
    }
  }
}
```

This preserves the pattern definitions with placeholders (good for documentation/help) while allowing verb lookup to work correctly.
