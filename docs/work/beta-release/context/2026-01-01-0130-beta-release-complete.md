# Work Summary: Beta Release 0.9.0-beta.1 Complete

**Date:** 2026-01-01 01:30
**Branch:** `beta-release`

## Completed

### Phase 1: IFID Core (ADR-074)

- Created `packages/core/src/ifid/` with:
  - `generateIfid()` - UUID v4 format, uppercase
  - `validateIfid()` - Treaty of Babel compliance (8-63 chars, A-Z/0-9/-)
  - `normalizeIfid()` - Uppercase conversion with validation
- Created `packages/core/src/metadata/` with:
  - `StoryMetadata` interface
  - `SharpeeConfig` interface for package.json
- Added CLI commands in `packages/sharpee/src/cli/`:
  - `sharpee ifid generate`
  - `sharpee ifid validate <ifid>`
- Generated IFID for Dungeo: `621168D1-6D5C-449F-83D5-841D03A1BF78`
- 15 unit tests for IFID functions

### Phase 2: Package Preparation (ADR-081)

Updated all 8 publishable packages with:
- Version: `0.9.0-beta.1`
- ESM/CJS exports configuration
- Repository, homepage, bugs fields
- `publishConfig: { "access": "public" }`
- `engines: { "node": ">=18.0.0" }`
- Standardized to `workspace:*` dependencies

Packages updated:
- @sharpee/core
- @sharpee/if-domain
- @sharpee/world-model
- @sharpee/engine
- @sharpee/stdlib
- @sharpee/parser-en-us
- @sharpee/lang-en-us
- @sharpee/sharpee

### Build Infrastructure

Created `scripts/build-release.sh`:
- Builds packages in dependency order
- `--bump patch|minor|major` - Version increment
- `--beta` / `--release` - Beta suffix control
- `--publish` - Full release workflow (commit, tag, push, GitHub release)
- Uses `docs/releases/{version}.md` for release notes

### Bug Fixes

- Fixed `text-service-template`: `SemanticEvent` → `ISemanticEvent`, removed `.template` accessors
- Added `@types/node` to `@sharpee/sharpee` devDependencies

### GitHub Release

- Created release `v0.9.0-beta.1` (prerelease)
- Detailed release notes at `docs/releases/0.9.0-beta.1.md`
- https://github.com/ChicagoDave/sharpee/releases/tag/v0.9.0-beta.1

## Files Created/Modified

| File | Change |
|------|--------|
| `packages/core/src/ifid/*` | New - IFID utilities |
| `packages/core/src/metadata/*` | New - Story metadata types |
| `packages/core/tests/ifid/*` | New - IFID tests |
| `packages/sharpee/src/cli/*` | New - CLI commands |
| `packages/*/package.json` | Updated - Beta version, npm fields |
| `packages/text-service-template/src/index.ts` | Fixed - Type errors |
| `scripts/build-release.sh` | New - Release automation |
| `docs/releases/0.9.0-beta.1.md` | New - Release notes |

## Next Steps

1. Verify build works: `./scripts/build-release.sh`
2. Test CLI: `npx @sharpee/sharpee ifid generate`
3. Phase 3: npm publishing setup (when ready)
4. Documentation improvements
