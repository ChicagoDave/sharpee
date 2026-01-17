# Version Command Implementation

**Date**: 2026-01-17
**Duration**: ~1.5 hours
**Branch**: dungeo

## Overview

Implemented a VERSION command that displays story version, engine version, and build timestamp. This provides players and developers with essential version information for bug reporting and compatibility tracking.

## Completed Work

### 1. New stdlib Action: VERSION

Created a new standard action following the four-phase pattern at `packages/stdlib/src/actions/standard/version/`:

**Files Created:**
- `version.ts` - Main action implementation
  - Retrieves version info from world metadata (`world.getMeta('version')`)
  - Emits `if.event.version_displayed` with version data
  - Single-phase action (no validation/execution needed, just reporting)

- `version-events.ts` - Event type definitions
  ```typescript
  export interface VersionDisplayedEvent extends GameEvent {
    type: 'if.event.version_displayed';
    data: {
      storyVersion?: string;
      storyBuildDate?: string;
      engineVersion?: string;
    };
  }
  ```

- `index.ts` - Module exports

**Integration:**
- Updated `packages/stdlib/src/actions/standard/index.ts` to export version action
- Grammar pattern already existed in `parser-en-us` (no changes needed)

### 2. Language Layer Messages

Created `packages/lang-en-us/src/actions/version.ts`:
- Message handler for `if.event.version_displayed`
- Formats output as:
  ```
  DUNGEO v1.0.0-alpha.2
  Sharpee Engine v0.9.3-beta.1
  Built: 2026-01-17T06:21:35Z
  ```
- Gracefully handles missing version info (displays "Unknown" for missing fields)

### 3. Auto-Generated Story Version File

Created `stories/dungeo/src/version.ts` (auto-generated, not committed):
```typescript
export const STORY_VERSION = '1.0.0-alpha.2';
export const BUILD_DATE = '2026-01-17T06:21:35Z';
export const ENGINE_VERSION = '0.9.3-beta.1';
export const VERSION_INFO = {
  storyVersion: STORY_VERSION,
  storyBuildDate: BUILD_DATE,
  engineVersion: ENGINE_VERSION
};
```

**Key Design Decision:** This file is auto-generated during bundling and NOT committed to git. It's listed in `.gitignore` because:
- Version numbers auto-increment with each bundle
- Build timestamps are dynamic
- Avoids merge conflicts
- Ensures version info is always current with the bundle

### 4. Automated Version Management

Enhanced `scripts/bundle-sharpee.sh` with version automation:

**Auto-Increment Logic:**
- Reads current version from `stories/dungeo/package.json`
- Increments based on version type:
  - **Prerelease** (e.g., `1.0.0-alpha.2`): Increments prerelease number → `1.0.0-alpha.3`
  - **Stable** (e.g., `1.0.0`): Increments patch number → `1.0.1`
- Updates `package.json` with new version
- Generates `version.ts` with new version and ISO 8601 timestamp

**Build Process Integration:**
1. Read current version from package.json
2. Auto-increment version
3. Update package.json
4. Generate version.ts
5. Build story
6. Bundle into sharpee.js

**Engine Version:** Pulled from `packages/engine/package.json` (currently `0.9.3-beta.1`)

### 5. Story Integration

Updated `stories/dungeo/src/index.ts`:
- Import `VERSION_INFO` from `./version`
- Set world metadata in `initializeWorld()`:
  ```typescript
  world.setMeta('version', VERSION_INFO);
  ```
- Version action reads this metadata to display info

### 6. Testing

Created `stories/dungeo/tests/transcripts/version.transcript`:
```
> version
DUNGEO v1.0.0-alpha.2
Sharpee Engine v0.9.3-beta.1
Built: 2026-01-17T06:21:35Z
```

**Test Status:** Passing

## Files Modified

**New Files (Platform):**
- `packages/stdlib/src/actions/standard/version/version.ts`
- `packages/stdlib/src/actions/standard/version/version-events.ts`
- `packages/stdlib/src/actions/standard/version/index.ts`
- `packages/lang-en-us/src/actions/version.ts`

**Modified Files (Platform):**
- `packages/stdlib/src/actions/standard/index.ts` - Added version export
- `packages/lang-en-us/src/actions/index.ts` - Added version message handler

**Modified Files (Build):**
- `scripts/bundle-sharpee.sh` - Auto-increment and version.ts generation

**New Files (Story, Auto-Generated):**
- `stories/dungeo/src/version.ts` - NOT committed (in .gitignore)

**Modified Files (Story):**
- `stories/dungeo/src/index.ts` - Import and wire VERSION_INFO
- `stories/dungeo/package.json` - Version auto-incremented by bundle script

**Test Files:**
- `stories/dungeo/tests/transcripts/version.transcript`

## Architectural Notes

### Version Information Flow

```
bundle-sharpee.sh
    ↓ (auto-increment)
package.json version
    ↓ (generate)
version.ts (VERSION_INFO)
    ↓ (import)
story index.ts
    ↓ (set meta)
world.getMeta('version')
    ↓ (read)
version action
    ↓ (emit event)
lang-en-us message handler
    ↓ (format)
Player sees output
```

### Design Rationale

**Why auto-increment on bundle?**
- Each bundle is a distinct playable build
- Players testing builds need version numbers for bug reports
- Manual version bumps are error-prone and forgotten
- Prerelease numbers (alpha.N) track iteration count

**Why generate version.ts instead of reading package.json at runtime?**
- Keeps story code decoupled from npm package structure
- version.ts is type-safe and importable
- Avoids runtime file I/O to read package.json
- Consistent pattern for other generated files (future: build metadata)

**Why not commit version.ts?**
- Prevents merge conflicts from auto-incremented versions
- Build artifacts shouldn't be in source control
- Version is always fresh with current bundle

### Semantic Versioning Strategy

Story follows SemVer with prerelease tags:
- **Major**: Breaking changes to save format or core mechanics
- **Minor**: New content (rooms, puzzles, NPCs)
- **Patch/Prerelease**: Bug fixes, tweaks, playtesting iterations

During active development (Dungeo implementation):
- Use `1.0.0-alpha.N` for pre-completion builds
- Auto-increment N with each bundle
- Switch to `1.0.0-beta.N` when feature-complete (all 191 rooms)
- Ship `1.0.0` when fully playtested

## Testing Notes

**Manual Testing:**
```bash
./scripts/bundle-sharpee.sh
node dist/sharpee.js --play
> version
```

**Transcript Testing:**
```bash
./scripts/fast-transcript-test.sh stories/dungeo/tests/transcripts/version.transcript
```

**Verification:**
- Version number increments with each bundle
- Build timestamp reflects bundle time (ISO 8601 UTC)
- Engine version matches engine package.json
- Missing version info displays gracefully

## Next Steps

### Immediate
- Consider adding VERSION to help text (list of available commands)
- Test with release builds (non-prerelease versions)

### Future Enhancements
- Add git commit SHA to version info (for development builds)
- Track compiler/bundler versions
- Add `--version` CLI flag to sharpee.js
- Consider build type (dev/prod) in version display

## References

- **ADR-051**: Action Four-Phase Pattern
- **Semantic Versioning**: https://semver.org/
- **ISO 8601 Timestamps**: Used for build dates (UTC)

---

**Status**: Complete and tested
**Committed**: Platform changes (stdlib, lang-en-us)
**Not Committed**: Auto-generated version.ts (by design)
