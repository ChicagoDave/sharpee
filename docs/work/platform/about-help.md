# Fix HELP and ABOUT Commands (ISSUE-042a, ISSUE-042b)

## Problem

1. **ABOUT** has no grammar pattern — parser rejects it in all clients
2. **HELP** text is rendered by BrowserClient via custom interception but text service produces nothing — so Zifmia gets empty output
3. **ABOUT** text is also BrowserClient-only — same Zifmia problem
4. **Story metadata** is stored via `(world as any).storyConfig` / `(world as any).versionInfo` — untyped, violates architecture

## Root Causes

- BrowserClient bypasses the text service for HELP and ABOUT by intercepting events directly. The text service has no handlers for these events, so Zifmia (which only sees text service output) gets nothing.
- Story metadata is bolted onto `world` via `as any` casts in 4 production files. There's no typed way for actions to access story info.

## Design Decisions

1. **Move text rendering into the text service** so all clients get output. Remove special-case interception from BrowserClient.
2. **Introduce `StoryInfoTrait`** on a system entity in the world model. This provides typed, serializable access to story metadata without `as any`. Actions read it via `findByTrait`. The entity has no location and is never visible in the game world.

## Changes

### 1. Add StoryInfoTrait to world-model
**File**: `packages/world-model/src/traits/StoryInfoTrait.ts` (new)

```typescript
export interface StoryInfoTrait {
  type: 'if.trait.story_info';
  title: string;
  author: string;
  version: string;
  description?: string;
  buildDate?: string;
  engineVersion?: string;
  clientVersion?: string;
  portedBy?: string;
}
```

Export from world-model's trait barrel.

### 2. Story init — create system entity with StoryInfoTrait
**File**: `stories/dungeo/src/index.ts`

Replace:
```typescript
(world as any).versionInfo = VERSION_INFO;
(world as any).storyConfig = config;
```

With:
```typescript
const storyInfo = world.createEntity('story-info', 'system');
storyInfo.addTrait(StoryInfoTrait, {
  title: config.title,
  author: config.author,
  version: config.version,
  description: config.description,
  buildDate: config.buildDate,
  portedBy: config.portedBy,
});
```

No location set — entity exists in the world tree but is never spatially connected.

### 3. Engine startup — enrich StoryInfoTrait with engine/client versions
**File**: `packages/engine/src/game-engine.ts`

At startup (before emitting `game.started`), find the StoryInfoTrait entity and set `engineVersion` and `clientVersion` on it. This replaces `(world as any).versionInfo` reads.

Also update `game.started` event construction to read from the trait instead of `as any` casts.

### 4. About action — read StoryInfoTrait
**File**: `packages/stdlib/src/actions/standard/about/about.ts`

Replace `(world as any).storyConfig` with:
```typescript
const storyInfoEntities = world.findByTrait('if.trait.story_info');
const trait = storyInfoEntities[0]?.getTrait('if.trait.story_info');
```

Pass all trait fields as params in the `if.event.about_displayed` event.

### 5. Version action — read StoryInfoTrait
**File**: `packages/stdlib/src/actions/standard/version/version.ts`

Same pattern — replace all `(world as any).storyConfig`, `(world as any).versionInfo`, `(world as any).clientVersion` with trait reads.

### 6. Add text service handler for ABOUT
**File**: `packages/text-service/src/handlers/about.ts` (new)

Handler for `if.event.about_displayed`. Passes event params through to language provider's `game.started.banner` template — same template as the startup banner. All params are now available because the about action reads the full StoryInfoTrait.

### 7. Add text service handler for HELP
**File**: `packages/text-service/src/handlers/help.ts` (new)

Handler for `if.event.help_displayed`. Renders PR-IF "How to Play Interactive Fiction" card content adapted to Sharpee's supported commands:

- Movement (compass directions, UP/DOWN, IN/OUT, ENTER/EXIT)
- Looking (LOOK, EXAMINE)
- Objects (TAKE, DROP, OPEN, CLOSE, PUT IN/ON, LOCK/UNLOCK)
- People (TALK TO, ASK ABOUT, TELL ABOUT, GIVE, SHOW)
- Other (INVENTORY, WAIT, AGAIN, SAVE, RESTORE, SCORE, UNDO, QUIT)
- Abbreviations (N/S/E/W, L, X, I, Z, G)
- Guidance: "When in doubt, EXAMINE everything."

### 8. Register handlers in text service router
**File**: `packages/text-service/src/text-service.ts`

Add `if.event.help_displayed` and `if.event.about_displayed` cases to `routeToHandler()`.

### 9. Add ABOUT grammar patterns
**File**: `packages/parser-en-us/src/grammar.ts`

Add `about`, `info`, `credits` → `if.action.about` (already done).

### 10. Remove BrowserClient special-case interception
**File**: `packages/platform-browser/src/BrowserClient.ts`

- Remove event interception for `if.action.about` and `if.event.help_displayed`
- Remove `displayHelp()`, `displayAbout()`, `getDefaultAboutText()` methods
- Change menu `onHelp`/`onAbout` handlers to submit commands via `engine.executeTurn('help')` / `engine.executeTurn('about')` (already done)
- Remove `getHelpText`/`getAboutText` from `BrowserClientCallbacks` type (already done)

### 11. Clean up remaining `as any` casts
**File**: `packages/platforms/browser-en-us/src/browser-platform.ts`

Replace `(world as any).clientVersion = VERSION_INFO.version` — engine now sets clientVersion on StoryInfoTrait at startup.

## Files Modified

| File | Change |
|------|--------|
| `packages/world-model/src/traits/StoryInfoTrait.ts` | New trait definition |
| `packages/world-model/src/traits/index.ts` | Export StoryInfoTrait |
| `packages/engine/src/game-engine.ts` | Read/enrich StoryInfoTrait, remove `as any` |
| `packages/stdlib/src/actions/standard/about/about.ts` | Read StoryInfoTrait, pass full params |
| `packages/stdlib/src/actions/standard/version/version.ts` | Read StoryInfoTrait, remove `as any` |
| `packages/text-service/src/handlers/about.ts` | New handler for about_displayed |
| `packages/text-service/src/handlers/help.ts` | New handler for help_displayed |
| `packages/text-service/src/text-service.ts` | Register new handlers |
| `packages/parser-en-us/src/grammar.ts` | Add about/info/credits patterns (done) |
| `packages/platform-browser/src/BrowserClient.ts` | Remove interception, fix menu handlers (done) |
| `packages/platform-browser/src/types.ts` | Remove callback types (done) |
| `packages/platforms/browser-en-us/src/browser-platform.ts` | Remove `as any` clientVersion |
| `stories/dungeo/src/index.ts` | Create StoryInfoTrait entity, remove `as any` |

## What This Does NOT Change

- Event types (`if.event.help_displayed`, `if.event.about_displayed`) — unchanged
- Zifmia client code — no changes needed, it already renders text:output
- Topic-specific help (`help movement`) — keep existing, just improve general help text
- Transcript tester `(world as any).toJSON()` / `loadJSON()` — separate concern, different issue

## Verification

1. `./build.sh -s dungeo` — platform + story build
2. `node dist/sharpee.js --play` — type `help`, `about`, `info`, `credits`, `version`
3. Verify banner params resolve (no literal `{engineVersion}` etc.)
4. `./build.sh -s dungeo -c zifmia` — verify in Zifmia client
5. Run existing transcript tests — no regressions
6. `grep -r "(world as any)" packages/` — confirm storyConfig/versionInfo/clientVersion casts are gone
