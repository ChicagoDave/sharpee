# Core Package Test Suite Updates

Date: 2025-01-15

## Changes Made

### Removed Language/Text Service Tests
Since language functionality has been moved to runtime-loaded packages (`if-domain` and `lang-en-us`), the following test files have been removed from the core package:

- `tests/language/language-requirements.test.ts` → `.removed`
- `tests/language/registry.test.ts` → `.removed`
- `tests/language/default-provider.test.ts.removed` (already removed)

### Verified Core Package Exports
The core package (`src/index.ts`) now only exports:
- Core data structures (`types`)
- Event system (`events`)
- Extension system (`extensions/types`)
- Execution system (specific exports from `execution/types`)
- Rules system (`rules`)
- Debug infrastructure (`debug`)

No language or text service exports remain.

### Test Suite Status
- All remaining tests are valid and don't reference removed functionality
- Integration tests (`tests/integration/event-rule-integration.test.ts`) focus on event and rule processing
- No import statements reference language or text services
- Test configuration (`jest.config.js`) and setup (`tests/setup.ts`) remain unchanged

## Architecture Alignment
This change aligns with the architecture where:
1. Core provides foundational functionality (events, rules, extensions)
2. Language support is loaded at runtime via language packages
3. Text formatting happens in the runtime layer, not in core
4. Games choose their language support by installing appropriate packages

## Next Steps
The core package test suite is now ready for build and test verification.
