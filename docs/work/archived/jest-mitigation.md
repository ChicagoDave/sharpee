# Jest Testing Remnants Mitigation Plan

## Overview
This document identifies remaining Jest testing infrastructure in the Sharpee codebase and provides a mitigation plan for complete removal.

## Current State Analysis

### 1. Active Jest Dependencies in package.json Files
The following packages still have Jest listed as a devDependency:

| Package | Path | Version |
|---------|------|---------|
| react client | `/packages/clients/react/package.json` | ^29.7.0 |
| electron client | `/packages/clients/electron/package.json` | ^29.7.0 |
| client-core | `/packages/client-core/package.json` | ^29.7.0 |
| conversation extension | `/packages/extensions/conversation/package.json` | ^29.7.0 |
| core extensions | `/packages/core/src/extensions/package.json` | ^29.5.0 |
| forge | `/packages/forge/package.json` | ^29.7.0 |
| docs/actions | `/docs/actions/package.json` | ^29.7.0 |

### 2. Jest Configuration Files

#### Active Configuration
- `/packages/stdlib/jest.config.ci.js` - Still present and references a base jest.config

#### Archived Configurations (.old files)
- `/packages/event-processor/jest.config.js.old`
- `/packages/core/jest.config.js.old`
- `/packages/lang-en-us/jest.config.js.old`
- `/packages/engine/jest.config.js.old`
- `/packages/parser-en-us/jest.config.js.old`
- `/packages/stdlib/jest.config.js.old`

### 3. Test Files Using Jest APIs
- `/packages/text-service-template/tests/platform-events.test.ts` - Uses `jest.fn()` for mocking

### 4. Other Jest References
- Multiple documentation files and archived scripts reference Jest
- Chat history files contain Jest-related discussions
- Various shell scripts in `/scripts/` and `/docs/maintenance/fixes/scripts/` reference Jest

## Migration Strategy

### Phase 1: Remove Active Jest Dependencies
**Priority: HIGH**

1. **Update package.json files** - Remove Jest dependencies from:
   - `/packages/clients/react/package.json`
   - `/packages/clients/electron/package.json`
   - `/packages/client-core/package.json`
   - `/packages/extensions/conversation/package.json`
   - `/packages/core/src/extensions/package.json`
   - `/packages/forge/package.json`
   - `/docs/actions/package.json`

2. **Verify no test scripts depend on Jest**
   - Check "scripts" section in each package.json
   - Update any test scripts that reference Jest

### Phase 2: Migrate Active Test Files
**Priority: HIGH**

1. **Migrate `/packages/text-service-template/tests/platform-events.test.ts`**
   - Replace `jest.fn()` with Vitest's `vi.fn()`
   - Update import statements
   - Verify test still passes with Vitest

### Phase 3: Clean Up Configuration Files
**Priority: MEDIUM**

1. **Remove active Jest configuration**
   - Delete `/packages/stdlib/jest.config.ci.js`

2. **Archive or remove .old files**
   - Consider deleting all `jest.config.js.old` files if no longer needed for reference

### Phase 4: Documentation Cleanup
**Priority: LOW**

1. **Update documentation**
   - Search and replace Jest references with Vitest in active documentation
   - Ensure all testing documentation reflects current Vitest setup

2. **Archive historical references**
   - Keep chat history and archived documentation as-is for historical context

## Verification Steps

After each phase:
1. Run `pnpm install` to ensure no dependency issues
2. Run `pnpm test` in affected packages to verify tests still work
3. Check for any remaining Jest imports: `grep -r "from ['\\"]jest" --include="*.ts" --include="*.tsx" --include="*.js"`
4. Verify no Jest dependencies remain: `grep -r "\\"jest\\":" --include="package.json"`

## Risk Assessment

- **Low Risk**: Most packages don't appear to have active tests using Jest
- **Medium Risk**: Client packages may have hidden Jest dependencies in their build processes
- **Mitigation**: Test each package individually after removing Jest dependencies

## Timeline Estimate

- Phase 1: 1-2 hours (dependency removal and verification)
- Phase 2: 1 hour (single file migration)
- Phase 3: 30 minutes (configuration cleanup)
- Phase 4: 1-2 hours (documentation updates)

**Total estimated time**: 3.5-5.5 hours

## Success Criteria

- [ ] No Jest dependencies in any package.json
- [ ] No active Jest configuration files
- [ ] All tests pass using Vitest
- [ ] No Jest API usage in test files
- [ ] Documentation reflects Vitest as the testing framework