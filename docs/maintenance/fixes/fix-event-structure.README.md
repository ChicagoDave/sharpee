# Event Structure Fix Script

This script fixes the systematic event structure issues in all 44 migrated stdlib actions.

## What it Fixes

1. **Event Type Issues**:
   - `if.event.error` → `action.error`
   - `if.event.success` → `action.success`

2. **Missing Fields**:
   - Adds `actionId: this.id` to all error/success events
   - Adds `reason` field to error events (matching the messageId value)

3. **Parameter Naming**:
   - Renames `messageParams` → `params`

## Prerequisites

```bash
# Install TypeScript and ts-node globally (if not already installed)
npm install -g typescript ts-node

# Or use locally
cd packages/stdlib
pnpm add -D typescript ts-node @types/node @types/glob glob
```

## Usage

### Option 1: Run the JavaScript wrapper (Recommended)
```bash
# From sharpee root directory
node fix-events.js
```

### Option 2: Run the TypeScript file directly
```bash
# From sharpee root directory
npx ts-node fix-event-structure.ts
```

### Option 3: Make it executable
```bash
chmod +x fix-events.js
./fix-events.js
```

## What the Script Does

1. Finds all action files in `packages/stdlib/src/actions/standard/`
2. Skips event definition files (`*-events.ts`) and index files
3. Parses each file using TypeScript's AST
4. Finds all `context.event()` calls
5. Transforms them according to the fix patterns
6. Writes the fixed files back

## Example Transformations

### Error Event
```typescript
// Before
return [context.event('if.event.error', {
  messageId: 'no_target'
})];

// After
return [context.event('action.error', {
  actionId: this.id,
  messageId: 'no_target',
  reason: 'no_target'
})];
```

### Success Event
```typescript
// Before
events.push(context.event('if.event.success', {
  messageId: 'taken',
  messageParams: { item: 'book' }
}));

// After
events.push(context.event('action.success', {
  actionId: this.id,
  messageId: 'taken',
  params: { item: 'book' }
}));
```

## Safety Features

- Uses TypeScript AST for safe transformations
- Preserves code formatting and structure
- Only modifies event calls that need fixing
- Skips files that don't need changes
- Reports what was changed

## After Running

1. Review changes:
   ```bash
   git diff packages/stdlib/src/actions/standard/
   ```

2. Run tests to verify:
   ```bash
   cd packages/stdlib
   pnpm test
   ```

3. If tests pass, commit:
   ```bash
   git add packages/stdlib/src/actions/standard/
   git commit -m "fix: correct event structure in all stdlib actions"
   ```

## Troubleshooting

### "ts-node not found"
Install it globally or use npx:
```bash
npm install -g ts-node typescript
```

### "Cannot find module 'typescript'"
Install dependencies:
```bash
cd packages/stdlib
pnpm add -D typescript @types/node
```

### Script reports no changes
The files may already be fixed, or the patterns don't match. Check manually.

## Manual Verification

After running, spot-check a few files to ensure correctness:

```bash
# Check an action file
cat packages/stdlib/src/actions/standard/taking/taking.ts | grep -A5 "context.event"
```

The output should show:
- Event types are `action.error` or `action.success`
- All events have `actionId: this.id`
- Error events have `reason` field
- Parameters use `params` not `messageParams`