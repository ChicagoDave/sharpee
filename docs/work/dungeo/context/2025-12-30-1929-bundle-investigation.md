# Work Summary: Bundle Investigation & Fast Testing

**Date**: 2025-12-30
**Branch**: dungeo

## Bundle Success!

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Sharpee load | 81,000ms | 142ms | **578x faster** |
| Total test run | ~82s | 145ms | **565x faster** |
| Bundle size | - | 1.2MB | Single file |

## What We Built

### 1. Bundle Entry (`scripts/bundle-entry.js`)
JavaScript aggregator that combines all Sharpee packages:
```javascript
module.exports = {
  ...require('@sharpee/core'),
  ...require('@sharpee/if-domain'),
  ...require('@sharpee/world-model'),
  ...require('@sharpee/stdlib'),
  ...require('@sharpee/engine'),
  ...require('@sharpee/parser-en-us'),
  ...require('@sharpee/lang-en-us'),
  ...require('@sharpee/event-processor'),
  ...require('@sharpee/text-services'),
  ...require('@sharpee/if-services')
};
```

This avoids TypeScript export conflicts that prevent `@sharpee/sharpee` from using wildcard exports.

### 2. Bundle Script (`scripts/bundle-sharpee.sh`)
Builds core Sharpee packages and bundles them with esbuild:
```bash
./scripts/bundle-sharpee.sh
# Output: dist/sharpee.js (1.2MB), dist/sharpee.js.map, dist/sharpee.d.ts
```

Excludes non-essential packages:
- `@sharpee/story-*` (game content)
- `@sharpee/platform-*` (UI layers)
- `@sharpee/text-service-browser` (browser-only)
- `@sharpee/text-service-template` (template)

### 3. Bundle Preload Script (`scripts/use-bundle.js`)
Node.js require hook that intercepts `@sharpee/*` imports:
```bash
node -r ./scripts/use-bundle.js your-script.js
# All @sharpee/* requires now return the bundle
```

### 4. Fast Transcript Testing (`scripts/fast-transcript-test.sh`)
Convenience wrapper for transcript testing with the bundle:
```bash
./scripts/fast-transcript-test.sh stories/dungeo --all
./scripts/fast-transcript-test.sh stories/dungeo path/to/test.transcript
```

## Test Results

```
Total: 350 tests in 19 transcripts
339 passed, 5 failed, 6 expected failures
Duration: 145ms
```

The 5 failures are pre-existing dungeo issues (bat room exits), not bundle-related.

## Technical Details

### Why 81 Seconds?
Node.js barrel exports (`export * from './foo'`) trigger synchronous file I/O at require time. Each package has dozens of barrel re-exports, causing cascading loads.

### Why 142ms?
esbuild inlines all dependencies into a single file. One file read instead of hundreds.

### Why JS Entry Instead of TS?
The `@sharpee/sharpee` package can't use `export *` wildcards due to TypeScript export name conflicts across packages (e.g., `Direction`, `Parser`, `IGameEvent` exist in multiple packages). The JS entry uses object spread which handles conflicts by last-write-wins.

### Build Fixes Applied
1. Added `"composite": true` to `packages/core/tsconfig.json`
2. Added `"composite": true` to `packages/if-domain/tsconfig.json`
3. Excluded broken/unnecessary packages from bundle build

## Files Created/Modified

1. `scripts/bundle-entry.js` - JS aggregator for all packages
2. `scripts/bundle-sharpee.sh` - Updated to use bundle-entry.js
3. `scripts/use-bundle.js` - Require hook for bundle usage
4. `scripts/fast-transcript-test.sh` - Fast transcript testing
5. `packages/core/tsconfig.json` - Added composite: true
6. `packages/if-domain/tsconfig.json` - Added composite: true
7. `dist/sharpee.js` - The bundle (1.2MB)
8. `dist/sharpee.js.map` - Source map (1.8MB)
9. `dist/sharpee.d.ts` - Type declarations

## Usage

```bash
# Create/update bundle
./scripts/bundle-sharpee.sh

# Run transcript tests with bundle (fast)
./scripts/fast-transcript-test.sh stories/dungeo --all

# Run any script with bundle
node -r ./scripts/use-bundle.js your-script.js
```

## Dungeo Progress

- 149/190 rooms (78%)
- 510/616 treasure points (83%)
- Royal Puzzle Phase 2 partially done
- ~40 endgame rooms remaining
- All remaining work is pure game dev (no Sharpee changes needed)

## Next Steps

1. Continue dungeo implementation with fast dev loop
2. Consider adding bundle to CI for release builds
3. Fix bat room exit issues identified in transcript tests
