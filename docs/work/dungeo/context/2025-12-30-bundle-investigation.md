# Work Summary: Bundle Investigation & Build Scripts

**Date**: 2025-12-30
**Branch**: dungeo

## What We Discovered

### Load Time Issue (Not a Hang)
The transcript testing "timeout" was **not** a circular dependency - it's just slow barrel export loading:

| Package | Load Time |
|---------|-----------|
| core | 2s |
| world-model | 14s |
| stdlib | 30s (!) |
| engine | 2s |
| dungeo | 33s |
| **Total** | **81s** |

This is caused by Node.js resolving all barrel exports at require() time. Each `export * from './foo'` triggers synchronous file I/O.

### Sharpee is Feature-Complete for Dungeo
Reviewed implementation plan - **no more Sharpee changes needed**:
- Stories can inject custom actions via `story.getCustomActions()` ✅
- Dungeo already uses this for: GDT, SAY, RING, WALK_THROUGH, PUSH_WALL, PUZZLE_MOVE
- Remaining verbs (WAVE, DIG, INFLATE, PRAY) can be story-specific actions

### Build Script Created
Created `scripts/build-dungeo.sh` with three modes:
- No args: Just builds dungeo (fast, assumes Sharpee built)
- `--full`: Rebuilds all Sharpee packages in dependency order
- `--clean`: Cleans and rebuilds everything

Fixed dependency order:
1. core → 2. if-domain → 3. world-model → 4. lang-en-us → 5. if-services → 6. parser-en-us → 7. event-processor → 8. text-services → 9. stdlib → 10. engine → 11. transcript-tester → 12. dungeo

### Fixed Build Error
`packages/stdlib/src/events/helpers.ts` was importing non-existent `EntityEventHandler` from world-model. Fixed by defining the type locally.

## Next Session: Bundle Sharpee

User wants to dog-food a compiled Sharpee bundle while finishing Dungeo. This would:
1. Dramatically reduce load times (goal: <500ms vs 81s)
2. Test the release distribution before publishing
3. Make development loop faster

### Started But Not Finished
Created `scripts/bundle-sharpee.sh` that uses esbuild to bundle, but:
- esbuild not installed (`npm install -g esbuild` or add as dev dep)
- Need to test if bundle actually works
- Need to wire dungeo to use bundle instead of workspace packages

### Bundle Approach (ADR-077)
```bash
npx esbuild packages/engine/dist/index.js \
  --bundle \
  --platform=node \
  --target=node18 \
  --outfile=dist/sharpee.js \
  --external:readline \
  --format=cjs
```

Then dungeo would import from `../../dist/sharpee.js` instead of `@sharpee/*` packages.

## Files Changed This Session

1. `packages/stdlib/src/events/helpers.ts` - Fixed EntityEventHandler import
2. `scripts/build-dungeo.sh` - Created build script with --full/--clean options
3. `scripts/bundle-sharpee.sh` - Created (incomplete) bundle script

## Dungeo Progress

- 149/190 rooms (78%)
- 510/616 treasure points (83%)
- Royal Puzzle Phase 2 partially done (movement mechanics exist but need wiring)
- ~40 endgame rooms remaining
- All remaining work is pure game dev (no Sharpee changes needed)

## Commands for Next Session

```bash
# Install esbuild
pnpm add -D -w esbuild

# Run bundle script
./scripts/bundle-sharpee.sh

# Or manually test bundle
npx esbuild packages/engine/dist/index.js --bundle --platform=node --outfile=dist/sharpee.js --external:readline

# Test bundle load time
node -e "const s=Date.now(); require('./dist/sharpee.js'); console.log(Date.now()-s+'ms')"
```
