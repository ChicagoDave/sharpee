# Fix HELP and ABOUT Commands (ISSUE-042a, ISSUE-042b)

## Status: COMPLETE ✓

Implemented 2026-02-01/02. Build fix verified 2026-02-02.

## Problem

1. **ABOUT** has no grammar pattern — parser rejects it in all clients
2. **HELP** text is rendered by BrowserClient via custom interception but text service produces nothing — so Zifmia gets empty output
3. **ABOUT** text is also BrowserClient-only — same Zifmia problem
4. **Story metadata** is stored via `(world as any).storyConfig` / `(world as any).versionInfo` — untyped, violates architecture

## Root Causes

- BrowserClient bypasses the text service for HELP and ABOUT by intercepting events directly. The text service has no handlers for these events, so Zifmia (which only sees text service output) gets nothing.
- Story metadata is bolted onto `world` via `as any` casts in 4 production files. There's no typed way for actions to access story info.

## Solution Implemented

### StoryInfoTrait (world-model)

New trait for typed, serializable story metadata:

```typescript
interface StoryInfoTrait extends ITrait {
  type: 'storyInfo';
  engineVersion?: string;
  clientVersion?: string;
  buildDate?: string;
  storyTitle: string;
  author: string;
  year: number;
  portedBy?: string;
  credits?: Array<{ role: string; name: string }>;
}
```

Registered in trait system (TraitType enum, TRAIT_CATEGORIES, TRAIT_IMPLEMENTATIONS). Single entity per world created during story initialization.

### Text Service Handlers

- HELP handler renders PR-IF "How to Play" content with all supported commands
- ABOUT handler renders story metadata from StoryInfoTrait

### Consumer Updates

All consumers read from StoryInfoTrait with legacy fallback:

```typescript
const storyInfoEntity = world.findEntitiesWithTrait('storyInfo')[0];
const trait = storyInfoEntity ? world.getTrait(storyInfoEntity.id, 'storyInfo') : null;
const fallback = (world as any).versionInfo || {};
```

### Build Fix (2026-02-02)

Story compilation failed because `dist-npm/` had stale types (missing StoryInfoTrait). Added temp fix in `build.sh`: after each package build, `rsync -a --delete dist/ dist-npm/` syncs fresh types for downstream resolution. Long-term fix is the NSF build tool.

## Files Modified

| File | Change |
|------|--------|
| `packages/world-model/src/traits/story-info/storyInfoTrait.ts` | New trait definition |
| `packages/world-model/src/traits/story-info/index.ts` | Barrel export |
| `packages/world-model/src/traits/trait-types.ts` | Added STORY_INFO enum |
| `packages/world-model/src/traits/implementations.ts` | Registered trait |
| `packages/world-model/src/traits/index.ts` | Barrel export |
| `packages/world-model/src/index.ts` | Public export |
| `packages/engine/src/game-engine.ts` | Read/enrich StoryInfoTrait |
| `packages/stdlib/src/actions/standard/about/about.ts` | Read StoryInfoTrait, pass full params |
| `packages/stdlib/src/actions/standard/about/about-events.ts` | Added version fields to event data |
| `packages/stdlib/src/actions/standard/version/version.ts` | Read StoryInfoTrait with fallback |
| `packages/text-service/src/handlers/about.ts` | Handler for about_displayed |
| `packages/text-service/src/handlers/help.ts` | Handler for help_displayed |
| `packages/text-service/src/text-service.ts` | Register new handlers |
| `packages/parser-en-us/src/grammar.ts` | about/info/credits patterns |
| `packages/platform-browser/src/BrowserClient.ts` | Set clientVersion on trait, removed interception |
| `packages/platforms/browser-en-us/src/browser-platform.ts` | Set clientVersion on trait |
| `stories/dungeo/src/index.ts` | Create StoryInfoTrait entity |
| `stories/dungeo/tests/transcripts/help-about.transcript` | Updated test expectations |
| `build.sh` | Temp fix: rsync dist/ → dist-npm/ after package builds |

## Verification

- `./build.sh -s dungeo` — builds cleanly
- `node dist/cli/sharpee.js --test stories/dungeo/tests/transcripts/help-about.transcript` — 4/4 pass
- HELP shows full "How to Play" text
- ABOUT/INFO/CREDITS show title, authors, version, "Ported by" credit
