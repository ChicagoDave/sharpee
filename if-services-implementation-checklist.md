# if-services Package Implementation Checklist

## 1. Create Package Structure
- [x] Create `/packages/if-services` directory
- [x] Create `package.json` with dependencies:
  - @sharpee/core
  - @sharpee/if-domain
  - @sharpee/world-model
- [x] Create `tsconfig.json` extending base config
- [x] Create `src/index.ts` for exports
- [x] Create README.md explaining package purpose

## 2. Move TextService Interface
- [x] Move `text-service.ts` from `if-domain/src/` to `if-services/src/`
- [x] Update imports in text-service.ts to use proper paths
- [x] Remove text-service export from `if-domain/src/index.ts`
- [x] Add text-service export to `if-services/src/index.ts`

## 3. Update Dependencies
- [x] Update `if-domain/package.json` to remove world-model dependency (if not needed elsewhere) - NOT NEEDED: if-domain never had world-model as dependency
- [x] Update `text-service-template/package.json` to depend on if-services instead of if-domain for TextService
- [x] Update `engine/package.json` to add if-services dependency
- [x] Update any other packages that import TextService

## 4. Update Imports
- [x] Search for `from '@sharpee/if-domain'` imports of TextService across all packages
- [x] Update these imports to `from '@sharpee/if-services'`
  - Updated text-service-template/src/index.ts
  - Updated engine/src/game-engine.ts
  - Updated engine/src/story.ts
- [x] Verify no broken imports remain

## 5. Build and Test
- [x] Run `pnpm install` from root to link new package
- [x] Build if-services package
- [x] Build all dependent packages in order:
  - if-domain (should build with no world-model dep)
  - if-services
  - text-service-template
  - engine
- [ ] Run tests for affected packages

## 6. Documentation
- [x] Update architecture diagrams if any exist - NONE FOUND
- [ ] Add if-services to main README package list
- [x] Document service interface pattern for future services - README created

## 7. Verification
- [x] Verify if-domain has no dependency on world-model (unless needed for other interfaces) - CONFIRMED: no world-model in package.json
- [x] Verify TextService implementations still work - imports updated
- [x] Verify engine can orchestrate text services properly - imports updated
- [ ] Run integration tests
