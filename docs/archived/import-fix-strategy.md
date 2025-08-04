# Fixing StdLib Imports - Aligned with Refactor Plan

## The Correct Understanding

Per the refactor plan (2025-06-15):
- **Core SHOULD contain**: Basic types (Entity, Relationship, etc.)
- **StdLib SHOULD import**: from Core only interfaces
- **Issue**: StdLib is importing directly from various Core modules instead of through a controlled boundary

## The Real Problem

1. StdLib has direct imports from `@sharpee/core` scattered throughout
2. No controlled import boundary exists
3. This makes it hard to manage what StdLib depends on from Core

## Correct Solution (Aligned with Plan)

### 1. Fix core-imports.ts
The `core-imports.ts` file should be the ONLY place where StdLib imports from Core. Update it to:
- Import all needed Core interfaces
- Re-export them for StdLib use
- Document what each import is for

### 2. Update All StdLib Files
- Replace all `from '@sharpee/core'` with `from '../core-imports'` (or appropriate relative path)
- No file except `core-imports.ts` should import from `@sharpee/core`

### 3. What to Import from Core
Per the refactor plan, StdLib should import:
- ✅ Entity, EntityId, Relationship types (basic data types)
- ✅ Event system interfaces
- ✅ Channel system interfaces
- ✅ Extension interfaces
- ✅ Rule system interfaces (if needed)
- ✅ Basic LanguageProvider interface

### 4. What NOT to Import
- ❌ Parser (now in StdLib)
- ❌ World model (now in StdLib)
- ❌ IF-specific anything (shouldn't exist in Core)

## Implementation Steps

1. **Update core-imports.ts** to import all needed Core types
2. **Run migration script** to update all imports
3. **Fix any missing imports** by adding to core-imports.ts
4. **Verify no direct Core imports** remain in StdLib

This approach:
- ✅ Follows the refactor plan
- ✅ Maintains Core as generic data store with basic types
- ✅ Creates controlled import boundary
- ✅ Makes dependencies explicit and manageable
