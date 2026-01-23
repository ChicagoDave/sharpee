# Session Summary: 20260123 - ext-testing

## Status: Complete

## Goals
- Implement Phase 0 of ADR-109/ADR-110: Quick $save/$restore for transcript tester
- Think through extension architecture before proceeding with Phase 1+

## Completed

### Phase 0: $save/$restore Implementation

**Added $save and $restore directives to transcript-tester:**

1. **types.ts** - Added 'save' | 'restore' to DirectiveType, added `saveName` field to Directive interface, added `savesDirectory` to RunnerOptions

2. **parser.ts** - Added `parseDollarDirective()` function to parse `$save <name>` and `$restore <name>` lines

3. **runner.ts** - Added handlers for save/restore directives in `handleDirective()`:
   - `$save <name>` - Serializes world state via `world.toJSON()` and writes to `saves/<name>.json`
   - `$restore <name>` - Reads from save file and restores via `world.loadJSON()`

4. **bundle-entry.js** - Added CLI functionality to the bundle:
   - `node dist/sharpee.js --test <transcript>` now works
   - `node dist/sharpee.js --play` for interactive mode
   - Supports `--chain`, `--verbose`, `--stop-on-failure` flags

**Test Results:**
- New save-restore-basic.transcript: 7/7 tests pass
- Existing unit transcripts: 1267 pass, 18 fail (pre-existing failures)
- Walkthrough chain (wt-01 through wt-03): 82/82 tests pass

### Extension Architecture Design

Discussed and documented extension ecosystem architecture:

**ADR-111: Extension Ecosystem**
- Three extension types: Platform, Story, Public
- Platform extensions live in `packages/extensions/`
- Public extensions use npm for distribution, sharpee.net for discovery
- Namespace conventions: `sharpee.ext.*`, `ext.*`, `{storyId}.*`
- Capability declarations for security
- Verification tiers: Official, Reviewed, Verified, Unverified
- CLI commands: `sharpee init-extension`, `sharpee register`, `sharpee verify`
- Critical security note: Sharpee is native JS, not VM-sandboxed like Inform/TADS/Hugo

**ADR-112: Client Security Model**
- Browser client: Safe (browser sandbox)
- CLI/Electron: Dangerous (full system access)
- Proposed solution: Centralized build server on sharpee.net/AWS
- Stories for CLI/Electron must be built through sharpee.net
- Code signing with HSM-protected keys
- Client verifies signature before running
- Similar model to Apple App Store / Google Play

### Existing Extensions Clarified

- `packages/extensions/blood-magic/` → should move to `stories/reflections/`
- `packages/extensions/conversation/` → stays as platform extension (placeholder)
- `packages/extensions/testing/` → new platform extension (Phase 1+)

## Key Decisions

### CLI in Bundle
Added CLI functionality directly to the bundle (`dist/sharpee.js`) rather than requiring separate transcript-tester invocation. This makes the documented usage `node dist/sharpee.js --test` actually work.

### Extension Location Convention
- Platform extensions: `packages/extensions/{name}/`
- Story extensions: `stories/{story}/src/extensions/{name}/`
- Public extensions: npm packages

### Security Model
- Browser: Self-host, browser sandbox protects
- CLI/Electron: Must go through sharpee.net build server with code signing

## Open Items

### Immediate Next Steps
- Phase 1: Create `packages/extensions/testing/` package structure
- Move `blood-magic` extension to `stories/reflections/`

### Future Work
- ADR-111: Build out extension ecosystem infrastructure
- ADR-112: Implement centralized build server on AWS
- Walkthrough rewrites (wt-04 through wt-07) - can now use $save/$restore

## Files Modified

**packages/transcript-tester/src/types.ts**
- Added 'save' | 'restore' directive types
- Added `saveName` to Directive interface
- Added `savesDirectory` to RunnerOptions

**packages/transcript-tester/src/parser.ts**
- Added `parseDollarDirective()` function
- Added parsing for `$save` and `$restore` lines

**packages/transcript-tester/src/runner.ts**
- Added fs/path imports
- Added save/restore handlers in `handleDirective()`

**packages/transcript-tester/src/fast-cli.ts**
- Added savesDirectory option to runTranscript call

**scripts/bundle-entry.js**
- Complete rewrite to add CLI functionality
- Bundle now serves as both library and CLI

**stories/dungeo/tests/transcripts/save-restore-basic.transcript** (new)
- Test transcript for $save/$restore functionality

**docs/architecture/adrs/adr-111-extension-ecosystem.md** (new)
- Extension ecosystem design: distribution, namespaces, verification

**docs/architecture/adrs/adr-112-client-security-model.md** (new)
- Client security model: browser vs CLI vs Electron risks
- Centralized build server proposal

## Notes
- Session started: 2026-01-23 14:56
- Bundle size increased from 1.6M to 2.0M (includes transcript-tester)
- Load time still fast: ~170ms
- Saves location: `stories/{story}/saves/<name>.json`
