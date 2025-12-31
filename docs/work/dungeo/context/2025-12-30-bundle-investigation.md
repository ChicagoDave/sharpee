# Work Summary: Bundle Investigation & Build Scripts

**Date**: 2025-12-30
**Branch**: dungeo

## Bundle Success! 🎉

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Load time | 81,000ms | 140ms | **578x faster** |
| Bundle size | - | 1MB | Single file |

## What We Built

### 1. Bundle Script (`scripts/bundle-sharpee.sh`)
Builds core Sharpee packages and bundles them with esbuild:
```bash
./scripts/bundle-sharpee.sh
# Output: dist/sharpee.js (1MB), dist/sharpee.js.map, dist/sharpee.d.ts
```

Excludes non-essential packages:
- `@sharpee/story-*` (game content)
- `@sharpee/platform-*` (UI layers)
- `@sharpee/text-service-browser` (browser-only)
- `@sharpee/text-service-template` (template)

### 2. Bundle Preload Script (`scripts/use-bundle.js`)
Node.js require hook that intercepts `@sharpee/*` imports:
```bash
node -r ./scripts/use-bundle.js your-script.js
# All @sharpee/* requires now return the bundle
```

### 3. Fast Transcript Testing (`scripts/fast-transcript-test.sh`)
Convenience wrapper for transcript testing with the bundle:
```bash
./scripts/fast-transcript-test.sh stories/dungeo --all
./scripts/fast-transcript-test.sh stories/dungeo path/to/test.transcript
```

## Technical Details

### Why 81 Seconds?
Node.js barrel exports (`export * from './foo'`) trigger synchronous file I/O at require time. Each package has dozens of barrel re-exports, causing cascading loads.

### Why 140ms?
esbuild inlines all dependencies into a single file. One file read instead of hundreds.

### Build Fixes Applied
1. Added `"composite": true` to `packages/core/tsconfig.json`
2. Added `"composite": true` to `packages/if-domain/tsconfig.json`
3. Excluded broken/unnecessary packages from bundle build

## Files Created/Modified

1. `scripts/bundle-sharpee.sh` - Bundle creation script
2. `scripts/use-bundle.js` - Require hook for bundle usage
3. `scripts/fast-transcript-test.sh` - Fast transcript testing
4. `packages/core/tsconfig.json` - Added composite: true
5. `packages/if-domain/tsconfig.json` - Added composite: true
6. `dist/sharpee.js` - The bundle (1MB)
7. `dist/sharpee.js.map` - Source map (1.6MB)
8. `dist/sharpee.d.ts` - Type declarations

## Dungeo Progress

- 149/190 rooms (78%)
- 510/616 treasure points (83%)
- Royal Puzzle Phase 2 partially done
- ~40 endgame rooms remaining
- All remaining work is pure game dev (no Sharpee changes needed)

## Next Steps

1. Test fast-transcript-test.sh with dungeo
2. Continue dungeo implementation with fast dev loop
3. Consider adding bundle to CI for release builds
