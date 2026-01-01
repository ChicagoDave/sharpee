# Work Summary: Monorepo Refactor to Proper Setup

**Date:** 2026-01-01 03:30
**Branch:** `beta-release`

## Goal

Convert Sharpee monorepo from `file:../` dependencies to proper `workspace:*` with TypeScript project references.

## Completed

### 1. Converted all `file:../` to `workspace:*`

Packages updated:
- `event-processor`
- `if-services`
- `text-service-template`
- `forge` (also had `^0.1.0` versions)

### 2. Added TypeScript Project References

Updated tsconfig.json in all packages with `references` arrays pointing to their dependencies:

| Package | References |
|---------|------------|
| core | (none - leaf) |
| if-domain | core |
| world-model | core, if-domain |
| if-services | core, if-domain, world-model |
| event-processor | core, if-domain, world-model |
| text-services | core, if-domain, if-services, world-model |
| text-service-template | core, if-domain, if-services |
| text-service-browser | core, if-domain, if-services |
| lang-en-us | core, if-domain |
| parser-en-us | core, if-domain, world-model |
| stdlib | core, if-domain, if-services, lang-en-us, parser-en-us, world-model |
| engine | core, event-processor, if-domain, if-services, lang-en-us, parser-en-us, stdlib, text-services, world-model |
| sharpee | core, engine, event-processor, lang-en-us, parser-en-us, stdlib, text-services, world-model |
| transcript-tester | core, engine, lang-en-us, parser-en-us, stdlib, text-services, world-model |
| forge | core, stdlib |
| client-core | core |

### 3. Updated Base tsconfig

Added to `tsconfig.base.json`:
- `"composite": true`
- `"declarationMap": true`

### 4. Regenerated Lockfile

Ran `pnpm install` to update `pnpm-lock.yaml` for workspace:* dependencies.

### 5. Removed prepublishOnly Scripts

Removed from all packages (was breaking CI install).

## Issues Encountered

### Turbo Cache Problem

Turbo's cache was returning "build succeeded" without the actual dist/ output files. Need to clear turbo cache before builds.

### Build Order

Even with `workspace:*` and project references, builds were failing because:
1. Turbo was running builds in parallel despite `concurrency: 1`
2. Stale `.tsbuildinfo` files were preventing rebuilds

### Next Steps to Complete

1. Clear all caches: `rm -rf .turbo packages/*/.turbo packages/*/dist packages/*/*.tsbuildinfo`
2. Test build: `pnpm build --filter './packages/**'`
3. If turbo still misbehaves, may need to use explicit build order in CI
4. Push and test CI workflow

## Files Modified

- `packages/*/package.json` - workspace:* deps, removed prepublishOnly
- `packages/*/tsconfig.json` - added references
- `tsconfig.base.json` - added composite, declarationMap
- `pnpm-lock.yaml` - regenerated
- `.github/workflows/beta-release.yml` - removed --ignore-scripts

## CI Workflow Status

The workflow now:
1. Uses `pnpm install` (no --ignore-scripts)
2. Builds packages in explicit dependency order
3. Has npm publish job with NPM_TOKEN secret

NPM_TOKEN secret has been added to GitHub repo.
