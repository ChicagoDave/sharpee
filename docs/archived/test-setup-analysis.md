# Test Setup Issue Analysis

## Root Cause
The tests are failing because of a mismatch between how action patterns are defined and how they're being looked up.

### The Problem Chain:

1. **Pattern Definition Issue**
   - Action patterns in lang-en-us are defined with placeholders: `'take [something]'`, `'pick up [something]'`
   - The registry's `findByPattern()` expects exact matches: `'take'`, `'pick up'`
   - The `getActionPatterns()` method returns patterns WITH placeholders
   - The registry stores patterns as-is, so it's storing `'take [something]'` but looking for `'take'`

2. **Language Provider Setup**
   - The registry test correctly uses the EnglishLanguageProvider instance
   - But the pattern matching fails because of the placeholder mismatch

3. **Command Validator Issues**
   - The command validator tests create a mock language provider that returns patterns WITHOUT placeholders
   - This is why they expected it to work, but the real provider doesn't work the same way

## Solutions

### Option 1: Fix the Registry Pattern Processing
Modify `StandardActionRegistry.updatePatternMappingsForAction()` to strip placeholders:

```typescript
private updatePatternMappingsForAction(action: Action): void {
  if (!this.languageProvider) return;
  
  const patterns = this.languageProvider.getActionPatterns(action.id);
  if (patterns) {
    for (const pattern of patterns) {
      // Strip placeholders like [something], [direction], etc.
      const normalizedPattern = pattern
        .replace(/\s*\[.*?\]\s*/g, ' ') // Remove placeholders
        .trim()
        .toLowerCase();
      
      // Handle both the full pattern and individual verbs
      // "pick up [something]" -> store both "pick up" and "pick"
      const actions = this.actionsByPattern.get(normalizedPattern) || [];
      if (!actions.includes(action)) {
        actions.push(action);
        actions.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        this.actionsByPattern.set(normalizedPattern, actions);
      }
      
      // Also store just the first word as a pattern
      const firstWord = normalizedPattern.split(' ')[0];
      if (firstWord !== normalizedPattern) {
        const firstWordActions = this.actionsByPattern.get(firstWord) || [];
        if (!firstWordActions.includes(action)) {
          firstWordActions.push(action);
          firstWordActions.sort((a, b) => (b.priority || 0) - (a.priority || 0));
          this.actionsByPattern.set(firstWord, firstWordActions);
        }
      }
    }
  }
}
```

### Option 2: Add a New Method to Language Provider
Add a method that returns clean patterns without placeholders:

```typescript
getActionVerbs(actionId: string): string[] | undefined {
  const patterns = this.getActionPatterns(actionId);
  if (!patterns) return undefined;
  
  return patterns.map(pattern => 
    pattern.replace(/\s*\[.*?\]\s*/g, ' ').trim().toLowerCase()
  );
}
```

### Option 3: Fix the Pattern Definitions
Change the pattern definitions to not include placeholders, or have separate verb lists.

## Other Test Issues

1. **Test Context Creation** (`again.test.ts`)
   - `createTestContext` is not being exported/imported correctly
   - Need to check test-utils exports

2. **Shared Data Access** (`quitting.test.ts`)
   - The quitting action expects shared data from `context.getSharedData()`
   - Test context needs to provide this mock data

3. **Player Location Setup**
   - Some tests create players without setting their location
   - Need proper world setup in test utilities

4. **Event Data Format**
   - Tests expect entity IDs but actions are sending entity names
   - Need to standardize what goes in event data

## Recommended Fix Order

1. Fix the pattern matching issue (Option 1 seems best)
2. Fix test-utils exports for createTestContext
3. Add shared data mocking to test contexts
4. Standardize event data formats
5. Fix individual test setup issues
