# World Model Package Extraction Checklist

## Phase 1: Package Setup
- [x] Create `/packages/world-model/` directory
- [x] Create `package.json` with proper dependencies
- [x] Create `tsconfig.json` extending base config
- [x] Create source directory structure:
  - [x] `/src/entities/`
  - [x] `/src/traits/`
  - [x] `/src/behaviors/`
  - [x] `/src/services/`
  - [x] `/src/types/`
  - [x] `/src/index.ts`

## Phase 2: Move Core Files
- [x] Move `if-entity.ts` → `/src/entities/if-entity.ts`
- [x] Move `entity-store.ts` → `/src/entities/entity-store.ts`
- [x] Move entire `/traits/` folder → `/src/traits/`
- [x] Move base behavior class → `/src/behaviors/`
- [ ] Move relevant services from `/services/` → `/src/services/`
- [ ] Move relevant types from `/types/` → `/src/types/`

## Phase 3: Update Dependencies in world-model
- [x] Update all internal imports to use relative paths
- [x] Import from `@sharpee/core` instead of `../../core-imports`
- [x] Remove any imports from stdlib
- [x] Create proper index.ts exports

## Phase 4: Update stdlib Dependencies
- [x] Update `package.json` to depend on `@sharpee/world-model`
- [x] Update tsconfig.json references
- [x] Create world-model-imports.ts helper
- [ ] Update all imports from `./world-model/` to `@sharpee/world-model`
- [x] Add MOVED_TO_PACKAGE.md in old location
- [ ] Remove the `/world-model/` directory from stdlib

## Phase 5: Fix Build Errors
- [ ] Run build in world-model package
- [ ] Fix any missing dependencies
- [ ] Run build in stdlib package
- [ ] Fix any circular dependency issues
- [ ] Run build in forge package
- [ ] Update any broken imports there

## Phase 6: Update Other Packages
- [ ] Check `lang-en-us` for any world-model imports
- [ ] Check `client-core` for any world-model imports
- [ ] Check test files for import updates
- [ ] Update any example/demo code

## Phase 7: Cleanup and Verification
- [ ] Ensure all tests pass
- [ ] Update lerna.json if needed
- [ ] Update root package.json scripts
- [ ] Verify no circular dependencies with `madge` or similar
- [ ] Update documentation/README files
- [ ] Remove any .deleted or .old files

## Key Files to Track

### Files that will move:
- `/stdlib/src/world-model/traits/` (entire folder)
- `/stdlib/src/world-model/behaviors/` (entire folder)
- `/stdlib/src/world-model/if-entities/` (check contents)
- `/stdlib/src/world-model/services/` (some files)
- `/stdlib/src/world-model/types/` (some files)

### Files that stay in stdlib:
- Actions (all)
- Parser (all)
- Text services
- Game flow/execution
- Physics/containment rules

### Import patterns to update:
- `from '../world-model/traits'` → `from '@sharpee/world-model'`
- `from './world-model/entities'` → `from '@sharpee/world-model'`
- `from '../../world-model/types'` → `from '@sharpee/world-model'`

## Success Criteria
- [ ] world-model package builds independently
- [ ] stdlib package builds with world-model dependency
- [ ] All existing tests pass
- [ ] No circular dependencies between packages
- [ ] Clean, logical separation of concerns
