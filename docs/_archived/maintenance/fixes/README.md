# Fix Action Tests Tools

This folder contains scripts to fix the systematic event structure issues in the migrated stdlib actions.

## The Problem

All 44 migrated actions have incorrect event structures:
- Using `if.event.error` instead of `action.error`
- Using `if.event.success` instead of `action.success`
- Missing `actionId` field in events
- Missing `reason` field in error events
- Using `messageParams` instead of `params`

## Available Scripts

### 1. `fix-events-simple.js` (Recommended - No Dependencies)
Pure JavaScript solution using regex. No TypeScript compilation needed.

```bash
# From this directory
node fix-events-simple.js

# Or from sharpee root
node fix-action-tests/fix-events-simple.js
```

### 2. `fix-event-structure.ts` (TypeScript AST version)
More sophisticated solution using TypeScript's AST. Requires TypeScript and dependencies.

```bash
# First install dependencies
cd ../packages/stdlib
pnpm add -D typescript @types/node glob @types/glob

# Then run from this directory
npx ts-node --project tsconfig.fix.json fix-event-structure.ts
```

### 3. `setup-and-fix.js` (Automated setup + TypeScript fix)
Installs dependencies and runs the TypeScript version.

```bash
node setup-and-fix.js
```

## What Gets Fixed

### Before:
```typescript
return [context.event('if.event.error', {
  messageId: 'no_target'
})];
```

### After:
```typescript
return [context.event('action.error', {
  actionId: this.id,
  messageId: 'no_target',
  reason: 'no_target'
})];
```

## After Running

1. **Review changes**:
   ```bash
   git diff ../packages/stdlib/src/actions/standard/
   ```

2. **Run tests**:
   ```bash
   cd ../packages/stdlib
   pnpm test
   ```

3. **Commit if tests pass**:
   ```bash
   git add ../packages/stdlib/src/actions/standard/
   git commit -m "fix: correct event structure in all stdlib actions"
   ```

## Files in this Directory

- `fix-events-simple.js` - Simple JavaScript regex-based fixer (recommended)
- `fix-event-structure.ts` - TypeScript AST-based fixer (more sophisticated)
- `fix-events.js` - Wrapper script that checks prerequisites
- `setup-and-fix.js` - Automated setup and run script
- `tsconfig.fix.json` - TypeScript configuration for the AST fixer
- `fix-event-structure.README.md` - Detailed documentation

## Quick Start

Just run:
```bash
node fix-events-simple.js
```

This will fix all 44 action files automatically.