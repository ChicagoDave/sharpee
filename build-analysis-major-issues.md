# Build Analysis - Major Issues Found

## Root Cause
The stdlib package contains a lot of legacy code that references old structures and paths that no longer exist after the world-model extraction.

## Key Problems

### 1. Module Resolution
- TypeScript can't find `@sharpee/world-model` in ext-daemon and stdlib
- This is likely because packages aren't built in the correct order

### 2. Conflicting Imports in StdLib
- StdLib has its own `world-model` directory that conflicts with `@sharpee/world-model` package
- Many imports use relative paths to this local directory instead of the package
- Example: `import { IFEntity } from '../world-model/traits/if-entity';`

### 3. Missing Exports
- Many types that stdlib expects don't exist in world-model
- Examples: `WorldAwareBehavior`, `isWorldAwareBehavior`, `TRAIT_IMPLEMENTATIONS`

### 4. API Changes
- `entity.getTrait()` doesn't exist (should be `entity.get()`)
- `ScopeService` missing methods like `canSee`, `canReach`
- Many event types missing from `IFEvents`

### 5. Type Incompatibilities
- `Entity` vs `IFEntity` confusion
- `ActionContext` vs `WorldModelContext` incompatibilities
- Grammar pattern type mismatches

## Recommended Solution

### Option 1: Quick Fix (Not Recommended)
Try to patch all the import paths and missing types. This would be error-prone and time-consuming.

### Option 2: Clean Rebuild (Recommended)
1. **Remove legacy code** from stdlib's world-model directory
2. **Update all imports** to use `@sharpee/world-model`
3. **Implement missing services** in stdlib that orchestrate world-model behaviors
4. **Fix API usage** to match the new world-model interface

### Option 3: Incremental Fix
1. **Disable stdlib temporarily** to get other packages building
2. **Fix ext-daemon** first (simpler, fewer dependencies)
3. **Gradually update stdlib** action by action

## Immediate Actions

1. **Fix ext-daemon** - Just needs proper imports
2. **Create stdlib services** - New implementations using world-model
3. **Update actions** - One at a time to use new patterns
4. **Remove legacy code** - Clean out the old world-model directory in stdlib

## Build Order Should Be
1. core
2. world-model  
3. client-core
4. lang-en-us
5. ext-daemon, extension-conversation
6. stdlib (after fixes)
7. forge
8. story-cloak-of-darkness
