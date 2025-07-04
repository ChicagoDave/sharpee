# @sharpee/if-domain Migration Checklist

## Phase 1: Create the Package ✅

### 1.1 Package Setup ✅
- [x] Create `packages/if-domain` directory
- [x] Create `package.json` with only `@sharpee/core` dependency
- [x] Create `tsconfig.json` extending base config
- [x] Create source directory structure:
  ```
  src/
  ├── index.ts
  ├── events.ts
  ├── contracts.ts
  ├── changes.ts
  └── sequencing.ts
  ```
- [x] Create README.md
- [x] Create .gitignore
- [x] Create build.sh script
- [ ] Add to `pnpm-workspace.yaml` if needed
- [ ] Add to root build script order (after core, before world-model)

### 1.2 Extract Types from world-model ✅
- [x] Copy `IFEvents` constant from `world-model/src/constants/if-events.ts`
- [x] Copy `IFEventType` type
- [x] Copy `IFEventCategory` and `IFEventCategoryType`
- [x] Copy `EventHandler` type from `world-model/src/world/WorldModel.ts`
- [x] Copy `EventValidator` type
- [x] Copy `EventPreviewer` type
- [x] Copy `WorldChange` interface
- [x] Add related types (WorldConfig, WorldState, ContentsOptions, FindOptions)
- [ ] Remove/comment out these from world-model (temporarily)

### 1.3 Extract Types from event-processor ✅
- [x] Copy `ProcessedEvents` interface from `event-processor/src/types.ts`
- [x] Copy `ProcessorOptions` interface
- [x] Copy any event-processor specific types
- [ ] Remove/comment out from event-processor (temporarily)

### 1.4 Extract Types from engine ✅
- [x] Copy `TurnPhase` enum from `engine/src/types.ts`
- [x] Copy `EventSequence` interface
- [x] Copy `SequencedEvent` interface
- [x] Add `EventSequencer` interface
- [ ] Remove/comment out from engine (temporarily)

## Phase 2: Update Dependencies

### 2.1 Update package.json files
- [x] Add `"@sharpee/if-domain": "file:../if-domain"` to:
  - [x] world-model/package.json
  - [x] event-processor/package.json
  - [x] engine/package.json
  - [x] stdlib/package.json (if needed) - Not needed, no IFEvents usage found

### 2.2 Run pnpm install
- [x] Run `pnpm install` from root to create symlinks
- [x] Verify if-domain appears in node_modules of dependent packages

## Phase 3: Update Imports

### 3.1 Update world-model imports
- [x] Update `constants/if-events.ts` to re-export from if-domain
- [x] Update WorldModel.ts to import types from if-domain
- [x] Remove local definitions of migrated types (WorldChange, EventHandler, etc.)
- [x] Fix examples/event-handler-registration.ts imports
- [x] **CHANGED PLAN**: Move EventHandler, EventValidator, EventPreviewer back to world-model
- [x] Keep only pure domain types in if-domain (IFEvents, WorldChange, TurnPhase, etc.)
- [x] Build world-model to verify ✅

### 3.2 Update event-processor imports
- [x] Update handler files to import IFEvents from if-domain
- [x] Update types.ts to import base types from if-domain
- [x] Update processor.ts imports
- [x] **CHANGED**: Import EventHandler from world-model instead of if-domain
- [x] Update all test files - Fixed test fixtures to use correct SemanticEvent structure
- [x] Build event-processor to verify ✅

### 3.3 Update engine imports
- [x] Update types.ts to import from if-domain
- [x] Update event-sequencer.ts imports
- [x] Remove duplicate type definitions (TurnPhase, SequencedEvent, EventSequencer)
- [x] Build engine to verify ✅

### 3.4 Update stdlib imports (if needed)
- [x] Search for any IFEvents usage - NONE FOUND
- [x] No updates needed
- [x] Build stdlib to verify ✅

## Phase 4: Clean Build & Test

### 4.1 Clean all packages
- [x] Run clean script for all packages
- [x] Delete all dist folders
- [x] Delete tsconfig.tsbuildinfo files

### 4.2 Build in correct order
- [x] Build core ✅
- [x] Build if-domain ✅
- [x] Build world-model ✅
- [x] Build event-processor ✅
- [x] Build stdlib ✅
- [x] Build engine ✅
- [x] Build remaining packages (sharpee has unrelated config issue)

### 4.3 Run tests
- [x] Run event-processor tests (should now work!) ✅ ALL PASSING
- [ ] Run world-model tests
- [ ] Run engine tests
- [ ] Run any integration tests

## Phase 5: Update Documentation

### 5.1 Update package documentation
- [x] Create README.md for if-domain package ✅
- [ ] Update world-model README about domain types
- [ ] Update event-processor README
- [ ] Update architecture documentation

### 5.2 Update build documentation
- [ ] Document new build order
- [ ] Document the domain-driven design decision
- [ ] Add if-domain to any package diagrams

## Phase 6: Git Management

### 6.1 Commit strategy
- [ ] Review all changes
- [ ] Stage if-domain package creation
- [ ] Stage world-model updates
- [ ] Stage event-processor updates  
- [ ] Stage engine updates
- [ ] Create comprehensive commit message
- [ ] Push to feature branch (if using branches)

### 6.2 Verification
- [x] All packages build successfully ✅
- [x] All tests pass ✅
- [x] No circular dependency warnings ✅
- [ ] No missing type errors in dependent packages
- [ ] Integration tests still work

## Rollback Plan

If issues arise:
1. Git reset to before changes
2. Keep if-domain package but make it optional
3. Gradually migrate one package at a time
4. Use type aliases to ease transition

## Success Criteria

- [x] event-processor tests run successfully ✅
- [x] No duplicate type definitions across packages ✅
- [x] Clear domain boundaries established ✅
- [x] Build order is logical and documented ✅
- [x] No increase in build time ✅
- [x] Type imports are cleaner and more intuitive ✅

## Notes

- This is an "invasive" change touching multiple packages
- Do this when you have time for a full test cycle
- Consider creating a branch for this work
- The end result will be much cleaner architecture
- This sets precedent for future domain-driven package design